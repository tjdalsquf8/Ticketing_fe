"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiFetch, refreshWithLock, ROUTES } from "@/lib/api";
import { getGuestMe, postGuest } from "@/lib/guests";
import { NICKNAME_MAX, validateNickname } from "@/lib/errors";

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
  /**
   * 게스트 닉네임 변경. 규칙 위반 시 조용히 무시, 네트워크 실패 시 throw.
   * 언제든 변경 가능하며 신원(guest_uuid)은 그대로 유지된다 — 서버에 즉시
   * 반영(POST /api/guests)해 이후 랭킹도 새 닉네임으로 이어진다.
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
  /** GET /users/me 재요청 후 user state 갱신. */
  refreshMe: () => Promise<void>;
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

      // 로그인 상태로 하이드레이션됐다면 accessToken 유효성을 서버에 1회 확인한다.
      // accessToken(쿠키)는 1시간 만료이지만 localStorage.auth_user는 만료 개념이 없어
      // UI만 로그인 상태를 유지한 채 API가 게스트로 처리되는 오분기를 막기 위함.
      //
      // apiFetch를 쓰지 않는 이유: refresh 실패 시 `forceLogout()`이 `/login`으로
      // 강제 리다이렉트하는데, 초기 부팅 검증에서는 조용히 로그아웃 상태로만
      // 전환하고 현재 페이지에 머무르길 원한다.
      if (isLoggedIn) {
        try {
          const meRes = await fetch(ROUTES.users.me, {
            method: 'GET',
            credentials: 'include',
          });
          let ok = meRes.ok;
          let meJson: unknown = ok ? await meRes.json().catch(() => null) : null;

          if (!ok && meRes.status === 401) {
            // refresh 1회 시도. 성공 시 users/me 재요청.
            // apiFetch 인터셉터와 동일한 single-flight + navigator.locks 락을 재사용해
            // 부팅 시 여러 탭이 동시에 새 refresh 를 다투는 케이스를 방어한다.
            const refreshed = await refreshWithLock();
            if (refreshed) {
              const retryRes = await fetch(ROUTES.users.me, {
                method: 'GET',
                credentials: 'include',
              });
              ok = retryRes.ok;
              meJson = ok ? await retryRes.json().catch(() => null) : null;
            }
          }

          if (ok && meJson && typeof meJson === 'object') {
            const envelope = meJson as { success?: unknown; data?: unknown };
            if (envelope.success === true && envelope.data && typeof envelope.data === 'object') {
              const raw = envelope.data as {
                id?: number | string;
                email?: string;
                name?: string;
                role?: 'user' | 'admin';
              };
              if (raw.id !== undefined && raw.email && raw.name) {
                const verified: User = {
                  id: String(raw.id),
                  email: raw.email,
                  name: raw.name,
                  ...(raw.role ? { role: raw.role } : {}),
                };
                setUser(verified);
                localStorage.setItem(USER_KEY, JSON.stringify(verified));
              }
            }
          } else {
            // 명확한 실패 응답(401 후 refresh도 실패, 400/500 등) — 캐시 무효화하고 로그아웃 상태로 전환.
            // 강제 리다이렉트하지 않음(현재 페이지 유지).
            localStorage.removeItem(USER_KEY);
            setUser(null);
            isLoggedIn = false;
          }
        } catch {
          // 네트워크 실패(오프라인 등)는 로컬 캐시를 관대하게 유지 — 다음 API 호출에서 자연 재검증.
        }
      }

      // 게스트 부트스트랩: 로그인 유저가 아니고 localStorage에 닉네임 캐시가 없을 때
      // HttpOnly `guest_uuid` 쿠키가 살아있으면 서버에서 최초 닉네임을 1회 복구한다.
      // (UUID 자체는 프론트에서 저장/조회하지 않는다 — 쿠키 전용.)
      //
      // 단, 이번 마운트에서 "로그인 유저 → 토큰 만료로 로그아웃 전환"된 경우엔
      // 같은 tick 에서 게스트 부트스트랩까지 이어붙이지 않는다(UX 상 부자연스러움).
      // 다음 페이지 진입 시 자연 발생.
      const hasNicknameCache = !!localStorage.getItem(GUEST_NICKNAME_KEY);
      if (!isLoggedIn && !stored && !hasNicknameCache) {
        try {
          const data = await getGuestMe();
          if (data.nickname) {
            localStorage.setItem(GUEST_NICKNAME_KEY, data.nickname);
            setGuestNicknameState(data.nickname);
          }
        } catch {
          // GUEST_NOT_AUTHENTICATED(401)/GUEST_NOT_FOUND(404) 또는 네트워크 실패 — 신규 방문자로 취급.
          // 라이브 참여 시 프롬프트에서 닉네임 입력 → POST /api/guests 로 신원 발급된다.
        }
      }

      setLoading(false);
    });
  }, []);

  // 다른 탭에서 게스트 닉네임을 변경한 경우 로컬 state 도 동기화.
  // storage 이벤트는 다른 탭에서만 발화(현재 탭 setItem 은 트리거하지 않음)하므로
  // 무한 루프 걱정 없음. 진행 중인 라이브 세션의 서버 신원은 이미 서버 쪽 UUID 로
  // 확정되어 있어 UI 표기만 최신화하는 정도로 처리.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUEST_NICKNAME_KEY) {
        setGuestNicknameState(e.newValue ?? '');
      } else if (e.key === USER_KEY) {
        if (e.newValue === null) {
          setUser(null);
        } else {
          try {
            setUser(JSON.parse(e.newValue) as User);
          } catch {
            /* 파싱 실패는 무시. 다음 페이지 로드에서 재하이드레이션. */
          }
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setGuestNickname = useCallback(async (name: string) => {
    const trimmed = name.trim().slice(0, NICKNAME_MAX);

    // 저장 전 규칙 검증 (빈 값 삭제 시엔 스킵)
    if (trimmed && validateNickname(trimmed) !== null) return;
    if (trimmed === guestNickname) return; // 동일 값 재설정은 무시

    // 값이 있으면 서버에 게스트 닉네임 갱신 요청 (POST /api/guests, upsert).
    // 신원(guest_uuid)은 그대로 유지되고 nickname만 바뀐다 — 이후 랭킹 조회도
    // 같은 신원으로 이어진다. idempotent 하므로 쿠키가 이미 있으면 그 UUID 그대로 쓴다.
    let finalNickname = trimmed;
    if (trimmed) {
      const guest = await postGuest(trimmed);
      finalNickname = guest.nickname ?? trimmed;
    }

    if (finalNickname) {
      setGuestNicknameState(finalNickname);
      localStorage.setItem(GUEST_NICKNAME_KEY, finalNickname);
    } else {
      setGuestNicknameState('');
      localStorage.removeItem(GUEST_NICKNAME_KEY);
    }
  }, [guestNickname]);

  const syncGuestNickname = useCallback((name: string) => {
    const trimmed = name?.trim() ?? '';
    if (!trimmed || trimmed === guestNickname) return;
    // 서버가 강제한 값이므로 규칙 검증도 스킵 (백엔드가 이미 검증했음)
    setGuestNicknameState(trimmed);
    localStorage.setItem(GUEST_NICKNAME_KEY, trimmed);
  }, [guestNickname]);

  const refreshMe = useCallback(async () => {
    try {
      const raw = await apiFetch<{
        id?: number | string;
        email?: string;
        name?: string;
        role?: 'user' | 'admin';
      }>(ROUTES.users.me);
      if (raw.id === undefined || !raw.email || !raw.name) return;
      const verified: User = {
        id: String(raw.id),
        email: raw.email,
        name: raw.name,
        ...(raw.role ? { role: raw.role } : {}),
      };
      setUser(verified);
      localStorage.setItem(USER_KEY, JSON.stringify(verified));
    } catch {
      // 조용히 무시. 실패해도 기존 user state 유지.
    }
  }, []);

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
        setGuestNickname,
        syncGuestNickname,
        login,
        signup,
        logout,
        refreshMe,
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
