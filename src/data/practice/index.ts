import type { VenueConfig } from '@/types/ticketing';
import { CONCERT_HALL } from './concertHall';

// 포스터 이미지: public/Img/practice/ 하위

export interface PracticeEvent {
  id: string;
  eventId: number;     // 백엔드 eventId (랭킹/세션 API 파라미터)
  title: string;
  venueName: string;
  period: string;
  posterBg: string;
  posterAccent: string;
  posterImage: string;
  sessions: { label: string; time: string }[];
  venue: VenueConfig;
  /**
   * 라이브 미리보기 모드에서만 사용.
   * 지정 시 이 라벨 집합에 속한 좌석만 "선택 가능"으로 그리고,
   * 나머지 좌석은 "미오픈"으로 표시 (실 라이브 회차 UX 재현).
   */
  liveSeatLabels?: string[];
}

/* ── 이벤트 2: 소규모 클럽 ── */
const CLUB_STAGE: VenueConfig = {
  id: 'club-stage-v1',
  name: '홍대 클럽 스테이지',
  tiers: {
    standard: { label: '전석', price: 0, color: '#16A34A', bg: '#F0FDF4' },
  },
  zones: [
    {
      id: 'A', name: 'A', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 10 },
        { label: '2', seatCount: 10 },
        { label: '3', seatCount: 10 },
      ],
    },
    {
      id: 'B', name: 'B', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 10 },
        { label: '2', seatCount: 10 },
        { label: '3', seatCount: 10 },
      ],
    },
    {
      id: 'C', name: 'C', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 8 },
        { label: '2', seatCount: 8 },
        { label: '3', seatCount: 8 },
      ],
    },
    {
      id: 'D', name: 'D', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 8 },
        { label: '2', seatCount: 8 },
        { label: '3', seatCount: 8 },
      ],
    },
  ],
  mapGrid: [
    [
      { type: 'label', text: '2F' },
      { type: 'stage', colSpan: 2 },
      { type: 'label', text: '2F' },
    ],
    [
      { type: 'empty' },
      { type: 'zone', zoneId: 'A' },
      { type: 'zone', zoneId: 'B' },
      { type: 'empty' },
    ],
    [
      { type: 'empty' },
      { type: 'zone', zoneId: 'C' },
      { type: 'zone', zoneId: 'D' },
      { type: 'empty' },
    ],
    [
      { type: 'empty' },
      { type: 'label', text: 'FLOOR', colSpan: 2 },
      { type: 'empty' },
    ],
  ],
};

/* ── 이벤트 3: 실내 아레나 (스탠딩 블록 + 2층 지정석) ── */
// 참고: 잠실 실내체육관형. 각 블록(101~106, 201~206, 301~304, 401~404, 001~011)은
// 개별 클릭 가능 zone. 클릭하면 그 블록의 개별 좌석 그리드로 진입.
// 스탠딩 블록도 seated로 모델링해 "실제 좌석표" UX 제공.
const stdRows = (rowCount: number, seatCount: number) =>
  Array.from({ length: rowCount }, (_, i) => ({
    label: String(i + 1),
    seatCount,
  }));

const makeStandingBlock = (id: string, tier: string) => ({
  id,
  name: id,           // 블록 번호 자체를 이름으로 (예: '101')
  tier,
  type: 'seated' as const,
  seatRows: stdRows(5, 10),  // 각 블록 5열 × 10석 = 50석
});

const make2FBlock = (num: number) => ({
  id: `2F-${String(num).padStart(2, '0')}`,
  name: `${num}구역`,
  tier: 's2f',
  type: 'seated' as const,
  seatRows: stdRows(3, 8),   // 각 2층 구역 3열 × 8석 = 24석
});

const ARENA: VenueConfig = {
  id: 'arena-v1',
  name: '잠실 실내체육관',
  tiers: {
    stdAB: { label: 'Standing A & B', price: 132000, color: '#9333EA', bg: '#F3E8FF' },
    stdCD: { label: 'Standing C & D', price: 110000, color: '#16A34A', bg: '#DCFCE7' },
    s2f:   { label: '2층 S석',        price: 110000, color: '#2563EB', bg: '#DBEAFE' },
  },
  zones: [
    // Standing A: 101~106
    ...[101, 102, 103, 104, 105, 106].map((n) => makeStandingBlock(String(n), 'stdAB')),
    // Standing B: 201~206
    ...[201, 202, 203, 204, 205, 206].map((n) => makeStandingBlock(String(n), 'stdAB')),
    // Standing C: 301~304
    ...[301, 302, 303, 304].map((n) => makeStandingBlock(String(n), 'stdCD')),
    // Standing D: 401~404
    ...[401, 402, 403, 404].map((n) => makeStandingBlock(String(n), 'stdCD')),
    // 2층 1구역~11구역
    ...Array.from({ length: 11 }, (_, i) => make2FBlock(i + 1)),
  ],
  layout: 'auditorium',
  mapGrid: [], // StadiumMap이 zone id 기반으로 커스텀 렌더하므로 미사용
};

const BASE_PRACTICE_EVENTS: PracticeEvent[] = [
  {
    id: 'hall-a',
    eventId: 1,
    title: '[연습] 티켓팅 마스터 클래스 - 서울',
    venueName: '프랫티켓홀',
    period: '2026.08.01 ~ 2026.08.31',
    posterBg: '#0B1628',
    posterAccent: '#3B6BCC',
    posterImage: '/Img/practice/1.png',
    sessions: [
      { label: '1회 18:00', time: '18시 00분' },
      { label: '2회 21:00', time: '21시 00분' },
    ],
    venue: CONCERT_HALL,
  },
  {
    id: 'club-b',
    eventId: 2,
    title: '[연습] 인디 뮤직 페스티벌 - 홍대',
    venueName: '홍대 클럽 스테이지',
    period: '2026.08.05 ~ 2026.08.10',
    posterBg: '#0A1A12',
    posterAccent: '#2D7A4F',
    posterImage: '/Img/practice/2.png',
    sessions: [
      { label: '1회 20:00', time: '20시 00분' },
    ],
    venue: CLUB_STAGE,
  },
  {
    id: 'arena-c',
    eventId: 3,
    title: '[연습] 서머 팝 콘서트 - 잠실',
    venueName: '잠실 실내체육관',
    period: '2026.08.15 ~ 2026.08.16',
    posterBg: '#180A04',
    posterAccent: '#C14B1A',
    posterImage: '/Img/practice/3.png',
    sessions: [
      { label: '1회 17:00', time: '17시 00분' },
      { label: '2회 20:00', time: '20시 00분' },
    ],
    venue: ARENA,
  },
];

// 연습 모드는 자체 정의 3종(BASE_PRACTICE_EVENTS)만 노출.
// 라이브 공연(LIVE_EVENTS)은 실 라이브 페이지 전용으로 분리 — 연습 리스트에 자동 편입 안 함.
export const PRACTICE_EVENTS: PracticeEvent[] = [
  ...BASE_PRACTICE_EVENTS,
];
