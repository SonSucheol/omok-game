"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PublicUser } from "@/lib/auth";
import {
  fetchMe,
  loginAccount,
  logoutAccount,
  registerAccount,
} from "@/lib/auth/client";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (
    nickname: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  register: (
    nickname: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        console.log("[omok:login] /api/auth/me", me);
        if (!cancelled) {
          setUser(me);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (nickname: string, password: string) => {
    const result = await loginAccount(nickname, password);
    if ("error" in result) {
      console.log("[omok:login] login fail", result);
      return { ok: false as const, message: result.message };
    }
    console.log("[omok:login] login ok", result.user);
    setUser(result.user);
    return { ok: true as const };
  }, []);

  const register = useCallback(async (nickname: string, password: string) => {
    const result = await registerAccount(nickname, password);
    if ("error" in result) {
      console.log("[omok:login] register fail", result);
      return { ok: false as const, message: result.message };
    }
    console.log("[omok:login] register ok", result.user);
    setUser(result.user);
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount();
    console.log("[omok:login] logout");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout }),
    [user, loading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
