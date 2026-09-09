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

/** FE 한글 카테고리 → BE 영문 코드 매핑 (md/API_docs.md §이벤트 목록 조회 참고). */
export const BE_CATEGORY_MAP: Record<EventCategory,
  'concert' | 'musical' | 'sports' | 'theater' | 'festival'> = {
  '콘서트': 'concert',
  '뮤지컬': 'musical',
  '스포츠': 'sports',
  '연극': 'theater',
  '페스티벌': 'festival',
};

export const KR_CATEGORY_MAP: Record<
  'concert' | 'musical' | 'sports' | 'theater' | 'festival',
  EventCategory
> = {
  concert: '콘서트',
  musical: '뮤지컬',
  sports: '스포츠',
  theater: '연극',
  festival: '페스티벌',
};

export const EVENT_TYPES = ['live', 'paid'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// 필드 제한 — 백엔드 스키마와 정렬 필요. 우선 합리적 상한.
export const LIMITS = {
  title:            { min: 1,   max: 80 },
  venueId:          { min: 1,   max: 60 },
  prize:            { min: 1,   max: 120 },
  posterInitial:    { min: 0,   max: 8 },
  totalSeats:       { min: 1,   max: 200_000 },
  // BE 스펙: 이벤트 durationMs 최대 24시간. 폼 UI 아직 없지만 향후 대비.
  durationMs:       { min: 1,   max: 24 * 60 * 60 * 1000 },
  // BE 스펙: 이벤트 취소 사유 최대 500자.
  cancelReason:     { min: 1,   max: 500 },
} as const;

// 오픈 시각 상한: 지금부터 최대 1년.
export const OPENS_AT_MAX_MS_FROM_NOW = 365 * 24 * 60 * 60 * 1000;

/**
 * datetime-local 값(`YYYY-MM-DDTHH:MM`)을 정각으로 스냅.
 * 분·초를 00 으로 강제. 빈 문자열은 그대로 반환.
 */
export function snapOpensAtToHour(v: string): string {
  if (!v) return v;
  // 'YYYY-MM-DDTHH:MM' 또는 'YYYY-MM-DDTHH:MM:SS' 형태.
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}):\d{2}(?::\d{2})?$/.exec(v);
  if (!m) return v;
  return `${m[1]}:00`;
}

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
  title: string;
  category: string;
  /** 등록된 공연장의 venue.id (예: 'kspo-dome-v1'). 비어있으면 미선택. */
  venueId: string;
  opensAt: string;
  totalSeats: string;
  prize: string;
}

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>;

/**
 * 폼 전체 검증. 에러 맵 반환 — 비어 있으면 통과.
 * 관리자 폼은 항상 사전 신청 이벤트를 개설한다 (라이브는 별도 페이지에서 관리).
 * 포스터 이니셜/배경 색상은 공연장 대표 이미지로 대체되어 폼 필드 자체가 사라졌다.
 */
export function validateEventForm(v: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {};

  const title = sanitizeLine(v.title);
  if (title.length < LIMITS.title.min) {
    errors.title = '제목을 입력해 주세요.';
  } else if (title.length > LIMITS.title.max) {
    errors.title = `제목은 ${LIMITS.title.max}자 이하여야 합니다.`;
  }

  if (!isValidCategory(v.category)) {
    errors.category = '유효한 카테고리를 선택해 주세요.';
  }

  const venueId = sanitizeLine(v.venueId);
  if (venueId.length < LIMITS.venueId.min) {
    errors.venueId = '공연장을 선택해 주세요.';
  } else if (venueId.length > LIMITS.venueId.max) {
    errors.venueId = `공연장 식별자는 ${LIMITS.venueId.max}자 이하여야 합니다.`;
  }

  if (!v.opensAt) {
    errors.opensAt = '오픈 시각을 지정해 주세요.';
  } else {
    const d = new Date(v.opensAt);
    const t = d.getTime();
    if (!Number.isFinite(t)) {
      errors.opensAt = '유효한 오픈 시각이 아닙니다.';
    } else if (d.getMinutes() !== 0 || d.getSeconds() !== 0 || d.getMilliseconds() !== 0) {
      errors.opensAt = '오픈 시각은 정각(분·초 00)만 지정할 수 있습니다.';
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

  const prize = sanitizeLine(v.prize);
  if (prize.length < LIMITS.prize.min) {
    errors.prize = '상품 내용을 입력해 주세요.';
  } else if (prize.length > LIMITS.prize.max) {
    errors.prize = `상품 내용은 ${LIMITS.prize.max}자 이하여야 합니다.`;
  }

  return errors;
}

export function hasErrors(errors: EventFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
