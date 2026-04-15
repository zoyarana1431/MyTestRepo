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
import { apiFetch } from "@/lib/api";
import { clearToken, setToken } from "@/lib/auth-storage";
import type { User } from "@/types/api";

type AuthState = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const AUTH_ME_TIMEOUT_MS = 10_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const refreshUser = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), AUTH_ME_TIMEOUT_MS);
    try {
      const me = await apiFetch<User>("/api/v1/auth/me", { signal: controller.signal });
      setUser(me);
    } catch {
      setUser(null);
      clearToken();
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ access_token: string; token_type: string }>("/api/v1/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setToken(res.access_token);
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    await apiFetch<User>("/api/v1/auth/register", {
      method: "POST",
      json: { email, password, full_name: fullName ?? null },
    });
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    clearToken();
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, login, register, logout, refreshUser }),
    [user, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
