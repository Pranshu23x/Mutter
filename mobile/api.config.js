// Single source of truth for the backend URL.
// Set EXPO_PUBLIC_API_BASE_URL in mobile/.env (see .env.example) instead of editing this file:
// - Physical phone via Expo Go: use the ngrok URL (PC's localhost is unreachable from the phone)
// - Android emulator: use http://10.0.2.2:3000
// - Production (AWS): e.g. https://api.<your-domain>
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
