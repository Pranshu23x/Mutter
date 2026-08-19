import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../api.config";

const TOKEN_KEY = "mutter.access_token";
const EMAIL_KEY = "mutter.email";

const AuthContext = createContext(null);

async function post(path, body, token) {
  const res = await fetch(API_BASE_URL + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedEmail] = await AsyncStorage.multiGet([TOKEN_KEY, EMAIL_KEY]);
        setToken(storedToken[1]);
        setEmail(storedEmail[1]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (emailInput, password) => {
    const { ok, data } = await post("/api/auth/login", { email: emailInput, password });
    if (!ok) throw new Error(data.error || "Login failed");
    if (!data.session?.access_token) throw new Error("Login did not return a session");
    await AsyncStorage.multiSet([
      [TOKEN_KEY, data.session.access_token],
      [EMAIL_KEY, emailInput],
    ]);
    setToken(data.session.access_token);
    setEmail(emailInput);
  }, []);

  const signUp = useCallback(async (emailInput, password) => {
    const { ok, data } = await post("/api/auth/signup", { email: emailInput, password });
    if (!ok) throw new Error(data.error || "Signup failed");
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await post("/api/auth/logout", {}, token);
      } catch {}
    }
    await AsyncStorage.multiRemove([TOKEN_KEY, EMAIL_KEY]);
    setToken(null);
    setEmail(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, email, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
