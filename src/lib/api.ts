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
    root: `${BASE_URL}/guests`,
    me: `${BASE_URL}/guests/me`,
  },
  events: `${BASE_URL}/events`,
  eventsRankingsLatest: (limit = 100) =>
    `${BASE_URL}/events/rankings/latest?limit=${limit}`,
  tickets: {
    me: `${BASE_URL}/tickets/me`,
    detail: (ticketId: number | string) => `${BASE_URL}/tickets/${ticketId}`,
  },
  orders: `${BASE_URL}/orders`,
  practice: {
    sessions: `${BASE_URL}/practice/sessions`,
    completeSession: (sessionId: string) =>
      `${BASE_URL}/practice/sessions/${sessionId}/complete`,
  },
  rankings: `${BASE_URL}/rankings`,
  time: `${BASE_URL}/time`,
  live: {
    current: `${BASE_URL}/live/current`,
    next: `${BASE_URL}/live/next`,
    lastRound: (limit = 10) => `${BASE_URL}/live/last-round?limit=${limit}`,
    round: (roundId: number | string) => `${BASE_URL}/live/rounds/${roundId}`,
    roundSessions: (roundId: number | string) =>
      `${BASE_URL}/live/rounds/${roundId}/sessions`,
    session: (sessionId: string) => ({
      queue: `${BASE_URL}/live/sessions/${sessionId}/queue`,
      seats: `${BASE_URL}/live/sessions/${sessionId}/seats`,
      hold: `${BASE_URL}/live/sessions/${sessionId}/hold`,
      confirm: `${BASE_URL}/live/sessions/${sessionId}/confirm`,
    }),
  },
  admin: {
    liveConfig: `${BASE_URL}/admin/live/config`,
    liveConfigVenue: `${BASE_URL}/admin/live/config/venue`,
    liveConfigSchedule: `${BASE_URL}/admin/live/config/schedule`,
    liveRounds: `${BASE_URL}/admin/live/rounds`,
    liveRoundDetail: (roundId: number | string) =>
      `${BASE_URL}/admin/live/rounds/${roundId}/detail`,
    liveRoundCancel: (roundId: number | string) =>
      `${BASE_URL}/admin/live/rounds/${roundId}/cancel`,
    liveRoundStats: (roundId: number | string) =>
      `${BASE_URL}/admin/live/rounds/${roundId}/stats`,
    liveCronRun: `${BASE_URL}/admin/live/cron/run`,
    eventStats: (eventId: number | string) =>
      `${BASE_URL}/admin/events/${eventId}/stats`,
    gifticons: `${BASE_URL}/admin/gifticons`,
    gifticonsSummary: `${BASE_URL}/admin/gifticons/summary`,
    gifticonDetail: (id: number | string) => `${BASE_URL}/admin/gifticons/${id}`,
  },
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
 * refresh 요청 경합 방어.
 *
 * 배경: BE 가 refresh 로테이션을 적용해서 성공 응답이 새 refreshToken 을 함께 심고
 * 이전 refresh 는 즉시 무효화된다. 따라서 같은 시각에 refresh 를 두 번 던지면
 * 두 번째 요청은 이미 무효화된 이전 refresh 를 쓰다가 401 로 죽고 → forceLogout 유발.
 *
 * 두 층 방어:
 *   1) 같은 탭 안 single-flight: 여러 API 가 병렬로 401 을 받아도 refresh 는 한 번만
 *      실제 fetch 로 나가고, 나머지 요청은 그 promise 결과를 공유한다.
 *   2) 여러 탭 간 배타 실행: navigator.locks 로 'auth-refresh' 이름 락을 잡는다.
 *      락을 가진 탭이 refresh 를 던지고 성공하면 새 쿠키가 브라우저 전역에 심어지므로
 *      다음 탭이 락을 얻는 시점에는 refresh 없이 그대로 원본 요청을 재시도해도 통과.
 *      단, 이 모듈은 성공 여부만 반환해 각 탭이 자기 원본 요청을 재시도한다.
 *      navigator.locks 미지원(Safari <15.4 등) 브라우저는 1단만 동작.
 */
let refreshingPromise: Promise<boolean> | null = null;

async function performRefreshRequest(): Promise<boolean> {
  try {
    const refreshRes = await fetch(ROUTES.auth.refresh, {
      method: "POST",
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    return refreshRes.ok;
  } catch {
    return false;
  }
}

export async function refreshWithLock(): Promise<boolean> {
  if (refreshingPromise) return refreshingPromise;

  const run = async (): Promise<boolean> => {
    if (
      typeof navigator !== "undefined" &&
      "locks" in navigator &&
      navigator.locks?.request
    ) {
      return navigator.locks.request(
        "auth-refresh",
        { mode: "exclusive" },
        performRefreshRequest,
      );
    }
    return performRefreshRequest();
  };

  refreshingPromise = run().finally(() => {
    refreshingPromise = null;
  });
  return refreshingPromise;
}

/**
 * 백엔드 공통 응답 스키마
 *   성공: { success: true,  data:  T, meta?: M }
 *   실패: { success: false, error: { code, message } }
 *
 * apiFetch<T>는 성공 시 `data`(T)만 반환. 페이지네이션 등 meta 가 필요하면 apiFetchWithMeta 사용.
 * 실패 시 항상 ApiError throw. 데이터 없는 성공은 T = null.
 */
type SuccessEnvelope<T, M = unknown> = { success: true; data: T; meta?: M };
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

async function fetchEnvelope<T, M = unknown>(
  url: string,
  { method = "GET", body, headers: extraHeaders, ...rest }: FetchOptions = {},
  _retry = false,
): Promise<SuccessEnvelope<T, M>> {
  const hasBody = body !== undefined;
  const isMutating = method !== "GET";
  // CSRF 심층 방어 (백엔드 확인 완료, 2026-08-28):
  //  1) 인증 쿠키는 SameSite=Strict → cross-site 자동 전송 차단(주 방어, 백엔드 확인됨)
  //  2) body 있는 상태 변경 요청은 Content-Type: application/json을 백엔드가 강제
  //     → <form> 기반 단순요청(GET/POST, form-urlencoded 등)으로는 이 타입을 못 만들어
  //       CSRF <form> 벡터가 걸러짐(실질적 2차 방어, 백엔드 확인됨)
  //  3) X-Requested-With 헤더는 CORS preflight를 강제하는 브라우저 레벨 효과는 있지만
  //     백엔드가 이 헤더 값 자체를 검증하지는 않음 — 부착해도 무해하나 방어로 간주하지 말 것.
  //  4) body가 없는 PATCH/DELETE(예: cancelRound)는 위 2)의 Content-Type 강제 대상이 아니므로
  //     이런 엔드포인트를 늘릴 땐 별도 CSRF 방어(SameSite만으로 충분한지)를 백엔드와 재확인할 것.
  const headers: HeadersInit = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(isMutating ? { "X-Requested-With": "XMLHttpRequest" } : {}),
    ...extraHeaders,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: "include",
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
      ...rest,
    });
  } catch {
    // fetch가 throw하는 경우 = 네트워크 실패 / CORS 차단 / DNS 오류 / 서버 다운.
    // 응답 자체가 없으므로 status를 0으로 두고 명시적 코드로 통일 → caller가 원인 판별 가능.
    throw new ApiError(
      getErrorMessage('NETWORK_ERROR'),
      'NETWORK_ERROR',
      0,
    );
  }

  if (res.ok) {
    const json = (await res.json()) as SuccessEnvelope<T, M> | { success?: unknown };
    if (!json || (json as { success?: unknown }).success !== true) {
      throw new ApiError(
        getErrorMessage('INTERNAL_ERROR'),
        'INVALID_RESPONSE',
        res.status,
      );
    }
    return json as SuccessEnvelope<T, M>;
  }

  const envelope = await readErrorEnvelope(res);
  const code = envelope.error?.code;

  // 401: 세션 관련 코드(AUTH_*)일 때만 자동 로그아웃/refresh 처리.
  // INVALID_CREDENTIALS 같이 "로그인 시도 실패"로 발생한 401은 forceLogout하면
  // 페이지가 통째로 새로고침되면서 에러 메시지가 사라지므로 그냥 throw만 한다.
  //
  // 두 코드 모두 access 미인증 상태(BE 계약):
  //   AUTH_INVALID_TOKEN   — access 만료·서명 오류
  //   AUTH_TOKEN_MISSING   — access 쿠키 자체 소실 (TTL 1h 만료로 브라우저가 지운 흔한 케이스)
  // refresh 쿠키(7일 TTL) 는 별도 관리이므로 어느 쪽이든 refresh 재발급을 먼저 시도해야
  // 관리자 페이지처럼 오래 머무는 화면에서 억울한 로그아웃이 발생하지 않는다.
  const isSessionAuthError =
    code === 'AUTH_INVALID_TOKEN' || code === 'AUTH_TOKEN_MISSING';

  if (res.status === 401 && !_retry && typeof window !== "undefined" && isSessionAuthError) {
    const refreshed = await refreshWithLock();
    if (refreshed) {
      return fetchEnvelope<T, M>(url, { method, body, headers: extraHeaders, ...rest }, true);
    }
    forceLogout();
    throw new ApiError(
      getErrorMessage(code, '세션이 만료되었습니다. 다시 로그인해 주세요.'),
      code,
      401,
    );
  }

  // 5xx는 백엔드 원본 메시지 노출 금지 (내부 정보 유출 방지).
  // 4xx 중 매핑되지 않은 code도 프로덕션에서는 원본 메시지 대신 generic으로 마스킹.
  // 개발 환경에서는 디버깅을 위해 원본 메시지 통과.
  const isDev = process.env.NODE_ENV !== 'production';
  let fallback: string;
  if (res.status >= 500) {
    fallback = getErrorMessage('INTERNAL_ERROR');
  } else if (code && ERROR_MESSAGES_HAS(code)) {
    // 매핑된 코드는 아래 getErrorMessage에서 사용자 문구로 치환됨.
    fallback = envelope.error?.message ?? `요청 실패 (${res.status})`;
  } else {
    // 매핑되지 않은 4xx 코드: 백엔드 스택/제약 메시지가 그대로 노출되지 않도록 마스킹.
    fallback = isDev
      ? (envelope.error?.message ?? `요청 실패 (${res.status})`)
      : `요청을 처리할 수 없습니다 (${res.status})`;
  }
  throw new ApiError(getErrorMessage(code, fallback), code ?? 'UNKNOWN', res.status);
}

export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const json = await fetchEnvelope<T>(url, options);
  return json.data;
}

export async function apiFetchWithMeta<T, M = Record<string, unknown>>(
  url: string,
  options: FetchOptions = {},
): Promise<{ data: T; meta: M | undefined }> {
  const json = await fetchEnvelope<T, M>(url, options);
  return { data: json.data, meta: json.meta };
}

// getErrorMessage와 동일한 내부 맵을 공유할 수 없어(export 안 됨) 별도 검사 함수.
// 코드가 알려진 매핑에 있으면 true를 반환.
function ERROR_MESSAGES_HAS(code: string): boolean {
  return getErrorMessage(code, '__unmapped__') !== '__unmapped__';
}
