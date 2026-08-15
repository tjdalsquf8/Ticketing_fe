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
import {
  NICKNAME_CHANGE_COOLDOWN_MS,
  NICKNAME_MAX,
  formatCooldownRemaining,
  validateNickname,
} from "@/lib/errors";

interface User {
  id: string;
  email: string;
  name: string;
  /**
   * 백엔드가 반환하는 권한 등급. 미포함 시 일반 사용자로 취급.
   * 관리자 판별은 최종적으로 백엔드 `requireAdmin`이 담당하며,
   * FE는 UI 노출 통제 목적으로만 사용한다.
   */
  role?: 'user' | 'admin';
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  guestNickname: string;
  /** 다음 변경 가능 시각(ms). 0이면 즉시 가능. */
  guestNicknameCooldownUntil: number;
  /**
   * 게스트 닉네임 변경. 규칙 위반 시 조용히 무시, 쿨다운 위반/네트워크 실패 시 throw.
   * 최초 설정이 아닐 때는 `DELETE /api/guests/me`로 서버 쿠키(UUID)를 삭제해
   * 이전 신원과 완전히 분리한다.
   */
  setGuestNickname: (name: string) => Promise<void>;
  /**
   * 서버가 강제한 닉네임을 동기화. 세션 시작 응답의 nickname을 반영할 때 사용.
   * 사용자 변경이 아니라 서버 truth 반영이므로 쿨다운 갱신·UUID 재발급 안 함.
   */
  syncGuestNickname: (name: string) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "auth_user";
const GUEST_NICKNAME_KEY = "guest_nickname";
const GUEST_NICKNAME_CHANGED_AT_KEY = "guest_nickname_changed_at";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [guestNickname, setGuestNicknameState] = useState('');
  const [guestNicknameChangedAt, setGuestNicknameChangedAt] = useState<number | null>(null);

  useEffect(() => {
    // localStorage 하이드레이션: setState는 마이크로태스크로 defer해
    // React 19의 react-hooks/set-state-in-effect 규칙을 준수한다.
    queueMicrotask(async () => {
      const stored = localStorage.getItem(USER_KEY);
      let isLoggedIn = false;
      if (stored) {
        try {
          setUser(JSON.parse(stored) as User);
          isLoggedIn = true;
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }
      const storedNick = localStorage.getItem(GUEST_NICKNAME_KEY);
      if (storedNick) setGuestNicknameState(storedNick);
      const storedChangedAt = localStorage.getItem(GUEST_NICKNAME_CHANGED_AT_KEY);
      if (storedChangedAt) {
        const n = Number(storedChangedAt);
        if (Number.isFinite(n) && n > 0) setGuestNicknameChangedAt(n);
      }

      // 게스트 부트스트랩: 로그인 유저가 아니고 localStorage에 닉네임 캐시가 없을 때
      // HttpOnly `guest_uuid` 쿠키가 살아있으면 서버에서 최초 닉네임을 1회 복구한다.
      // (UUID 자체는 프론트에서 저장/조회하지 않는다 — 쿠키 전용.)
      const hasNicknameCache = !!localStorage.getItem(GUEST_NICKNAME_KEY);
      if (!isLoggedIn && !hasNicknameCache) {
        try {
          const data = await apiFetch<{ guestUuid: string; nickname: string }>(
            ROUTES.guests.me,
          );
          if (data.nickname) {
            localStorage.setItem(GUEST_NICKNAME_KEY, data.nickname);
            setGuestNicknameState(data.nickname);
          }
        } catch {
          // GUEST_NOT_FOUND(404) 또는 네트워크 실패 — 신규 방문자로 취급.
          // 첫 세션 시작 시 백엔드가 UUID를 발급하고 쿠키를 세팅한다.
        }
      }

      setLoading(false);
    });
  }, []);

  const guestNicknameCooldownUntil =
    guestNicknameChangedAt !== null
      ? guestNicknameChangedAt + NICKNAME_CHANGE_COOLDOWN_MS
      : 0;

  const setGuestNickname = useCallback(async (name: string) => {
    const trimmed = name.trim().slice(0, NICKNAME_MAX);

    // 저장 전 규칙 검증 (빈 값 삭제 시엔 스킵)
    if (trimmed && validateNickname(trimmed) !== null) return;

    // 실제 변경이 발생하는지 판정
    const isMeaningfulChange = trimmed !== guestNickname;
    if (!isMeaningfulChange) return; // 동일 값 재설정은 무시

    // 쿨다운 검사 — 최초 설정(changedAt null)은 스킵
    if (guestNicknameChangedAt !== null) {
      const nowTs = Date.now();
      const cooldownUntil = guestNicknameChangedAt + NICKNAME_CHANGE_COOLDOWN_MS;
      if (nowTs < cooldownUntil) {
        const remaining = cooldownUntil - nowTs;
        throw new Error(
          `닉네임은 1시간에 한 번만 변경할 수 있습니다. ${formatCooldownRemaining(remaining)} 후 가능합니다.`,
        );
      }

      // 쿨다운 통과 → 서버에 게스트 정체성 초기화 요청 (옛 guest_uuid 쿠키 삭제)
      // 다음 세션 시작 시 백엔드가 새 UUID를 발급하고 새 닉네임으로 등록함.
      // 실패 시 throw해서 사용자에게 알림 (로컬만 바꾸면 다음 세션에서 immutability로 원복됨)
      await apiFetch<null>(ROUTES.guests.me, { method: 'DELETE' });
    }

    // 저장
    const now = Date.now();
    if (trimmed) {
      setGuestNicknameState(trimmed);
      localStorage.setItem(GUEST_NICKNAME_KEY, trimmed);
    } else {
      setGuestNicknameState('');
      localStorage.removeItem(GUEST_NICKNAME_KEY);
    }
    localStorage.setItem(GUEST_NICKNAME_CHANGED_AT_KEY, String(now));
    setGuestNicknameChangedAt(now);
  }, [guestNickname, guestNicknameChangedAt]);

  const syncGuestNickname = useCallback((name: string) => {
    const trimmed = name?.trim() ?? '';
    if (!trimmed || trimmed === guestNickname) return;
    // 서버가 강제한 값이므로 규칙 검증도 스킵 (백엔드가 이미 검증했음)
    setGuestNicknameState(trimmed);
    localStorage.setItem(GUEST_NICKNAME_KEY, trimmed);
  }, [guestNickname]);

  const login = useCallback(async (email: string, password: string) => {
    const { userInfo } = await apiFetch<{ userInfo: User }>(ROUTES.auth.login, {
      method: "POST",
      body: { email, password },
    });

    // 게스트 닉네임/쿨다운은 UUID(브라우저 신원)에 묶인 값이므로 로그인/로그아웃과 무관하게 유지.
    // 지우면 login→logout 사이클로 쿨다운을 리셋하는 우회가 가능해짐.
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
    setUser(userInfo);
  }, []);

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      await apiFetch<{ userId: number; email: string; name: string }>(
        ROUTES.auth.register,
        {
          method: "POST",
          body: { email, password, name },
        },
      );
      // 회원가입 후 자동 로그인
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch<null>(ROUTES.auth.logout, { method: "POST" });
    } finally {
      // 게스트 닉네임/쿨다운은 로그아웃 후에도 유지해 어뷰징 우회를 막는다.
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        guestNickname,
        guestNicknameCooldownUntil,
        setGuestNickname,
        syncGuestNickname,
        login,
        signup,
        logout,
      }}
    >
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
