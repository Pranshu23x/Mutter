# Backend changes

Scope note: per the plan, backend changes were kept deliberately minimal — most of the
plumbing (word-usage tracking, plan limits, Supabase JWT verification) already existed
and just wasn't exposed or trusted correctly by the client. **No changes were made to
`routes/authRoutes.js` or `middleware/auth.js`** — Google sign-in is handled entirely by
the mobile app talking to Supabase directly (see the mobile-side plan), since
`middleware/auth.js`'s `authenticate` already validates any valid Supabase JWT
(`supabase.auth.getUser(token)`) regardless of whether it came from password login or
Google OAuth.

## 1. New route: `GET /api/usage/today` (`routes/usage.js`, mounted in `server.js`)

Added so the app can show today's word usage before the user ever speaks, instead of
only learning it as a side effect of a `/api/speech-to-text-translate` response.

- Auth-gated via the existing `authenticate` middleware.
- Reuses existing functions verbatim: `getTodayUsage` (`db/wordUsage.js`) and
  `getPlanLimits` (`config/plans.js`) — no new DB tables, no schema changes.
- Response shape: `{ usage, limit, plan, resetAt: "midnight UTC" }`.
- Mounted in `server.js` next to the other route groups: `app.use("/api/usage", arcjetProtection, usageRoutes)`.

## 2. `routes/payments.js` — webhook now requires real payment evidence before granting Pro

**Problem:** the `subscription.activated` webhook handler unconditionally set
`plan: "pro"` the moment the event arrived. `activated` fires once the payment
mandate/subscription is confirmed, which is not always the same instant as a captured
payment (e.g. in Razorpay test mode this can fire very fast relative to a human
completing checkout). This was the most likely source of "Pro" appearing to apply
before/without a real payment.

**Fix:**
- `subscription.activated`: still updates `status` as before, but now only flips
  `plan: "pro"` if the event carries real evidence of a charge — either
  `subEntity.paid_count >= 1` or an attached `event.payload.payment.entity.status === "captured"`.
- `subscription.charged` (the unambiguous real-charge event — carries a `payment_id`):
  previously only updated `status`, never touched `plan`. Now also sets `plan: "pro"`.
  This makes `charged` the primary trusted place Pro is granted, and fixes a latent bug
  where a renewal charge on a subscription that had somehow lost its `plan` value would
  never restore Pro.
- `subscription.resumed` is unchanged — it correctly re-grants Pro on an
  already-paid subscription, which is not a new payment event.

## 3. `routes/payments.js` `/create-subs` — abandoned subscriptions no longer block retries

**Problem:** the duplicate-subscription guard blocked creating a new subscription for
any existing row with status `created`, `authenticated`, or `active` — forever. If a
user started checkout and abandoned it (closed the payment page without paying), that
`created` row would permanently return "You already have a active subscription" on every
future upgrade attempt.

**Fix:** before the guard check, if the user's most recent subscription is `created` and
older than 30 minutes, it's now treated as abandoned: it's marked `cancelled` via the
existing `updateSubsStatus` helper, and the request proceeds to create a fresh
subscription instead of erroring.

## 4. API key rotation for Groq and Sarvam (`utils/apiKeyRotator.js`)

**Problem:** both `services/persona.js` (Groq) and `services/sarvam.js` (Sarvam) read a
single `*_API_KEY` env var once at module load and built one client from it — if that
key hit a rate limit or ran out of quota, every request failed until it reset.

**Fix:** new shared `KeyRotator` class loads *all* configured keys for a provider,
and `.run(fn)` calls `fn(apiKey)` with the current key; if the call throws a
rate-limit/quota-style error (HTTP 429, or a message matching "rate limit", "quota",
"insufficient credits", "limit exceeded", etc.), it marks that key on a 60s cooldown,
rotates to the next non-cooling-down key, and retries — up to once per configured key
— before giving up. Both `persona.js` and `sarvam.js` now build one client per key
(cached in a `Map`) and route their API calls through `groqKeys.run(...)` /
`sarvamKeys.run(...)` instead of a single module-level client.

**Required `.env` change — add your extra keys under one of these conventions**
(mix and match; all are merged and de-duplicated):
```
# numbered (keeps the existing GROQ_API_KEY / SARVAM_API_KEY as key #1)
GROQ_API_KEY=first-key
GROQ_API_KEY_2=second-key
GROQ_API_KEY_3=third-key
...
GROQ_API_KEY_10=tenth-key

SARVAM_API_KEY=first-key
SARVAM_API_KEY_2=second-key
...

# OR a single comma-separated var
GROQ_API_KEYS=key1,key2,key3,...
SARVAM_API_KEYS=key1,key2,key3,...
```
Right now `.env` only has the original single `GROQ_API_KEY` and `SARVAM_API_KEY` —
the rotator falls back to just those until more are added in one of the formats above.
Restart the server after editing `.env` (keys are loaded once at startup, per process).

**Note:** rotation state (which key is "current"/cooling down) is in-memory per Node
process — fine for a single server instance; if this ever runs multiple instances/PM2
cluster workers, each would rotate independently rather than sharing state.

## Non-code / external setup still required

- **Supabase anon (public) key**: does not exist anywhere in this repo today (only the
  service-role `SUPABASE_SECRET_KEY` is used server-side). The mobile app needs the
  **anon** key (safe to embed client-side) to talk to Supabase directly for Google
  OAuth — get it from Supabase Dashboard → Project Settings → API, and put it in
  `mobile/.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`. This is not a backend code change,
  just a value that needs to be sourced from the Dashboard.
- **Supabase Dashboard → Auth → URL Configuration**: add `mutter://**` to the Redirect
  URLs allowlist, so the OAuth callback is allowed to redirect back into the app.
- **Supabase Dashboard → Auth → Providers → Google**: enable it, with a Google Cloud
  Console OAuth Client (type **Web application** — Supabase's server performs the code
  exchange, not the phone), authorized redirect URI =
  `https://<project-ref>.supabase.co/auth/v1/callback`.
- **Razorpay Dashboard**: confirm the webhook secret (`RAZORPAY_WEBHOOK_SECRET`) and
  webhook URL are correctly configured for whichever environment is under test — the
  payment-verification fix above only helps if webhooks are actually reaching the
  server (a `localhost` backend during dev cannot receive real Razorpay webhooks at
  all).
