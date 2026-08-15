import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   블루스퀘어 대극장 (구 신한카드홀 → 우리은행홀) — 프로시니엄 뮤지컬 전용
   무대: 상단 정면 엔드스테이지 (프로시니엄 아치). 상시 오케스트라 피트.
   층 구조:
     - 1층 오케스트라 (9구역): VIP 중앙 앞·중간 + R 사이드/뒷열
     - 2층 발코니 (6구역): 앞열 중앙 R + 나머지 S
     - 3층 발코니 (8구역): 앞열 S + 사이드·뒷열 A
   총 수용(표시용): 1,767석 (1층 1,067 + 2층 430 + 3층 270)
   시야제한 참고: 3층 1~3열(안전바), 1층 사이드 끝열, 2·3층 최측면 (사이트라인 감안 tier 낮춤).

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일.
   ───────────────────────────────────────────────────────── */

const VIEW = { w: 900, h: 940 };

// ─── 좌석 그리드 규격 ───
// 각 seated 구역 5열 × 6석 = 30석. seated 23구역 × 라이브 30석 = 690개 (백엔드 2000 상한 이내).
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_BLUESQUARE = ROWS_PER_ZONE * SEATS_PER_ROW;

/** 사각형 zone SVG path 헬퍼. */
function rect(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/* ─────────────────────────────────────────────────────────
   1층 오케스트라 (y: 260 ~ 480, 3행 × 3열 = 9구역)
   중앙 앞·중간 = VIP, 나머지 = R (사이드 뒷열 포함).
   ───────────────────────────────────────────────────────── */
const F1_Y_ROW = [260, 335, 410];  // 앞·중·뒷 3행
const F1_H = 65;
const F1_COL_X = [200, 355, 555];  // 좌·중·우 3열
const F1_W_SIDE = 145;
const F1_W_CENTER = 190;

function f1Zone(id: string, row: number, col: number, tier: string): Zone {
  const x = F1_COL_X[col];
  const w = col === 1 ? F1_W_CENTER : F1_W_SIDE;
  const y = F1_Y_ROW[row];
  return {
    id,
    name: id,
    tier,
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(x, y, w, F1_H),
    labelPos: { x: x + w / 2, y: y + F1_H / 2 },
    seatRows: zoneSeatRows(),
  };
}

const FLOOR1_ZONES: Zone[] = [
  // 앞열 (row 0): VIP 중앙, R 좌·우
  f1Zone('R-앞L', 0, 0, 'r'),
  f1Zone('VIP-앞', 0, 1, 'vip'),
  f1Zone('R-앞R', 0, 2, 'r'),
  // 중간열 (row 1): VIP 중앙, R 좌·우
  f1Zone('R-중L', 1, 0, 'r'),
  f1Zone('VIP-중', 1, 1, 'vip'),
  f1Zone('R-중R', 1, 2, 'r'),
  // 뒷열 (row 2): 전체 R
  f1Zone('R-뒤L', 2, 0, 'r'),
  f1Zone('R-뒤C', 2, 1, 'r'),
  f1Zone('R-뒤R', 2, 2, 'r'),
];

/* ─────────────────────────────────────────────────────────
   2층 발코니 (y: 525 ~ 660, 2행 × 3열 = 6구역)
   1층보다 살짝 넓게(발코니 확장) 배치.
   앞열 중앙 = R, 나머지 = S.
   ───────────────────────────────────────────────────────── */
const F2_Y_ROW = [525, 605];
const F2_H = 70;
const F2_COL_X = [165, 340, 570];
const F2_W_SIDE = 165;
const F2_W_CENTER = 220;

function f2Zone(id: string, row: number, col: number, tier: string): Zone {
  const x = F2_COL_X[col];
  const w = col === 1 ? F2_W_CENTER : F2_W_SIDE;
  const y = F2_Y_ROW[row];
  return {
    id,
    name: id,
    tier,
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(x, y, w, F2_H),
    labelPos: { x: x + w / 2, y: y + F2_H / 2 },
    seatRows: zoneSeatRows(),
  };
}

const FLOOR2_ZONES: Zone[] = [
  // 앞열: S 좌 · R 중앙 · S 우
  f2Zone('2-S-앞L', 0, 0, 's'),
  f2Zone('2-R-앞', 0, 1, 'r'),
  f2Zone('2-S-앞R', 0, 2, 's'),
  // 뒷열: 전 구역 S
  f2Zone('2-S-뒤L', 1, 0, 's'),
  f2Zone('2-S-뒤C', 1, 1, 's'),
  f2Zone('2-S-뒤R', 1, 2, 's'),
];

/* ─────────────────────────────────────────────────────────
   3층 발코니 (y: 705 ~ 855, 2행 × 3열 + 좌우 최측면 = 8구역)
   2층보다 더 넓게(3층 발코니 최대 폭).
   앞열 = S, 뒷열 및 사이드 최측면 = A (시야제한 감안).
   ───────────────────────────────────────────────────────── */
const F3_Y_ROW = [705, 790];
const F3_H = 75;
const F3_COL_X = [175, 335, 585];
const F3_W_SIDE = 150;
const F3_W_CENTER = 240;

function f3Zone(id: string, row: number, col: number, tier: string): Zone {
  const x = F3_COL_X[col];
  const w = col === 1 ? F3_W_CENTER : F3_W_SIDE;
  const y = F3_Y_ROW[row];
  return {
    id,
    name: id,
    tier,
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(x, y, w, F3_H),
    labelPos: { x: x + w / 2, y: y + F3_H / 2 },
    seatRows: zoneSeatRows(),
  };
}

/** 최측면 세로 스트립 zone (3층 좌·우 벽면 A석). */
function f3SideZone(id: string, x: number): Zone {
  const y = F3_Y_ROW[0];
  const h = F3_Y_ROW[1] + F3_H - F3_Y_ROW[0];
  const w = 70;
  return {
    id,
    name: id,
    tier: 'a',
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(x, y, w, h),
    labelPos: { x: x + w / 2, y: y + h / 2 },
    seatRows: zoneSeatRows(),
  };
}

const FLOOR3_ZONES: Zone[] = [
  // 앞열: 전 구역 S
  f3Zone('3-S-앞L', 0, 0, 's'),
  f3Zone('3-S-앞C', 0, 1, 's'),
  f3Zone('3-S-앞R', 0, 2, 's'),
  // 뒷열: 전 구역 A
  f3Zone('3-A-뒤L', 1, 0, 'a'),
  f3Zone('3-A-뒤C', 1, 1, 'a'),
  f3Zone('3-A-뒤R', 1, 2, 'a'),
  // 최측면 벽면
  f3SideZone('3-A-측L', 90),
  f3SideZone('3-A-측R', 740),
];

export const BLUESQUARE_MAIN: VenueConfig = {
  id: 'bluesquare-main-v1',
  name: '블루스퀘어 대극장',
  tiers: {
    vip: { label: 'VIP',  price: 200000, color: '#B91C1C', bg: '#FEE2E2' },
    r:   { label: 'R석',  price: 165000, color: '#7C3AED', bg: '#EDE9FE' },
    s:   { label: 'S석',  price: 130000, color: '#0EA5E9', bg: '#E0F2FE' },
    a:   { label: 'A석',  price: 90000,  color: '#64748B', bg: '#E2E8F0' },
  },
  zones: [
    ...FLOOR1_ZONES,
    ...FLOOR2_ZONES,
    ...FLOOR3_ZONES,
  ],
  mapGrid: [], // proscenium layout은 SVG로 렌더, mapGrid 미사용
  layout: 'proscenium',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
};
