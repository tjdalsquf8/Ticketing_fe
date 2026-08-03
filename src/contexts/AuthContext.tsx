"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiFetch, ROUTES } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  guestNickname: string;
  setGuestNickname: (name: string) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "auth_user";
const GUEST_NICKNAME_KEY = "guest_nickname";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [guestNickname, setGuestNicknameState] = useState('');

  useEffect(() => {
    // localStorage 하이드레이션: setState는 마이크로태스크로 defer해
    // React 19의 react-hooks/set-state-in-effect 규칙을 준수한다.
    queueMicrotask(() => {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        try {
          setUser(JSON.parse(stored) as User);
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }
      const storedNick = localStorage.getItem(GUEST_NICKNAME_KEY);
      if (storedNick) setGuestNicknameState(storedNick);
      setLoading(false);
    });
  }, []);

  const setGuestNickname = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 10);
    setGuestNicknameState(trimmed);
    if (trimmed) localStorage.setItem(GUEST_NICKNAME_KEY, trimmed);
    else localStorage.removeItem(GUEST_NICKNAME_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data: { userInfo } } = await apiFetch<{
      success: boolean;
      data: { userInfo: User };
    }>(ROUTES.auth.login, {
      method: "POST",
      body: { email, password },
    });

    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
    localStorage.removeItem(GUEST_NICKNAME_KEY);
    setUser(userInfo);
    setGuestNicknameState('');
  }, []);

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      await apiFetch<{ message: string; user: User }>(ROUTES.auth.register, {
        method: "POST",
        body: { email, password, name },
      });
      // 회원가입 후 자동 로그인
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ message: string }>(ROUTES.auth.logout, {
        method: "POST",
      });
    } finally {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(GUEST_NICKNAME_KEY);
      setUser(null);
      setGuestNicknameState('');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, guestNickname, setGuestNickname, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
