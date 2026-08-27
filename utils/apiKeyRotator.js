// Loads N API keys for a provider and rotates away from any key that comes back
// rate-limited / out of quota, retrying the same call on the next key.
//
// Supported .env conventions (mix and match freely):
//   GROQ_API_KEY=...                 single/first key
//   GROQ_API_KEY_2=... .. _50        numbered additional keys
//   GROQ_API_KEYS=key1,key2,key3     comma or newline separated list

const MAX_NUMBERED_KEYS = 50;
const COOLDOWN_MS = 60_000; // give an exhausted key a minute before it's tried again

const RATE_LIMIT_PATTERN = /rate.?limit|quota|429|too many requests|insufficient[_ ]?(credits?|quota)|limit exceeded|credits? exhausted/i;

export function isRateLimitError(err) {
    const status = err?.status ?? err?.statusCode ?? err?.response?.status;
    if (status === 429) return true;
    const message = `${err?.message || ""} ${err?.error?.message || ""}`;
    return RATE_LIMIT_PATTERN.test(message);
}

function loadKeys(prefix) {
    const keys = [];
    const seen = new Set();
    const add = (raw) => {
        const key = raw?.trim();
        if (key && !seen.has(key)) {
            seen.add(key);
            keys.push(key);
        }
    };

    add(process.env[`${prefix}_API_KEY`]);

    const list = process.env[`${prefix}_API_KEYS`];
    if (list) list.split(/[,\n]/).forEach(add);

    for (let i = 1; i <= MAX_NUMBERED_KEYS; i++) {
        add(process.env[`${prefix}_API_KEY_${i}`]);
    }

    return keys;
}

export class KeyRotator {
    constructor(name, prefix) {
        this.name = name;
        this.keys = loadKeys(prefix);
        if (this.keys.length === 0) {
            throw new Error(
                `No API keys configured for ${name}. Set ${prefix}_API_KEY, ${prefix}_API_KEY_2..N, or ${prefix}_API_KEYS (comma-separated).`
            );
        }
        this.index = 0;
        this.cooldownUntil = new Array(this.keys.length).fill(0);
        console.log(`[${name}] loaded ${this.keys.length} API key(s) for rotation`);
    }

    // For long-lived sessions (e.g. a streaming WS connection) that can't be
    // wrapped in .run()'s call-and-retry model — just hand back the current key.
    currentKey() {
        return this.keys[this.index];
    }

    _label(i) {
        const key = this.keys[i];
        return key.length > 4 ? `...${key.slice(-4)}` : "***";
    }

    _markExhausted(index) {
        this.cooldownUntil[index] = Date.now() + COOLDOWN_MS;
    }

    // Moves to the next key that isn't cooling down (wraps around); if every key is
    // cooling down, just advances to the next one anyway rather than hard-failing.
    _rotate() {
        const start = this.index;
        for (let step = 1; step <= this.keys.length; step++) {
            const next = (start + step) % this.keys.length;
            if (Date.now() >= this.cooldownUntil[next]) {
                this.index = next;
                return;
            }
        }
        this.index = (start + 1) % this.keys.length;
    }

    // Calls fn(apiKey) using the current key. On a rate-limit/quota error it rotates
    // to the next available key and retries, up to once per configured key.
    async run(fn) {
        let lastErr;
        for (let attempt = 0; attempt < this.keys.length; attempt++) {
            const index = this.index;
            try {
                return await fn(this.keys[index]);
            } catch (err) {
                if (!isRateLimitError(err)) throw err;
                lastErr = err;
                console.warn(
                    `[${this.name}] key ${this._label(index)} rate-limited/out of quota, rotating (attempt ${attempt + 1}/${this.keys.length})`
                );
                this._markExhausted(index);
                this._rotate();
            }
        }
        throw lastErr;
    }
}
