/**
 * 관리자 이벤트 생성/수정 폼 검증.
 * FE 1차 방어 — 백엔드가 최종 권위지만, 프론트에서 잘못된 값이 서버로
 * 전달되는 상황 자체를 차단해 오류 응답을 인라인 UX로 환원한다.
 */

export const EVENT_CATEGORIES = [
  '콘서트',
  '뮤지컬',
  '스포츠',
  '연극',
  '페스티벌',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_TYPES = ['live', 'paid'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// 필드 제한 — 백엔드 스키마와 정렬 필요. 우선 합리적 상한.
export const LIMITS = {
  title:            { min: 1,   max: 80 },
  venue:            { min: 1,   max: 60 },
  prize:            { min: 1,   max: 120 },
  posterInitial:    { min: 0,   max: 8 },
  totalSeats:       { min: 1,   max: 200_000 },
  entryFeePoints:   { min: 0,   max: 100_000 },
  entryFeeTickets:  { min: 0,   max: 100 },
} as const;

// 오픈 시각 상한: 지금부터 최대 1년.
export const OPENS_AT_MAX_MS_FROM_NOW = 365 * 24 * 60 * 60 * 1000;

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
// C0/C1 제어문자 (개행·탭 포함) 제거용.
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g;

export function isHexColor(v: string): boolean {
  return HEX_COLOR_RE.test(v.trim());
}

/** 사용자 입력에서 제어문자를 제거하고 앞뒤 공백 정리. */
export function sanitizeLine(v: string): string {
  return v.replace(CONTROL_CHARS_RE, '').trim();
}

/** 포스터 이니셜 정규화 — 대문자, 제어문자 제거, 길이 캡. */
export function normalizePosterInitial(v: string): string {
  return v
    .replace(CONTROL_CHARS_RE, '')
    .toUpperCase()
    .slice(0, LIMITS.posterInitial.max);
}

/**
 * 정수 파싱 + 범위 검증.
 * NaN·Infinity·소수·음수·범위 밖은 null 반환.
 */
export function parseIntegerInRange(
  raw: string,
  { min, max }: { min: number; max: number },
): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  // 지수 표기(1e5), 소수점, 부호 밖의 문자 모두 거부.
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

export function isValidCategory(v: string): v is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(v);
}

export function isValidEventType(v: string): v is EventType {
  return (EVENT_TYPES as readonly string[]).includes(v);
}

export interface EventFormValues {
  type: EventType;
  title: string;
  category: string;
  venue: string;
  posterColor: string;
  posterInitial: string;
  opensAt: string;
  totalSeats: string;
  entryFeePoints: string;
  entryFeeTickets: string;
  prize: string;
}

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>;

/**
 * 폼 전체 검증. 에러 맵 반환 — 비어 있으면 통과.
 * 유료 타입일 때만 entryFee*/prize 검증.
 */
export function validateEventForm(v: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {};

  if (!isValidEventType(v.type)) {
    errors.type = '유효한 이벤트 타입을 선택해 주세요.';
  }

  const title = sanitizeLine(v.title);
  if (title.length < LIMITS.title.min) {
    errors.title = '제목을 입력해 주세요.';
  } else if (title.length > LIMITS.title.max) {
    errors.title = `제목은 ${LIMITS.title.max}자 이하여야 합니다.`;
  }

  if (!isValidCategory(v.category)) {
    errors.category = '유효한 카테고리를 선택해 주세요.';
  }

  const venue = sanitizeLine(v.venue);
  if (venue.length < LIMITS.venue.min) {
    errors.venue = '공연장을 입력해 주세요.';
  } else if (venue.length > LIMITS.venue.max) {
    errors.venue = `공연장은 ${LIMITS.venue.max}자 이하여야 합니다.`;
  }

  if (!isHexColor(v.posterColor)) {
    errors.posterColor = '배경 색상은 #RRGGBB 형식이어야 합니다.';
  }

  // 포스터 이니셜은 선택 필드 — 값이 있으면 길이만 재확인.
  const initial = normalizePosterInitial(v.posterInitial);
  if (initial.length > LIMITS.posterInitial.max) {
    errors.posterInitial = `이니셜은 ${LIMITS.posterInitial.max}자 이하여야 합니다.`;
  }

  if (!v.opensAt) {
    errors.opensAt = '오픈 시각을 지정해 주세요.';
  } else {
    const t = new Date(v.opensAt).getTime();
    if (!Number.isFinite(t)) {
      errors.opensAt = '유효한 오픈 시각이 아닙니다.';
    } else {
      const now = Date.now();
      if (t < now) {
        errors.opensAt = '오픈 시각은 현재 이후여야 합니다.';
      } else if (t > now + OPENS_AT_MAX_MS_FROM_NOW) {
        errors.opensAt = '오픈 시각은 1년 이내여야 합니다.';
      }
    }
  }

  if (parseIntegerInRange(v.totalSeats, LIMITS.totalSeats) === null) {
    errors.totalSeats = `총 좌석은 ${LIMITS.totalSeats.min}~${LIMITS.totalSeats.max.toLocaleString()} 정수여야 합니다.`;
  }

  if (v.type === 'paid') {
    if (parseIntegerInRange(v.entryFeePoints, LIMITS.entryFeePoints) === null) {
      errors.entryFeePoints = `참여비(포인트)는 ${LIMITS.entryFeePoints.min}~${LIMITS.entryFeePoints.max.toLocaleString()} 정수여야 합니다.`;
    }
    if (parseIntegerInRange(v.entryFeeTickets, LIMITS.entryFeeTickets) === null) {
      errors.entryFeeTickets = `참여비(티켓)는 ${LIMITS.entryFeeTickets.min}~${LIMITS.entryFeeTickets.max} 정수여야 합니다.`;
    }
    const prize = sanitizeLine(v.prize);
    if (prize.length < LIMITS.prize.min) {
      errors.prize = '상품 내용을 입력해 주세요.';
    } else if (prize.length > LIMITS.prize.max) {
      errors.prize = `상품 내용은 ${LIMITS.prize.max}자 이하여야 합니다.`;
    }
  }

  return errors;
}

export function hasErrors(errors: EventFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
