import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   세종문화회관 대극장 (Sejong Center — Grand Theater)
   광화문 소재 서울 대표 종합공연장. 프로시니엄 엔드스테이지 대형 극장.
   무대: 상단 정면 프로시니엄. 오케스트라 피트 상시 운용.
   층 구조 (판매 가능 3,022석 기준, mock 배치는 4단 발코니로 근사):
     - 1층 오케스트라 (9구역): VIP 중앙 앞·중간 + R 사이드/뒷열
     - 2층 발코니 (7구역): 앞열 R 중앙 · 사이드 S · 좌우 박스 A
     - 3층 발코니 (7구역): 앞열 S · 뒷열 A · 좌우 박스 B
     - 4층 발코니 (7구역): 앞열 B · 뒷열 C · 좌우 박스 D (박스 대부분 시야제한)
   총 표시 수용: 3,022석 (실 좌석 배치 대표 세팅)
   시야제한 참고: 상층 박스석 대부분 비판매, 자막기 시야제한석, 통로석 안전바 간섭.

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일.
   프로시니엄 컴포넌트로 렌더(폭·박스 배치는 대극장 특성에 맞춰 조정).
   ───────────────────────────────────────────────────────── */

const VIEW = { w: 900, h: 1010 };

// ─── 좌석 그리드 규격 ───
// 각 seated 구역 5열 × 6석 = 30석. seated 30구역 × 라이브 30석 = 900개 (백엔드 2000 상한 이내).
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_SEJONG_GRAND = ROWS_PER_ZONE * SEATS_PER_ROW;

/** 사각형 zone SVG path 헬퍼. */
function rect(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/* ─────────────────────────────────────────────────────────
   1층 오케스트라 (y: 260 ~ 480, 3행 × 3열 = 9구역)
   호스슈 형태이지만 컴포넌트가 프로시니엄 재사용이므로 사각 그리드로 근사.
   중앙 앞·중간 = VIP, 나머지 = R.
   ───────────────────────────────────────────────────────── */
const F1_Y_ROW = [260, 335, 410];
const F1_H = 65;
const F1_COL_X = [200, 355, 555];
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
  // 앞열: R 좌 · VIP 중앙 · R 우
  f1Zone('R-1L앞', 0, 0, 'r'),
  f1Zone('VIP-1앞', 0, 1, 'vip'),
  f1Zone('R-1R앞', 0, 2, 'r'),
  // 중간열: R 좌 · VIP 중앙 · R 우
  f1Zone('R-1L중', 1, 0, 'r'),
  f1Zone('VIP-1중', 1, 1, 'vip'),
  f1Zone('R-1R중', 1, 2, 'r'),
  // 뒷열: 전체 R
  f1Zone('R-1L뒤', 2, 0, 'r'),
  f1Zone('R-1C뒤', 2, 1, 'r'),
  f1Zone('R-1R뒤', 2, 2, 'r'),
];

/* ─────────────────────────────────────────────────────────
   2층 발코니 (y: 525 ~ 660, 2행 × 3열 + 좌우 박스 2 = 7구역)
   앞열 중앙 = R, 앞열 사이드 · 뒷열 = S, 좌우 박스 = A.
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

/** 최측면 세로 스트립 박스석 (호스슈 좌·우 벽면). */
function fBox(id: string, tier: string, yTop: number, yBottom: number, x: number): Zone {
  const y = yTop;
  const h = yBottom - yTop;
  const w = 70;
  return {
    id,
    name: id,
    tier,
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(x, y, w, h),
    labelPos: { x: x + w / 2, y: y + h / 2 },
    seatRows: zoneSeatRows(),
  };
}

const FLOOR2_ZONES: Zone[] = [
  // 앞열: S 좌 · R 중앙 · S 우
  f2Zone('S-2L앞', 0, 0, 's'),
  f2Zone('R-2앞', 0, 1, 'r'),
  f2Zone('S-2R앞', 0, 2, 's'),
  // 뒷열: 전 구역 S 중앙만 R 유지 안함, 전체 S 통일
  f2Zone('S-2L뒤', 1, 0, 's'),
  f2Zone('S-2C뒤', 1, 1, 's'),
  f2Zone('S-2R뒤', 1, 2, 's'),
  // 좌·우 박스 A (2층 사이드 벽)
  fBox('A-2박스L', 'a', F2_Y_ROW[0], F2_Y_ROW[1] + F2_H, 90),
  fBox('A-2박스R', 'a', F2_Y_ROW[0], F2_Y_ROW[1] + F2_H, 740),
];

/* ─────────────────────────────────────────────────────────
   3층 발코니 (y: 705 ~ 840, 2행 × 3열 + 좌우 박스 = 7구역)
   앞열 = S, 뒷열 = A, 좌우 박스 = B.
   ───────────────────────────────────────────────────────── */
const F3_Y_ROW = [705, 780];
const F3_H = 65;
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

const FLOOR3_ZONES: Zone[] = [
  f3Zone('S-3L앞', 0, 0, 's'),
  f3Zone('S-3C앞', 0, 1, 's'),
  f3Zone('S-3R앞', 0, 2, 's'),
  f3Zone('A-3L뒤', 1, 0, 'a'),
  f3Zone('A-3C뒤', 1, 1, 'a'),
  f3Zone('A-3R뒤', 1, 2, 'a'),
  fBox('B-3박스L', 'b', F3_Y_ROW[0], F3_Y_ROW[1] + F3_H, 90),
  fBox('B-3박스R', 'b', F3_Y_ROW[0], F3_Y_ROW[1] + F3_H, 740),
];

/* ─────────────────────────────────────────────────────────
   4층 발코니 (y: 880 ~ 970, 2행 × 3열 + 좌우 박스 = 7구역)
   앞열 = B, 뒷열 = C, 좌우 박스 = D (최상층 박스 시야 최악).
   ───────────────────────────────────────────────────────── */
const F4_Y_ROW = [880, 930];
const F4_H = 42;
const F4_COL_X = [190, 335, 605];
const F4_W_SIDE = 140;
const F4_W_CENTER = 260;

function f4Zone(id: string, row: number, col: number, tier: string): Zone {
  const x = F4_COL_X[col];
  const w = col === 1 ? F4_W_CENTER : F4_W_SIDE;
  const y = F4_Y_ROW[row];
  return {
    id,
    name: id,
    tier,
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(x, y, w, F4_H),
    labelPos: { x: x + w / 2, y: y + F4_H / 2 },
    seatRows: zoneSeatRows(),
  };
}

const FLOOR4_ZONES: Zone[] = [
  f4Zone('B-4L앞', 0, 0, 'b'),
  f4Zone('B-4C앞', 0, 1, 'b'),
  f4Zone('B-4R앞', 0, 2, 'b'),
  f4Zone('C-4L뒤', 1, 0, 'c'),
  f4Zone('C-4C뒤', 1, 1, 'c'),
  f4Zone('C-4R뒤', 1, 2, 'c'),
  fBox('D-4박스L', 'd', F4_Y_ROW[0], F4_Y_ROW[1] + F4_H, 100),
  fBox('D-4박스R', 'd', F4_Y_ROW[0], F4_Y_ROW[1] + F4_H, 730),
];

export const SEJONG_GRAND: VenueConfig = {
  id: 'sejong-grand-v1',
  name: '세종문화회관 대극장',
  tiers: {
    vip: { label: 'VIP', price: 220000, color: '#B91C1C', bg: '#FEE2E2' },
    r:   { label: 'R석', price: 180000, color: '#7C3AED', bg: '#EDE9FE' },
    s:   { label: 'S석', price: 140000, color: '#0EA5E9', bg: '#E0F2FE' },
    a:   { label: 'A석', price: 100000, color: '#0D9488', bg: '#CCFBF1' },
    b:   { label: 'B석', price: 70000,  color: '#64748B', bg: '#E2E8F0' },
    c:   { label: 'C석', price: 50000,  color: '#9CA3AF', bg: '#F3F4F6' },
    d:   { label: 'D석', price: 30000,  color: '#94A3B8', bg: '#F1F5F9' },
  },
  zones: [
    ...FLOOR1_ZONES,
    ...FLOOR2_ZONES,
    ...FLOOR3_ZONES,
    ...FLOOR4_ZONES,
  ],
  mapGrid: [], // proscenium layout은 SVG로 렌더, mapGrid 미사용
  layout: 'proscenium',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
};

// 총 seated 구역: 9(1층) + 8(2층, 6+박스2) + 8(3층) + 8(4층) = 33개.
// 각 구역 5열 × 6석 = 30석 → 라이브 30석/구역 시 990개 (백엔드 2000 상한 이내).
