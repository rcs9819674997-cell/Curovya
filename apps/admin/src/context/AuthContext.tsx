import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, getToken } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_verified: boolean;
  language: string;
  doctor_id?: string | null;
  clinic_id?: string | null;
  avatar_url?: string;

  subscription?: {
    active?: boolean;
    plan?: string;
    expires_at?: string;
  } | null;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLangState] = useState("en");

  const refresh = useCallback(async () => {
    const t = await getToken();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const u = await api.get<User>("/auth/me");
      setUser(u);
    } catch {
      await setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const lang = await storage.getItem("hd_lang", "en");
      if (lang) setLangState(lang);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const setLanguage = async (lang: string) => {
    setLangState(lang);
    await storage.setItem("hd_lang", lang);
  };

  const login: AuthCtx["login"] = async (email, password) => {
    const res = await api.post<{ access_token: string; user: User }>(
      "/auth/login",
      { email, password },
      false,
    );
    // Admin app only allows super_admin users
    if (res.user.role !== "super_admin") {
      throw new Error("Access denied. Only administrators can use this app.");
    }
    await setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  // Admin app does not support public signup.
  // Admin accounts are pre-created by the system.

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Logout API failure is non-critical
    }
    await setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider
      value={{ user, loading, language, setLanguage, login, logout, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
