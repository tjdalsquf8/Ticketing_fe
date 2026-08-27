export const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_-]+$/;
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 15;
export const NICKNAME_CHANGE_COOLDOWN_MS = 60 * 60 * 1000; // 1시간

export function validateNickname(value: string): string | null {
  const v = value.trim();
  if (v.length < NICKNAME_MIN) return `${NICKNAME_MIN}자 이상 입력해 주세요.`;
  if (v.length > NICKNAME_MAX) return `${NICKNAME_MAX}자 이하로 입력해 주세요.`;
  if (!NICKNAME_REGEX.test(v))
    return "한글, 영문, 숫자, - _ 만 사용할 수 있습니다.";
  return null;
}

export function formatCooldownRemaining(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${totalMin}분`;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "입력값을 다시 확인해 주세요.",
  EMAIL_EXISTS: "이미 사용 중인 이메일입니다.",
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
  AUTH_TOKEN_MISSING: "로그인이 필요합니다.",
  AUTH_INVALID_TOKEN: "세션이 만료되었습니다. 다시 로그인해 주세요.",
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다.",
  GUEST_UUID_REQUIRED:
    "게스트 인증 정보가 필요합니다. 페이지를 새로고침해 주세요.",
  GUEST_UUID_MISSING:
    "세션이 만료되었습니다. 다시 시작해 주세요.",
  GUEST_NOT_FOUND: "게스트 정보를 찾을 수 없습니다.",
  GUEST_NOT_AUTHENTICATED: "게스트 세션을 먼저 시작해 주세요.",
  NICKNAME_REQUIRED: "닉네임을 입력해 주세요.",
  NICKNAME_CHANGE_TOO_SOON: "닉네임은 1시간에 한 번만 변경할 수 있습니다. 잠시 후 다시 시도해 주세요.",
  SESSION_NOT_FOUND: "세션을 찾을 수 없습니다.",
  SESSION_ALREADY_COMPLETED: "이미 완료된 세션입니다.",
  SESSION_FORBIDDEN: "본인의 세션이 아닙니다.",
  INVALID_PERIOD: "조회 기간이 올바르지 않습니다.",
  UNSUPPORTED_MEDIA_TYPE: "요청 형식이 올바르지 않습니다.",
  TOO_MANY_LOGIN_ATTEMPTS:
    "로그인 시도가 많습니다. 15분 후 다시 시도해 주세요.",
  TOO_MANY_REGISTER_ATTEMPTS:
    "회원가입 시도가 많습니다. 1시간 후 다시 시도해 주세요.",
  TOO_MANY_REFRESH_ATTEMPTS:
    "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  TOO_MANY_REQUESTS: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  NETWORK_ERROR: "서버에 연결할 수 없습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.",
  NOT_ADMIN: "관리자 권한이 필요합니다.",
  FORBIDDEN: "접근 권한이 없습니다.",
  ROUND_NOT_FOUND: "해당 회차를 찾을 수 없습니다.",
  ROUND_NOT_CANCELLABLE: "오픈 예정 상태의 회차만 취소할 수 있습니다.",
  ROUND_NOT_OPEN: "지금은 티켓팅 시간이 아닙니다.",
  ROUND_ALREADY_CLOSED: "이미 종료된 회차입니다.",
  QUEUE_NOT_READY: "아직 대기열 통과 전입니다. 잠시만 기다려 주세요.",
  NOT_ACTIVE: "세션이 아직 활성화되지 않았습니다.",
  SEAT_UNAVAILABLE: "선택한 좌석은 이미 다른 사람이 선점했습니다. 다른 좌석을 골라 주세요.",
  SEAT_NOT_FOUND: "선택한 좌석을 찾을 수 없습니다.",
  HOLD_NOT_FOUND: "선점 정보를 찾을 수 없습니다. 다시 좌석을 선택해 주세요.",
  HOLD_EXPIRED: "좌석 선점 시간이 만료됐습니다. 다시 선택해 주세요.",
  LIVE_CONFIG_NOT_INITIALIZED: "공연 배치가 먼저 세팅되어야 합니다.",
  TICKET_NOT_FOUND: "티켓을 찾을 수 없습니다.",
  TICKET_FORBIDDEN: "본인 티켓만 조회할 수 있습니다.",
  TOO_MANY_LIVE_REQUESTS: "요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.",
  TOO_MANY_ADMIN_REQUESTS: "관리자 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  INTERNAL_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  // 이벤트 도메인
  EVENT_NOT_FOUND: "해당 이벤트를 찾을 수 없습니다.",
  EVENT_NOT_OPEN: "지금은 이 이벤트가 열리지 않았습니다.",
  EVENT_ALREADY_STARTED: "이미 오픈된 이벤트는 이 항목을 변경할 수 없습니다.",
  EVENT_ALREADY_CLOSED: "이미 종료된 이벤트입니다.",
  EVENT_CANCEL_FORBIDDEN: "취소된 이벤트는 다시 변경할 수 없습니다.",
  EVENT_TIME_CONFLICT: "같은 공연장에 시간이 겹치는 이벤트가 이미 있습니다.",
  NOT_REGISTERED: "이벤트 신청자만 참여할 수 있습니다.",
  ALREADY_REGISTERED: "이미 신청한 이벤트입니다.",
  REGISTRATION_CLOSED: "신청이 마감되었습니다.",
  REGISTRATION_NOT_FOUND: "신청 내역을 찾을 수 없습니다.",
  CANCEL_NOT_ALLOWED: "오픈 이후에는 신청을 취소할 수 없습니다.",
  INSUFFICIENT_POINTS: "포인트가 부족합니다.",
  RECURRENCE_INVALID: "반복 설정이 올바르지 않습니다.",
  VENUE_NOT_FOUND: "해당 공연장을 찾을 수 없습니다.",
  INVALID_SEAT_LABEL: "좌석 라벨 형식이 올바르지 않습니다.",
  SEAT_ALREADY_HELD: "다른 사용자가 이미 선점 중인 좌석입니다.",
  SEAT_ALREADY_CONFIRMED: "이미 확정된 좌석입니다.",
  // 이벤트 rate limit — BE 스펙:
  //   TOO_MANY_EVENT_REQUESTS (공개 조회, IP 1분 60)
  //   TOO_MANY_EVENT_ACTIONS (신청/취소/세션시작, 유저 1분 10)
  //   TOO_MANY_EVENT_SESSION_REQUESTS (큐/좌석/hold/confirm, 유저 1분 60)
  TOO_MANY_EVENT_REQUESTS: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  TOO_MANY_EVENT_ACTIONS:
    "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
  TOO_MANY_EVENT_SESSION_REQUESTS:
    "요청이 너무 빠릅니다. 잠시 기다린 뒤 다시 시도해 주세요.",
};

/** 이벤트 rate-limit 계열 코드인지. 폴링 훅이 중단·유도 판정에 사용. */
export function isEventRateLimitCode(code: string | undefined): boolean {
  return (
    code === "TOO_MANY_EVENT_REQUESTS" ||
    code === "TOO_MANY_EVENT_ACTIONS" ||
    code === "TOO_MANY_EVENT_SESSION_REQUESTS"
  );
}

const DEFAULT_MESSAGE = "요청 처리 중 오류가 발생했습니다.";

export function getErrorMessage(
  code: string | undefined,
  fallback: string = DEFAULT_MESSAGE,
): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallback;
}
