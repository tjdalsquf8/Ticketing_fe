/* ──────────────────────────────────────────
   mockEvents — 백엔드 연동 전 임시 이벤트 레지스트리
   ─ 실제로는 GET /events/:id 응답으로 대체될 데이터
   ─ opens_at은 데모 편의를 위해 동적으로 계산 (다음 정각·오늘 특정 시각)
   ────────────────────────────────────────── */

export type EventType = 'live' | 'paid';
export type EventStatus = 'scheduled' | 'open' | 'closed';

/** 모든 이벤트는 오픈 후 5분간 진행 (공통 라이프사이클) */
export const EVENT_DURATION_MS = 5 * 60 * 1000;

export interface MockEvent {
  id: string;
  type: EventType;
  category: string;
  title: string;
  venue: string;
  posterColor: string;
  posterInitial: string;
  totalSeats: number;
  /** paid 전용 */
  entryFeePoints?: number;
  entryFeeTickets?: number;
  prize?: string;
  /** opens_at 계산 (호출 시점의 다음 정각·오늘 특정 시각 등) */
  opensAtFn: () => Date;
}

// ── opensAt 계산 헬퍼 ─────────────────────────────────

/** 다음 정각 (매시 정각 자동 오픈용) */
function nextHour(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

/** 오늘 특정 시각. 이미 지났으면 내일로 이동 */
function todayAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

/** 데모용: 호출 시점 + 30초 뒤 오픈 (데모 URL로 즉시 티켓팅 진입 시험) */
function in30Seconds(): Date {
  return new Date(Date.now() + 30 * 1000);
}

// ── 레지스트리 ─────────────────────────────────────────

export const MOCK_EVENTS: Record<string, MockEvent> = {
  // 매시간 라이브 (다음 정각 오픈)
  'live-current': {
    id: 'live-current',
    type: 'live',
    category: '콘서트',
    title: '싸이 홈빽쇼 SUMMERSWAG 2026 - 서울',
    venue: '잠실종합운동장 주경기장',
    posterColor: '#1E3A8A',
    posterInitial: 'PSY',
    totalSeats: 3000,
    opensAtFn: nextHour,
  },
  // KSPO돔 라이브 (매시 정각 오픈) — 실제 좌석 배치는 src/data/live/kspoDome.ts 참조
  'kspo-dome-1': {
    id: 'kspo-dome-1',
    type: 'live',
    category: '콘서트',
    title: '2026 K-POP GRAND CONCERT — KSPO돔',
    venue: 'KSPO돔 (올림픽공원 체조경기장)',
    posterColor: '#7C3AED',
    posterInitial: 'KSPO',
    totalSeats: 14594,
    opensAtFn: nextHour,
  },
  // 고척스카이돔 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/gocheokSkydome.ts
  'gocheok-1': {
    id: 'gocheok-1',
    type: 'live',
    category: '콘서트',
    title: '2026 SUMMER SONIC — 고척스카이돔',
    venue: '고척스카이돔',
    posterColor: '#0891B2',
    posterInitial: 'GOC',
    totalSeats: 25000,
    opensAtFn: nextHour,
  },
  // 잠실 야구장 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/jamsilBaseball.ts
  'jamsil-baseball-1': {
    id: 'jamsil-baseball-1',
    type: 'live',
    category: '콘서트',
    title: '2026 SEOUL SUMMER LIVE — 잠실 야구장',
    venue: '잠실 야구장',
    posterColor: '#C82028',
    posterInitial: 'JMS',
    totalSeats: 30000,
    opensAtFn: nextHour,
  },
  // 인천 SSG랜더스필드 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/ssgLanders.ts
  'ssg-landers-1': {
    id: 'ssg-landers-1',
    type: 'live',
    category: '콘서트',
    title: '2026 INCHEON WAVE FESTIVAL — SSG랜더스필드',
    venue: '인천 SSG랜더스필드',
    posterColor: '#1E3A8A',
    posterInitial: 'SSG',
    totalSeats: 25000,
    opensAtFn: nextHour,
  },
  // 인스파이어 아레나 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/inspireArena.ts
  'inspire-arena-1': {
    id: 'inspire-arena-1',
    type: 'live',
    category: '콘서트',
    title: '2026 GLOBAL K-POP AWARDS — 인스파이어 아레나',
    venue: '인스파이어 아레나',
    posterColor: '#DC2626',
    posterInitial: 'INS',
    totalSeats: 7143,
    opensAtFn: nextHour,
  },
  // 잠실 종합운동장 주경기장 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/jamsilOlympicMain.ts
  'jamsil-olympic-1': {
    id: 'jamsil-olympic-1',
    type: 'live',
    category: '콘서트',
    title: '2026 WORLD TOUR FINAL — 잠실 주경기장',
    venue: '잠실 종합운동장 주경기장',
    posterColor: '#B91C1C',
    posterInitial: 'JOS',
    totalSeats: 45000,
    opensAtFn: nextHour,
  },
  // 블루스퀘어 대극장 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/bluesquare.ts
  'bluesquare-1': {
    id: 'bluesquare-1',
    type: 'live',
    category: '뮤지컬',
    title: '뮤지컬 팬텀 오브 디 오페라 — 블루스퀘어',
    venue: '블루스퀘어 대극장',
    posterColor: '#7C3AED',
    posterInitial: 'BSQ',
    totalSeats: 1767,
    opensAtFn: nextHour,
  },
  // 세종문화회관 대극장 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/sejongGrand.ts
  'sejong-grand-1': {
    id: 'sejong-grand-1',
    type: 'live',
    category: '콘서트',
    title: '2026 세종 크로스오버 콘서트 — 세종문화회관',
    venue: '세종문화회관 대극장',
    posterColor: '#B91C1C',
    posterInitial: '세종',
    totalSeats: 3022,
    opensAtFn: nextHour,
  },
  'sejong-grand-demo': {
    id: 'sejong-grand-demo',
    type: 'live',
    category: '콘서트',
    title: '[DEMO] 2026 세종 크로스오버 콘서트 — 세종문화회관',
    venue: '세종문화회관 대극장',
    posterColor: '#B91C1C',
    posterInitial: '세종',
    totalSeats: 3022,
    opensAtFn: in30Seconds,
  },
  // YES24 라이브홀 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/yes24LiveHall.ts
  'yes24-livehall-1': {
    id: 'yes24-livehall-1',
    type: 'live',
    category: '콘서트',
    title: '인디밴드 페스티벌 — YES24 라이브홀',
    venue: 'YES24 라이브홀',
    posterColor: '#0EA5E9',
    posterInitial: 'Y24',
    totalSeats: 1051,
    opensAtFn: nextHour,
  },
  'yes24-livehall-demo': {
    id: 'yes24-livehall-demo',
    type: 'live',
    category: '콘서트',
    title: '[DEMO] 인디밴드 페스티벌 — YES24 라이브홀',
    venue: 'YES24 라이브홀',
    posterColor: '#0EA5E9',
    posterInitial: 'Y24',
    totalSeats: 1051,
    opensAtFn: in30Seconds,
  },
  // 한강 페스티벌 필드 라이브 (매시 정각 오픈) — 좌석 배치는 src/data/live/hangangFestival.ts
  'hangang-festival-1': {
    id: 'hangang-festival-1',
    type: 'live',
    category: '페스티벌',
    title: '2026 SEOUL RIVER FEST — 한강 페스티벌',
    venue: '한강 페스티벌 필드',
    posterColor: '#15803D',
    posterInitial: 'HGF',
    totalSeats: 20000,
    opensAtFn: nextHour,
  },
  'hangang-festival-demo': {
    id: 'hangang-festival-demo',
    type: 'live',
    category: '페스티벌',
    title: '[DEMO] 2026 SEOUL RIVER FEST — 한강 페스티벌',
    venue: '한강 페스티벌 필드',
    posterColor: '#15803D',
    posterInitial: 'HGF',
    totalSeats: 20000,
    opensAtFn: in30Seconds,
  },
  // 유료 이벤트 (오늘 밤 20:00)
  'p001': {
    id: 'p001',
    type: 'paid',
    category: '콘서트',
    title: '아이유 The Golden Hour 앙코르',
    venue: '고척스카이돔',
    posterColor: '#DB2777',
    posterInitial: 'IU',
    totalSeats: 8000,
    entryFeePoints: 500,
    entryFeeTickets: 5,
    prize: '스타벅스 30,000원 상품권 × TOP 3',
    opensAtFn: () => todayAt(20, 0),
  },
  'p002': {
    id: 'p002',
    type: 'paid',
    category: '뮤지컬',
    title: '뮤지컬 하데스타운 내한공연',
    venue: '블루스퀘어 신한카드홀',
    posterColor: '#9A3412',
    posterInitial: 'HDS',
    totalSeats: 1500,
    entryFeePoints: 500,
    entryFeeTickets: 5,
    prize: '올리브영 20,000원 상품권 × TOP 3',
    opensAtFn: () => todayAt(21, 0),
  },
};

/** id로 이벤트 조회. 없으면 기본(live-current) 반환 (mock 편의). */
export function getMockEvent(id: string): MockEvent {
  return MOCK_EVENTS[id] ?? MOCK_EVENTS['live-current'];
}

// ── 라이프사이클 판정 ─────────────────────────────────

export function getEventStatus(opensAt: Date, now: Date = new Date()): EventStatus {
  const opensMs = opensAt.getTime();
  const closesMs = opensMs + EVENT_DURATION_MS;
  const nowMs = now.getTime();
  if (nowMs < opensMs) return 'scheduled';
  if (nowMs < closesMs) return 'open';
  return 'closed';
}

/** 종료 시각 */
export function getEventClosesAt(opensAt: Date): Date {
  return new Date(opensAt.getTime() + EVENT_DURATION_MS);
}
