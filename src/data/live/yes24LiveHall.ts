import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   YES24 라이브홀 — 프로시니엄 재사용 (일본식 라이브하우스, 가로로 넓고 얕음)
   무대: 상단 정면 프로시니엄 엔드스테이지.
   층 구조 (좌석 모드 대표 세팅):
     - 1층 스탠딩 → 좌석 모드 시 가/나/다/라 4블록 (VIP + R)
       * 스탠딩 A/B/C 블록도 라벨은 동일한 4블록으로 시각 매핑
     - 2층 발코니 지정석 (5구역): 앞열 중앙 R · 사이드 S · 뒷열 S/A
   총 표시 수용: 1,051석 (좌석 모드), 스탠딩 모드 2,037명.

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일.
   1층 스탠딩도 대표 열/석 부여 (5열 × 6석 = 30석) → 좌석 그리드에서 개별 선택.
   ───────────────────────────────────────────────────────── */

const VIEW = { w: 900, h: 720 };

// ─── 좌석 그리드 규격 ───
// seated 9구역 × 30석 = 270개 (백엔드 2000 상한 이내, 소규모 라이브홀).
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_YES24 = ROWS_PER_ZONE * SEATS_PER_ROW;

/** 사각형 zone SVG path 헬퍼. */
function rect(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/* ─────────────────────────────────────────────────────────
   1층 (y: 260 ~ 480, 2행 × 2열 = 4구역) — 가·나·다·라
   무대 앞 = VIP(가, 나), 뒷열 = R(다, 라). 라이브하우스 성격상 가로로 넓게.
   ───────────────────────────────────────────────────────── */
const F1_Y_ROW = [260, 370];
const F1_H = 100;
const F1_COL_X = [130, 470];
const F1_W = 300;

function f1Zone(id: string, row: number, col: number, tier: string): Zone {
  const x = F1_COL_X[col];
  const y = F1_Y_ROW[row];
  return {
    id,
    name: id,
    tier,
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(x, y, F1_W, F1_H),
    labelPos: { x: x + F1_W / 2, y: y + F1_H / 2 },
    seatRows: zoneSeatRows(),
  };
}

const FLOOR1_ZONES: Zone[] = [
  // 앞열 (무대 앞 최전방): VIP
  f1Zone('VIP-가', 0, 0, 'vip'),
  f1Zone('VIP-나', 0, 1, 'vip'),
  // 뒷열: R
  f1Zone('R-다', 1, 0, 'r'),
  f1Zone('R-라', 1, 1, 'r'),
];

/* ─────────────────────────────────────────────────────────
   2층 발코니 (y: 525 ~ 640, 2행 × 2열 + 좌우 박스 = 5구역)
   앞열 = S(중앙), 뒷열 = A. 라이브하우스라 발코니 구역이 단순함.
   ───────────────────────────────────────────────────────── */
const F2_Y_ROW = [525, 605];
const F2_H = 60;
const F2_COL_X = [210, 490];
const F2_W = 220;

function f2Zone(id: string, row: number, col: number, tier: string): Zone {
  const x = F2_COL_X[col];
  const y = F2_Y_ROW[row];
  return {
    id,
    name: id,
    tier,
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(x, y, F2_W, F2_H),
    labelPos: { x: x + F2_W / 2, y: y + F2_H / 2 },
    seatRows: zoneSeatRows(),
  };
}

/** 최측면 세로 스트립 박스석. */
function fSideZone(id: string, tier: string, x: number): Zone {
  const y = F2_Y_ROW[0];
  const h = F2_Y_ROW[1] + F2_H - F2_Y_ROW[0];
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
  f2Zone('S-2L앞', 0, 0, 's'),
  f2Zone('S-2R앞', 0, 1, 's'),
  f2Zone('A-2L뒤', 1, 0, 'a'),
  f2Zone('A-2R뒤', 1, 1, 'a'),
  fSideZone('A-2박스', 'a', 720),
];

export const YES24_LIVE_HALL: VenueConfig = {
  id: 'yes24-livehall-v1',
  name: 'YES24 라이브홀',
  tiers: {
    vip: { label: 'VIP',  price: 143000, color: '#B91C1C', bg: '#FEE2E2' },
    r:   { label: 'R석',  price: 121000, color: '#7C3AED', bg: '#EDE9FE' },
    s:   { label: 'S석',  price: 99000,  color: '#0EA5E9', bg: '#E0F2FE' },
    a:   { label: 'A석',  price: 77000,  color: '#64748B', bg: '#E2E8F0' },
  },
  zones: [
    ...FLOOR1_ZONES,
    ...FLOOR2_ZONES,
  ],
  mapGrid: [], // proscenium layout은 SVG로 렌더, mapGrid 미사용
  layout: 'proscenium',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
};

// 총 seated 구역: 4 + 5 = 9개.
// 각 구역 5열 × 6석 = 30석 → 라이브 30석/구역 시 270개 (백엔드 2000 상한 이내).
