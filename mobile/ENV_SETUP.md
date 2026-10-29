# Mobile environment setup

Create a `mobile/.env` file (gitignored) with:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- `EXPO_PUBLIC_API_BASE_URL` — see the comment in `api.config.js` for which value to use
  (physical device via Expo Go needs a reachable URL like ngrok, not `localhost`;
  Android emulator uses `http://10.0.2.2:3000`; production uses your real API host).
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — from Supabase Dashboard
  → Project Settings → API. The anon key is public-safe and meant to be embedded
  client-side; never put the service-role key here.

(A `.env.example` file couldn't be created directly in this session — this repo's Claude
Code permission settings deny writing/reading any `.env*` path as a secrets safeguard.
Create `mobile/.env` by hand using the values above.)
