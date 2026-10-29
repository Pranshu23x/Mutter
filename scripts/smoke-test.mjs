// End-to-end backend smoke test. Boots server.js on a spare port and exercises every
// route — public pages, auth guards, validation, usage, translations, upload + streaming
// dictation, word limits, Razorpay webhooks, and account deletion — using throwaway
// Supabase users created with the service role (so no manual login is needed).
// Every user/row it creates is removed at the end, even if a check fails.
//
// Usage: node scripts/smoke-test.mjs        (reads the same .env as the server)
// Note: the dictation checks make real Sarvam + Groq calls (a few seconds of audio).
import "dotenv/config";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.SMOKE_PORT || 3999);
const BASE = `http://localhost:${PORT}`;
const AUDIO_PATH = path.join(ROOT, "Test-audio", "Recording.wav");
const RUN_ID = Date.now();
const PASSWORD = `Smoke-${crypto.randomBytes(8).toString("hex")}`;
const RAZORPAY_TEST_MODE = (process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_");

// A client with no persisted session, so it always acts with the service role.
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Tiny test harness
// ---------------------------------------------------------------------------
const results = [];
function check(name, ok, detail = "") {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}
function skip(name, reason) {
    results.push({ name, ok: true, skipped: true, detail: reason });
    console.log(`  SKIP  ${name}  (${reason})`);
}
async function section(title, fn) {
    console.log(`\n## ${title}`);
    try {
        await fn();
    } catch (err) {
        check(`${title}: unexpected exception`, false, err.stack || err.message);
    }
}
const short = (v) => JSON.stringify(v)?.slice(0, 200);

async function http(method, route, { token, json, form, headers = {}, raw } = {}) {
    const init = { method, headers: { ...headers }, redirect: "manual" };
    if (token) init.headers.Authorization = `Bearer ${token}`;
    if (json !== undefined) {
        init.headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(json);
    } else if (form) {
        init.body = form;
    } else if (raw !== undefined) {
        init.body = raw;
    }
    const res = await fetch(BASE + route, init);
    const text = await res.text();
    let body = text;
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, body, headers: res.headers };
}

// ---------------------------------------------------------------------------
// Server process
// ---------------------------------------------------------------------------
let serverProc = null;
let serverLog = "";
async function startServer() {
    serverProc = spawn(process.execPath, ["server.js"], {
        cwd: ROOT,
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "pipe", "pipe"],
    });
    serverProc.stdout.on("data", (d) => { serverLog += d; });
    serverProc.stderr.on("data", (d) => { serverLog += d; });
    for (let i = 0; i < 80; i++) {
        try {
            const res = await fetch(`${BASE}/healthz`);
            if (res.ok) return;
        } catch { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`server did not start:\n${serverLog}`);
}
async function stopServer() {
    if (!serverProc) return;
    const proc = serverProc;
    serverProc = null;
    await new Promise((resolve) => {
        proc.once("exit", resolve);
        proc.kill();
    });
}

// ---------------------------------------------------------------------------
// Throwaway users
// ---------------------------------------------------------------------------
const createdUserIds = new Set();
async function createUser(label) {
    const email = `mutter-smoke-${label}-${RUN_ID}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error) throw new Error(`createUser(${label}) failed: ${error.message}`);
    createdUserIds.add(data.user.id);
    return { id: data.user.id, email };
}
async function sessionFor(email) {
    // Separate, non-persisting client so signing in never touches any shared client.
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (error) throw new Error(`signIn(${email}) failed: ${error.message}`);
    return data.session;
}
async function purgeUser(userId) {
    const { data: files } = await admin.storage.from("audio-recordings").list(userId, { limit: 1000 });
    if (files?.length) await admin.storage.from("audio-recordings").remove(files.map((f) => `${userId}/${f.name}`));
    for (const table of ["translations", "word_usage", "subscription"]) {
        await admin.from(table).delete().eq("user_id", userId);
    }
    await admin.auth.admin.deleteUser(userId);
}

// ---------------------------------------------------------------------------
// Helpers for audio / webhooks / streaming
// ---------------------------------------------------------------------------
function readWavPcm(file) {
    const buf = fs.readFileSync(file);
    let offset = 12;
    let fmt = null;
    while (offset + 8 <= buf.length) {
        const id = buf.toString("ascii", offset, offset + 4);
        const size = buf.readUInt32LE(offset + 4);
        if (id === "fmt ") {
            fmt = { channels: buf.readUInt16LE(offset + 10), rate: buf.readUInt32LE(offset + 12), bits: buf.readUInt16LE(offset + 22) };
        }
        if (id === "data") return { fmt, pcm: buf.subarray(offset + 8, offset + 8 + size) };
        offset += 8 + size + (size % 2);
    }
    throw new Error("no data chunk in WAV");
}

function signedWebhook(event, subscriptionId, extra = {}) {
    const payload = JSON.stringify({
        event,
        payload: { subscription: { entity: { id: subscriptionId, current_start: 1_760_000_000, current_end: 1_762_600_000, ...extra.subscription } }, ...extra.payload },
    });
    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest("hex");
    return http("POST", "/api/webhooks/razorpay", {
        raw: payload,
        headers: { "Content-Type": "application/json", "x-razorpay-signature": signature },
    });
}

/** Opens the dictation socket, optionally streams PCM, then sends stop/cancel.
 *  Resolves with every text frame received plus the close code/reason. */
function streamSession({ token, persona = "Work", pcm = null, finish = "stop", chunkBytes = 6400, delayMs = 20, route = "/api/speech-stream" }) {
    return new Promise((resolve) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const ws = new WebSocket(`ws://localhost:${PORT}${route}?persona=${encodeURIComponent(persona)}`, { headers });
        const messages = [];
        let settled = false;
        const done = (extra) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ messages, ...extra });
        };
        const timer = setTimeout(() => { ws.terminate(); done({ timedOut: true }); }, 60_000);
        ws.on("message", (data) => {
            try { messages.push(JSON.parse(data.toString())); } catch { messages.push(data.toString()); }
        });
        ws.on("close", (code, reason) => done({ code, reason: reason.toString() }));
        ws.on("error", (err) => done({ error: err.message }));
        ws.on("open", async () => {
            if (pcm) {
                for (let i = 0; i < pcm.length && ws.readyState === ws.OPEN; i += chunkBytes) {
                    ws.send(pcm.subarray(i, i + chunkBytes));
                    await new Promise((r) => setTimeout(r, delayMs));
                }
            }
            if (finish && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: finish }));
        });
    });
}

const getSubRow = async (razorpayId) =>
    (await admin.from("subscription").select("*").eq("razorpay_subscription_id", razorpayId).maybeSingle()).data;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function main() {
    for (const key of ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "RAZORPAY_WEBHOOK_SECRET"]) {
        if (!process.env[key]) throw new Error(`${key} missing from .env`);
    }
    // Without this, an offline run "passes" the auth-guard and webhook checks for the
    // wrong reason (every Supabase call just fails) and then aborts halfway through.
    try {
        await fetch(`${process.env.SUPABASE_URL}/auth/v1/health`);
    } catch (err) {
        throw new Error(`Cannot reach Supabase (${err.cause?.code || err.message}) — check your internet connection / that the project isn't paused, then rerun.`);
    }
    console.log(`Booting server on :${PORT} (Razorpay ${RAZORPAY_TEST_MODE ? "TEST" : "LIVE/unknown"} keys)`);
    await startServer();

    let userA, sessionA, userB;
    const fakeSubId = `sub_smoketest_${RUN_ID}`;

    await section("Public endpoints", async () => {
        const health = await http("GET", "/healthz");
        check("GET /healthz -> 200 {status:ok}", health.status === 200 && health.body.status === "ok", short(health.body));
        const root = await http("GET", "/");
        check("GET / -> redirect to /test.html", root.status === 302 && root.headers.get("location") === "/test.html", root.status);
        const page = await http("GET", "/test.html");
        check("GET /test.html (static) -> 200", page.status === 200);
        const privacy = await http("GET", "/privacy");
        check("GET /privacy -> 200 html", privacy.status === 200 && /Privacy Policy/.test(privacy.body));
        check("/privacy uses a real SUPPORT_EMAIL (not example.com)", !/support@example\.com/.test(privacy.body), "SUPPORT_EMAIL is not set in .env");
        const deletion = await http("GET", "/account-deletion");
        check("GET /account-deletion -> 200 html", deletion.status === 200 && /Delete your Mutter account/.test(deletion.body));
        const missing = await http("GET", "/api/does-not-exist");
        check("Unknown route -> 404", missing.status === 404, missing.status);
    });

    await section("Auth guards (no token / bad token -> 401)", async () => {
        const guarded = [
            ["GET", "/api/usage/today"],
            ["GET", "/api/translations"],
            ["POST", "/api/translations"],
            ["DELETE", "/api/translations/1"],
            ["GET", "/api/payments/subs"],
            ["POST", "/api/payments/create-subs"],
            ["POST", "/api/speech-to-text-translate"],
            ["DELETE", "/api/auth/account"],
            ["GET", "/api/auth/me"],
            ["POST", "/api/auth/logout"],
        ];
        for (const [method, route] of guarded) {
            const none = await http(method, route);
            const bad = await http(method, route, { token: "not-a-real-jwt" });
            check(`${method} ${route} rejects missing + invalid token`, none.status === 401 && bad.status === 401, `${none.status}/${bad.status}`);
        }
        const wsNone = await streamSession({ token: null, finish: null });
        check("WS /api/speech-stream without token -> close 4401", wsNone.code === 4401, short(wsNone));
        const wsBad = await streamSession({ token: "bogus", finish: null });
        check("WS /api/speech-stream with bad token -> close 4401", wsBad.code === 4401, short(wsBad));
        const wsWrongPath = await streamSession({ token: "bogus", finish: null, route: "/api/other" });
        check("WS upgrade on any other path is refused", !!wsWrongPath.error || wsWrongPath.code === 1006, short(wsWrongPath));
    });

    await section("Auth route validation", async () => {
        const signup = await http("POST", "/api/auth/signup", { json: {} });
        check("POST /api/auth/signup without fields -> 400", signup.status === 400, signup.status);
        const login = await http("POST", "/api/auth/login", { json: {} });
        check("POST /api/auth/login without fields -> 400", login.status === 400, login.status);
        const wrong = await http("POST", "/api/auth/login", { json: { email: `nobody-${RUN_ID}@example.com`, password: "wrong-password" } });
        check("POST /api/auth/login wrong credentials -> 401", wrong.status === 401, wrong.status);
        const refresh = await http("POST", "/api/auth/refresh", { json: {} });
        check("POST /api/auth/refresh without token -> 400", refresh.status === 400, refresh.status);
        const badRefresh = await http("POST", "/api/auth/refresh", { json: { refresh_token: "nope" } });
        check("POST /api/auth/refresh bad token -> 401", badRefresh.status === 401, badRefresh.status);
        const badJson = await http("POST", "/api/auth/login", { raw: "{not json", headers: { "Content-Type": "application/json" } });
        check("Malformed JSON body -> 400 (global error handler)", badJson.status === 400 && badJson.body.error === "Invalid JSON body", short(badJson.body));
    });

    await section("Webhook signature verification", async () => {
        const unsigned = await http("POST", "/api/webhooks/razorpay", { raw: "{}", headers: { "Content-Type": "application/json" } });
        check("Webhook without signature -> 401", unsigned.status === 401, unsigned.status);
        const forged = await http("POST", "/api/webhooks/razorpay", {
            raw: JSON.stringify({ event: "subscription.charged" }),
            headers: { "Content-Type": "application/json", "x-razorpay-signature": "0".repeat(64) },
        });
        check("Webhook with forged signature -> 401", forged.status === 401, forged.status);
        const unknown = await signedWebhook("subscription.charged", `sub_unknown_${RUN_ID}`);
        check("Signed webhook for unknown subscription -> 200 skipped", unknown.status === 200 && /skipped/.test(unknown.body.message), short(unknown.body));
    });

    userA = await createUser("a");
    sessionA = await sessionFor(userA.email);
    const tokenA = sessionA.access_token;

    await section("Authenticated user basics", async () => {
        const me = await http("GET", "/api/auth/me", { token: tokenA });
        check("GET /api/auth/me -> 200 with the right user", me.status === 200 && me.body.user?.id === userA.id, short(me.body));
        const usage = await http("GET", "/api/usage/today", { token: tokenA });
        check("GET /api/usage/today -> 0 / 1000 on free", usage.status === 200 && usage.body.usage === 0 && usage.body.limit === 1000 && usage.body.plan === "free", short(usage.body));
        const { data: lazyRows } = await admin.from("subscription").select("plan,status").eq("user_id", userA.id);
        check("First authenticated call lazily creates exactly one free subscription row", lazyRows?.length === 1 && lazyRows[0].plan === "free", short(lazyRows));
        const subs = await http("GET", "/api/payments/subs", { token: tokenA });
        check("GET /api/payments/subs -> free", subs.status === 200 && subs.body.plan === "free", short(subs.body));
        const refreshed = await http("POST", "/api/auth/refresh", { json: { refresh_token: sessionA.refresh_token } });
        check("POST /api/auth/refresh with a real token -> 200 new session", refreshed.status === 200 && !!refreshed.body.session?.access_token, short(refreshed.body));
        if (refreshed.body.session) sessionA = refreshed.body.session;
    });

    await section("Translations CRUD", async () => {
        const token = sessionA.access_token;
        const invalid = await http("POST", "/api/translations", { token, json: { original_text: "only one field" } });
        check("POST /api/translations missing fields -> 400", invalid.status === 400, invalid.status);
        const created = await http("POST", "/api/translations", { token, json: { original_text: "namaste", translated_text: "hello", persona: "Personal" } });
        check("POST /api/translations -> 201", created.status === 201 && created.body.id, short(created.body));
        const list = await http("GET", "/api/translations", { token });
        check("GET /api/translations includes it", list.status === 200 && list.body.some((t) => t.id === created.body.id), short(list.body));
        const del = await http("DELETE", `/api/translations/${created.body.id}`, { token });
        check("DELETE /api/translations/:id -> 200", del.status === 200, del.status);
        const after = await http("GET", "/api/translations", { token });
        check("Deleted translation is gone", after.status === 200 && !after.body.some((t) => t.id === created.body.id));

        // Another user must not be able to delete A's translation.
        const other = await createUser("intruder");
        const otherToken = (await sessionFor(other.email)).access_token;
        const mine = await http("POST", "/api/translations", { token, json: { original_text: "a", translated_text: "b" } });
        await http("DELETE", `/api/translations/${mine.body.id}`, { token: otherToken });
        const still = await http("GET", "/api/translations", { token });
        check("Another user cannot delete your translation", still.body.some((t) => t.id === mine.body.id));
        const otherList = await http("GET", "/api/translations", { token: otherToken });
        check("Another user cannot list your translations", Array.isArray(otherList.body) && !otherList.body.some((t) => t.id === mine.body.id));
        await purgeUser(other.id);
        createdUserIds.delete(other.id);
    });

    const { fmt, pcm } = readWavPcm(AUDIO_PATH);
    const pcmOk = fmt.rate === 16000 && fmt.channels === 1 && fmt.bits === 16;
    // ~6s of speech keeps API spend small while still being a real utterance.
    const clip = pcm.subarray(0, Math.min(pcm.length, 16000 * 2 * 6));

    await section("Upload dictation (POST /api/speech-to-text-translate)", async () => {
        const token = sessionA.access_token;
        const noFile = await http("POST", "/api/speech-to-text-translate", { token, form: new FormData() });
        check("No audio file -> 400", noFile.status === 400, short(noFile.body));

        const wav = fs.readFileSync(AUDIO_PATH);
        const badPersona = new FormData();
        badPersona.append("file", new Blob([wav], { type: "audio/wav" }), "Recording.wav");
        badPersona.append("persona", "Pirate");
        const bad = await http("POST", "/api/speech-to-text-translate", { token, form: badPersona });
        check("Invalid persona -> 400", bad.status === 400, short(bad.body));

        const form = new FormData();
        form.append("file", new Blob([wav], { type: "audio/wav" }), "Recording.wav");
        form.append("persona", "Work");
        const started = Date.now();
        const res = await http("POST", "/api/speech-to-text-translate", { token, form });
        const ms = Date.now() - started;
        check(`Real recording -> 200 with transcript + cleaned output (${ms}ms)`,
            res.status === 200 && res.body.transcript?.length > 0 && typeof res.body.parsedOutput === "string",
            short(res.body));
        if (res.status === 200) {
            console.log(`        transcript:   ${res.body.transcript.slice(0, 160)}`);
            console.log(`        parsedOutput: ${res.body.parsedOutput.slice(0, 160)}`);
            const usage = await http("GET", "/api/usage/today", { token });
            check("Word usage increased by wordsSpoken", usage.body.usage === res.body.wordsSpoken, `${usage.body.usage} vs ${res.body.wordsSpoken}`);
            // The save + audio upload is fire-and-forget after the response; poll for it.
            let rows = [];
            for (let i = 0; i < 20 && !rows?.some((r) => r.audio_url); i++) {
                await new Promise((r) => setTimeout(r, 1000));
                ({ data: rows } = await admin.from("translations").select("audio_url").eq("user_id", userA.id));
            }
            check("Translation saved in background with audio uploaded", rows?.some((r) => r.audio_url), short(rows));
        }
    });

    await section("Streaming dictation (WS /api/speech-stream)", async () => {
        if (!pcmOk) return skip("Streaming dictation", `test WAV is ${short(fmt)}, need 16kHz mono 16-bit`);
        const token = sessionA.access_token;
        const before = (await http("GET", "/api/usage/today", { token })).body.usage;
        const started = Date.now();
        const result = await streamSession({ token, persona: "Email", pcm: clip });
        const ms = Date.now() - started;
        const msg = result.messages.find((m) => m.type === "result");
        check(`Stream + stop -> result frame (${ms}ms incl. ~${(clip.length / 32000).toFixed(1)}s audio)`,
            !!msg && msg.transcript?.length > 0 && msg.persona === "Email", short(result));
        check("Socket closes normally (1000) after result", result.code === 1000, result.code);
        if (msg) {
            console.log(`        transcript:   ${msg.transcript.slice(0, 160)}`);
            console.log(`        parsedOutput: ${msg.parsedOutput.slice(0, 160)}`);
            const after = (await http("GET", "/api/usage/today", { token })).body.usage;
            check("Streaming usage counted", after === before + msg.wordsSpoken, `${before} + ${msg.wordsSpoken} != ${after}`);
        }

        const cancelled = await streamSession({ token, pcm: clip.subarray(0, 32000), finish: "cancel" });
        check("Stream + cancel -> closes 1000 with no result", cancelled.code === 1000 && !cancelled.messages.some((m) => m.type === "result"), short(cancelled));

        const instantCancel = await streamSession({ token, finish: "cancel" });
        check("Cancel sent before setup finishes still closes the socket", instantCancel.code === 1000 && !instantCancel.timedOut, short(instantCancel));

        const badPersona = await streamSession({ token, persona: "Pirate", pcm: clip.subarray(0, 64000) });
        const fallback = badPersona.messages.find((m) => m.type === "result");
        check("Unknown persona on the stream falls back to Work", !fallback || fallback.persona === "Work", short(badPersona));
    });

    await section("Daily word limit", async () => {
        const token = sessionA.access_token;
        const today = new Date().toISOString().split("T")[0];
        await admin.from("word_usage").delete().eq("user_id", userA.id);
        await admin.from("word_usage").insert({ user_id: userA.id, date: today, word_count: 1000 });
        const form = new FormData();
        form.append("file", new Blob([fs.readFileSync(AUDIO_PATH)], { type: "audio/wav" }), "Recording.wav");
        const http429 = await http("POST", "/api/speech-to-text-translate", { token, form });
        check("Upload at the free limit -> 429", http429.status === 429 && http429.body.limit === 1000, short(http429.body));
        const ws = await streamSession({ token, finish: null });
        check("Stream at the free limit -> LIMIT_EXCEEDED + close 4429",
            ws.code === 4429 && ws.messages.some((m) => m.code === "LIMIT_EXCEEDED"), short(ws));
    });

    await section("Razorpay webhooks drive the plan", async () => {
        const token = sessionA.access_token;
        // Simulated subscription row (no real Razorpay object is created here).
        const { error } = await admin.from("subscription").insert({
            user_id: userA.id, razorpay_subscription_id: fakeSubId, razorpay_plan_id: "plan_smoketest", status: "created",
        });
        if (error) throw new Error(`could not insert test subscription: ${error.message}`);

        await signedWebhook("subscription.authenticated", fakeSubId);
        check("authenticated -> status authenticated, still free", (await getSubRow(fakeSubId))?.status === "authenticated" && (await getSubRow(fakeSubId))?.plan !== "pro");

        await signedWebhook("subscription.activated", fakeSubId, { subscription: { paid_count: 0 } });
        let row = await getSubRow(fakeSubId);
        check("activated with no payment evidence -> active but NOT pro", row?.status === "active" && row?.plan !== "pro", short(row));

        await signedWebhook("subscription.authenticated", fakeSubId);
        check("Late 'authenticated' webhook does not downgrade an active sub", (await getSubRow(fakeSubId))?.status === "active");

        const charged = await signedWebhook("subscription.charged", fakeSubId, { subscription: { paid_count: 1 } });
        row = await getSubRow(fakeSubId);
        check("charged -> pro", charged.status === 200 && row?.plan === "pro" && row?.status === "active", short(row));

        const subs = await http("GET", "/api/payments/subs", { token });
        check("GET /api/payments/subs reports pro", subs.body.plan === "pro", short(subs.body));
        const usage = await http("GET", "/api/usage/today", { token });
        check("Pro raises the daily limit to 5000", usage.body.limit === 5000 && usage.body.plan === "pro", short(usage.body));

        const dup = await http("POST", "/api/payments/create-subs", { token, json: { billing_cycle: "monthly" } });
        check("create-subs while already subscribed -> 400", dup.status === 400, short(dup.body));
        const badCycle = await http("POST", "/api/payments/create-subs", { token, json: { billing_cycle: "weekly" } });
        check("create-subs with invalid billing_cycle -> 400", badCycle.status === 400, short(badCycle.body));

        await signedWebhook("subscription.paused", fakeSubId);
        check("paused -> free", (await getSubRow(fakeSubId))?.plan === "free");
        await signedWebhook("subscription.resumed", fakeSubId);
        check("resumed -> pro", (await getSubRow(fakeSubId))?.plan === "pro");
        await signedWebhook("subscription.halted", fakeSubId);
        row = await getSubRow(fakeSubId);
        check("halted -> free", row?.plan === "free" && row?.status === "halted", short(row));
        await signedWebhook("subscription.cancelled", fakeSubId);
        check("cancelled -> free", (await getSubRow(fakeSubId))?.status === "cancelled");
    });

    await section("Real Razorpay subscription checkout (create-subs)", async () => {
        if (!RAZORPAY_TEST_MODE) return skip("create-subs against Razorpay", "keys are not rzp_test_ — not creating a live subscription");
        const token = sessionA.access_token;
        const created = await http("POST", "/api/payments/create-subs", { token, json: { billing_cycle: "monthly" } });
        check("create-subs monthly -> 201 subscription_id + key id", created.status === 201 && /^sub_/.test(created.body.subscription_id) && /^rzp_test_/.test(created.body.razorpay_key_id), short(created.body));
        const again = await http("POST", "/api/payments/create-subs", { token, json: { billing_cycle: "monthly" } });
        check("Second create-subs within 30 min -> 400 (pending checkout)", again.status === 400, short(again.body));
        if (created.body.subscription_id) {
            await admin.from("subscription").update({ created_at: new Date(Date.now() - 31 * 60 * 1000).toISOString() })
                .eq("razorpay_subscription_id", created.body.subscription_id);
            const retry = await http("POST", "/api/payments/create-subs", { token, json: { billing_cycle: "yearly" } });
            check("Abandoned checkout (>30 min) no longer blocks a new one", retry.status === 201, short(retry.body));
            check("Abandoned subscription marked cancelled", (await getSubRow(created.body.subscription_id))?.status === "cancelled");
        }
    });

    await section("Logout revokes the session", async () => {
        const session = await sessionFor(userA.email);
        const out = await http("POST", "/api/auth/logout", { token: session.access_token });
        check("POST /api/auth/logout -> 200", out.status === 200, short(out.body));
        const refresh = await http("POST", "/api/auth/refresh", { json: { refresh_token: session.refresh_token } });
        check("Refresh token is dead after logout", refresh.status === 401, refresh.status);
    });

    await section("Account deletion (DELETE /api/auth/account)", async () => {
        const token = (await sessionFor(userA.email)).access_token;
        const res = await http("DELETE", "/api/auth/account", { token });
        check("DELETE /api/auth/account -> 200", res.status === 200, short(res.body));
        const { data: authUser } = await admin.auth.admin.getUserById(userA.id);
        check("Auth user is gone", !authUser?.user);
        for (const table of ["translations", "word_usage", "subscription"]) {
            const { data } = await admin.from(table).select("user_id").eq("user_id", userA.id);
            check(`No ${table} rows left`, (data?.length ?? 0) === 0, short(data));
        }
        const { data: files } = await admin.storage.from("audio-recordings").list(userA.id);
        check("No audio files left in storage", (files?.length ?? 0) === 0, short(files));
        if (!authUser?.user) createdUserIds.delete(userA.id);
    });

    // Runs last on purpose: if the bug is real it leaves the server's shared Supabase
    // client signed in as user B, so the server is restarted afterwards.
    await section("Shared Supabase client isolation after /api/auth/login", async () => {
        userB = await createUser("b");
        const victim = await createUser("victim");
        const victimSub = `sub_smoketest_victim_${RUN_ID}`;
        await admin.from("subscription").insert({ user_id: victim.id, razorpay_subscription_id: victimSub, razorpay_plan_id: "plan_smoketest", status: "active", plan: "pro" });

        const login = await http("POST", "/api/auth/login", { json: { email: userB.email, password: PASSWORD } });
        check("POST /api/auth/login with real credentials -> 200 session", login.status === 200 && !!login.body.session?.access_token, short(login.body));

        // After someone logs in, a (service-role) webhook for a *different* user must still work.
        const hook = await signedWebhook("subscription.cancelled", victimSub);
        const row = await getSubRow(victimSub);
        check("Webhooks still update other users' subscriptions after a login",
            row?.status === "cancelled",
            `webhook said ${short(hook.body)}; row status still '${row?.status}' — the shared service-role client is now acting as the logged-in user`);
        await purgeUser(victim.id);
        createdUserIds.delete(victim.id);
    });
}

const started = Date.now();
try {
    await main();
} catch (err) {
    check("Test run aborted", false, err.stack || err.message);
} finally {
    await stopServer();
    for (const id of createdUserIds) {
        try { await purgeUser(id); } catch (err) { console.error(`cleanup failed for ${id}: ${err.message}`); }
    }
    const failed = results.filter((r) => !r.ok);
    const skipped = results.filter((r) => r.skipped);
    console.log(`\n${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    if (failed.length && /error/i.test(serverLog)) console.log(`\n--- server log ---\n${serverLog.slice(-3000)}`);
    process.exitCode = failed.length ? 1 : 0;
}
