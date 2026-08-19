// Single source of truth for the backend URL.
// - Physical phone via Expo Go: use the ngrok URL (PC's localhost is unreachable from the phone)
// - Android emulator: use http://10.0.2.2:3000
// - Production (AWS): will be e.g. https://api.<your-domain> — swap here before building the APK
export const API_BASE_URL = "http://localhost:3000";
