export const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_-]+$/;
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 8;
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
  NICKNAME_REQUIRED: "닉네임을 입력해 주세요.",
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
  INTERNAL_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

const DEFAULT_MESSAGE = "요청 처리 중 오류가 발생했습니다.";

export function getErrorMessage(
  code: string | undefined,
  fallback: string = DEFAULT_MESSAGE,
): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallback;
}
