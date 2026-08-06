import { ApiError, getErrorMessage } from './errors';

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
  guests: {
    me: `${BASE_URL}/guests/me`,
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

// 게스트 UUID는 백엔드가 HttpOnly `guest_uuid` 쿠키로 관리 (JS 접근 불가).
// 프론트는 UUID를 생성/저장/조립하지 않으며, `credentials: "include"`로 쿠키만 자동 전송한다.

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface FetchOptions extends Omit<RequestInit, "method" | "body"> {
  method?: HttpMethod;
  body?: Record<string, unknown>;
}

function forceLogout() {
  // 게스트 닉네임/쿨다운은 UUID(브라우저 신원)에 묶여야 하므로 세션 만료로 지우지 않는다.
  localStorage.removeItem("auth_user");
  window.location.href = "/login";
}

/**
 * 백엔드 공통 응답 스키마
 *   성공: { success: true,  data:  T }
 *   실패: { success: false, error: { code, message } }
 *
 * apiFetch<T>는 성공 시 `data`(T)만 반환하고, 실패 시 ApiError를 throw한다.
 * 데이터 없는 성공은 T = null로 선언.
 */
type SuccessEnvelope<T> = { success: true; data: T };
type ErrorEnvelope = {
  success?: false;
  error?: { code?: string; message?: string };
};

async function readErrorEnvelope(res: Response): Promise<ErrorEnvelope> {
  try {
    return (await res.json()) as ErrorEnvelope;
  } catch {
    return {};
  }
}

export async function apiFetch<T>(
  url: string,
  { method = "GET", body, headers: extraHeaders, ...rest }: FetchOptions = {},
  _retry = false,
): Promise<T> {
  const hasBody = body !== undefined;
  const headers: HeadersInit = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...extraHeaders,
  };

  const res = await fetch(url, {
    method,
    headers,
    credentials: "include",
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
    ...rest,
  });

  if (res.ok) {
    const json = (await res.json()) as SuccessEnvelope<T> | { success?: unknown };
    if (!json || (json as { success?: unknown }).success !== true) {
      throw new ApiError(
        getErrorMessage('INTERNAL_ERROR'),
        'INVALID_RESPONSE',
        res.status,
      );
    }
    return (json as SuccessEnvelope<T>).data;
  }

  const envelope = await readErrorEnvelope(res);
  const code = envelope.error?.code;

  // 401: 세션 관련 코드(AUTH_*)일 때만 자동 로그아웃/refresh 처리.
  // INVALID_CREDENTIALS 같이 "로그인 시도 실패"로 발생한 401은 forceLogout하면
  // 페이지가 통째로 새로고침되면서 에러 메시지가 사라지므로 그냥 throw만 한다.
  const isSessionAuthError =
    code === 'AUTH_INVALID_TOKEN' || code === 'AUTH_TOKEN_MISSING';

  if (res.status === 401 && !_retry && typeof window !== "undefined" && isSessionAuthError) {
    if (code === 'AUTH_INVALID_TOKEN') {
      try {
        const refreshRes = await fetch(ROUTES.auth.refresh, {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          return apiFetch<T>(url, { method, body, headers: extraHeaders, ...rest }, true);
        }
      } catch {}
    }
    forceLogout();
    throw new ApiError(
      getErrorMessage(code, '세션이 만료되었습니다. 다시 로그인해 주세요.'),
      code,
      401,
    );
  }

  // 5xx는 백엔드 원본 메시지 노출 금지 (내부 정보 유출 방지)
  const fallback = res.status >= 500
    ? getErrorMessage('INTERNAL_ERROR')
    : (envelope.error?.message ?? `요청 실패 (${res.status})`);
  throw new ApiError(getErrorMessage(code, fallback), code ?? 'UNKNOWN', res.status);
}
