if (
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_API_BASE_URL
) {
  console.error(
    "[config] NEXT_PUBLIC_API_BASE_URL 미설정. 프로덕션에서는 반드시 지정해야 합니다.",
  );
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

export const ROUTES = {
  auth: {
    register: `${BASE_URL}/auth/register`,
    login: `${BASE_URL}/auth/login`,
    logout: `${BASE_URL}/auth/logout`,
    refresh: `${BASE_URL}/auth/refresh`,
  },
  users: {
    me: `${BASE_URL}/users/me`,
  },
  events: `${BASE_URL}/events`,
  tickets: `${BASE_URL}/tickets`,
  orders: `${BASE_URL}/orders`,
  practice: {
    sessions: `${BASE_URL}/practice/sessions`,
    completeSession: (sessionId: string) =>
      `${BASE_URL}/practice/sessions/${sessionId}/complete`,
  },
  rankings: `${BASE_URL}/rankings`,
};

export function getOrCreateGuestUuid(): string {
  let uuid = localStorage.getItem("guest_uuid");
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem("guest_uuid", uuid);
  }
  return uuid;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface FetchOptions extends Omit<RequestInit, "method" | "body"> {
  method?: HttpMethod;
  body?: Record<string, unknown>;
}

function forceLogout() {
  localStorage.removeItem("auth_user");
  localStorage.removeItem("guest_nickname");
  window.location.href = "/login";
}

export async function apiFetch<T>(
  url: string,
  { method = "GET", body, headers: extraHeaders, ...rest }: FetchOptions = {},
  _retry = false,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  const res = await fetch(url, {
    method,
    headers,
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...rest,
  });

  if (!res.ok) {
    // 401: 토큰 만료 → refresh 시도 (새 accessToken 쿠키가 자동 세팅됨)
    if (res.status === 401 && !_retry && typeof window !== "undefined") {
      try {
        const refreshRes = await fetch(ROUTES.auth.refresh, {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          return apiFetch<T>(url, { method, body, headers: extraHeaders, ...rest }, true);
        }
      } catch {}
      // refresh 실패 → 강제 로그아웃
      forceLogout();
      throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
    }

    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: { msg: string }[];
      error?: { message?: string };
    };
    const message =
      data.errors?.[0]?.msg ??
      data.error?.message ??
      data.message ??
      `HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
