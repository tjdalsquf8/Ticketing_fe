import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   인스파이어 아레나 (인천 영종도)
   실제 배치 참고: T자형 돌출 스테이지(엔드스테이지)를 두고
   FLOOR·3층·4층 3단 구조로 구성. (2층은 실 공연 배치상 3층으로 통합)

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일.

   구획 개요 (첨부 실 배치 이미지 기준, 총 7,143석):
     FLOOR (플로어, 8구역) 합계 2,182석
       상단열: F1(238) · F2(257) · F3(257) · F4(238)
       하단열: F5(306) · F6(290) · F7(290) · F8(306)
     3층 (300번대, 13구역) 합계 3,149석
       우측(무대측 아래): 306 · 307 · 308 · 309 · 310
       하단 정면 명당:     311(340) · 312(250) · 313(322) · 314(291)
       좌측:               315(226) · 316(220) · 317(220) · 318(220)
     4층 (400번대, 7구역) 합계 1,812석
       좌측:               418(194) · 417(251) · 416(194) · 415(196)
       하단:               414(389) · 413(256) · 412(332)

   좌석 그리드(라이브 게임용): 모든 zone 5열 × 6석 = 30석 균등.
     seated 구역 28개 × 30 = 840개 (백엔드 defaultSeatLabels 2000 상한 이내).
   ───────────────────────────────────────────────────────── */

const VIEW = { w: 900, h: 940 };

// ─── 좌석 그리드 규격 ───
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_INSPIRE = ROWS_PER_ZONE * SEATS_PER_ROW;

// ─── FLOOR (플로어) ─────────────────────────────────────────
// STAGE 앞 사각형 8분할. 상단 4개(F1~F4) · 하단 4개(F5~F8).
// STAGE 돌출부(T-bar) 좌우를 F2·F3가 감싸는 형태.
//
// 배치 사각형 영역: x 260..640, 상단 y 245..390, 하단 y 400..555
// (STAGE 상판은 y=90~180 위쪽에 별도 렌더링됨)
const FLOOR_TOP_Y = 250;
const FLOOR_TOP_H = 135;
const FLOOR_BOT_Y = 400;
const FLOOR_BOT_H = 155;
const FLOOR_LEFT_X = 262;
const FLOOR_COL_W = 95;

const floorTop = (i: number) =>
  `M ${FLOOR_LEFT_X + i * FLOOR_COL_W} ${FLOOR_TOP_Y} ` +
  `L ${FLOOR_LEFT_X + (i + 1) * FLOOR_COL_W} ${FLOOR_TOP_Y} ` +
  `L ${FLOOR_LEFT_X + (i + 1) * FLOOR_COL_W} ${FLOOR_TOP_Y + FLOOR_TOP_H} ` +
  `L ${FLOOR_LEFT_X + i * FLOOR_COL_W} ${FLOOR_TOP_Y + FLOOR_TOP_H} Z`;

const floorBot = (i: number) =>
  `M ${FLOOR_LEFT_X + i * FLOOR_COL_W} ${FLOOR_BOT_Y} ` +
  `L ${FLOOR_LEFT_X + (i + 1) * FLOOR_COL_W} ${FLOOR_BOT_Y} ` +
  `L ${FLOOR_LEFT_X + (i + 1) * FLOOR_COL_W} ${FLOOR_BOT_Y + FLOOR_BOT_H} ` +
  `L ${FLOOR_LEFT_X + i * FLOOR_COL_W} ${FLOOR_BOT_Y + FLOOR_BOT_H} Z`;

interface FloorMeta { id: string; capacity: number }
const FLOOR_TOP: FloorMeta[] = [
  { id: 'F1', capacity: 238 },
  { id: 'F2', capacity: 257 },
  { id: 'F3', capacity: 257 },
  { id: 'F4', capacity: 238 },
];
const FLOOR_BOT: FloorMeta[] = [
  { id: 'F5', capacity: 306 },
  { id: 'F6', capacity: 290 },
  { id: 'F7', capacity: 290 },
  { id: 'F8', capacity: 306 },
];

const FLOOR_ZONES: Zone[] = [
  ...FLOOR_TOP.map((meta, i) => ({
    id: meta.id,
    name: meta.id,
    tier: 'floor',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: floorTop(i),
    labelPos: {
      x: FLOOR_LEFT_X + (i + 0.5) * FLOOR_COL_W,
      y: FLOOR_TOP_Y + FLOOR_TOP_H / 2,
    },
    seatRows: zoneSeatRows(),
    capacity: meta.capacity,
  })),
  ...FLOOR_BOT.map((meta, i) => ({
    id: meta.id,
    name: meta.id,
    tier: 'floor',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: floorBot(i),
    labelPos: {
      x: FLOOR_LEFT_X + (i + 0.5) * FLOOR_COL_W,
      y: FLOOR_BOT_Y + FLOOR_BOT_H / 2,
    },
    seatRows: zoneSeatRows(),
    capacity: meta.capacity,
  })),
];

// ─── 3층 도넛 (13구역) ─────────────────────────────────────
// 우측 세로열(306~310), 하단 가로열(311~314), 좌측 세로열(315~318)
// FLOOR 사각형(x 262..642, y 250..555)을 감싸는 트랙.

// 우측 세로열 (306→310, 위에서 아래로)
const R3_RIGHT_X = 660;
const R3_RIGHT_W = 90;
const R3_RIGHT_TOP_Y = 250;
const R3_RIGHT_H = 61; // 5칸 × 61 = 305 → y=250..555

interface Ring3Meta { id: string; capacity: number; tier: string }
const RING3_RIGHT: Ring3Meta[] = [
  { id: '306', capacity: 210, tier: '3f' },
  { id: '307', capacity: 210, tier: '3f' },
  { id: '308', capacity: 210, tier: '3f' },
  { id: '309', capacity: 215, tier: '3f' },
  { id: '310', capacity: 215, tier: '3f' },
];

// 하단 가로열 (311→314, 오른쪽에서 왼쪽으로 → 이미지 좌표계에서 우측→좌측 나열)
// 이미지: 우측하단 311(340) → 좌측으로 312(250) → 313(322) → 314(291)
const R3_BOT_Y = 575;
const R3_BOT_H = 100;
const R3_BOT_RIGHT_X = 750;
const R3_BOT_COL_W = 122;
const RING3_BOTTOM: Ring3Meta[] = [
  { id: '311', capacity: 340, tier: 'premium-view' }, // 우측 코너 — 정면 명당
  { id: '312', capacity: 250, tier: 'premium-view' }, // 중앙-우
  { id: '313', capacity: 322, tier: 'premium-view' }, // 중앙-좌
  { id: '314', capacity: 291, tier: 'premium-view' }, // 좌측 코너
];

// 좌측 세로열 (315→318, 아래에서 위로)
const R3_LEFT_X = 152;
const R3_LEFT_W = 90;
const R3_LEFT_BOT_Y = 555;
const R3_LEFT_H = 61; // 아래에서 위로 4칸 → 315(맨아래)~318(맨위); 4칸 유지 x 61 = 244
// 총 4개
const RING3_LEFT: Ring3Meta[] = [
  { id: '315', capacity: 226, tier: '3f' }, // 좌측 최하단
  { id: '316', capacity: 220, tier: '3f' },
  { id: '317', capacity: 220, tier: '3f' },
  { id: '318', capacity: 220, tier: '3f' }, // 좌측 최상단
];

const rectPath = (x: number, y: number, w: number, h: number) =>
  `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;

const RING3_ZONES: Zone[] = [
  // 우측 세로열: 위→아래 (306 → 310)
  ...RING3_RIGHT.map((meta, i) => {
    const y = R3_RIGHT_TOP_Y + i * R3_RIGHT_H;
    return {
      id: meta.id,
      name: meta.id,
      tier: meta.tier,
      type: 'seated' as const,
      entryMode: 'seat' as const,
      svgPath: rectPath(R3_RIGHT_X, y, R3_RIGHT_W, R3_RIGHT_H),
      labelPos: { x: R3_RIGHT_X + R3_RIGHT_W / 2, y: y + R3_RIGHT_H / 2 },
      seatRows: zoneSeatRows(),
      capacity: meta.capacity,
    };
  }),
  // 하단 가로열: 우→좌 (311 → 314)
  ...RING3_BOTTOM.map((meta, i) => {
    const x = R3_BOT_RIGHT_X - (i + 1) * R3_BOT_COL_W;
    return {
      id: meta.id,
      name: meta.id,
      tier: meta.tier,
      type: 'seated' as const,
      entryMode: 'seat' as const,
      svgPath: rectPath(x, R3_BOT_Y, R3_BOT_COL_W, R3_BOT_H),
      labelPos: { x: x + R3_BOT_COL_W / 2, y: R3_BOT_Y + R3_BOT_H / 2 },
      seatRows: zoneSeatRows(),
      capacity: meta.capacity,
    };
  }),
  // 좌측 세로열: 아래→위 (315 → 318)
  ...RING3_LEFT.map((meta, i) => {
    const y = R3_LEFT_BOT_Y - (i + 1) * R3_LEFT_H;
    return {
      id: meta.id,
      name: meta.id,
      tier: meta.tier,
      type: 'seated' as const,
      entryMode: 'seat' as const,
      svgPath: rectPath(R3_LEFT_X, y, R3_LEFT_W, R3_LEFT_H),
      labelPos: { x: R3_LEFT_X + R3_LEFT_W / 2, y: y + R3_LEFT_H / 2 },
      seatRows: zoneSeatRows(),
      capacity: meta.capacity,
    };
  }),
];

// ─── 4층 외곽 (7구역) ─────────────────────────────────────
// 좌측 세로열(415~418, 4칸) + 하단 가로열(412~414, 3칸)
// 이미지: 좌측 4구역(418 상단 → 415 하단), 하단 3구역(우측 412 → 좌측 414)

interface Ring4Meta { id: string; capacity: number; tier: string }
const R4_LEFT_X = 60;
const R4_LEFT_W = 85;
const R4_LEFT_TOP_Y = 250;
const R4_LEFT_H = 91; // 4칸 × 91 = 364 → y 250..614
const RING4_LEFT: Ring4Meta[] = [
  { id: '418', capacity: 194, tier: '4f' }, // 상단
  { id: '417', capacity: 251, tier: '4f' },
  { id: '416', capacity: 194, tier: '4f' },
  { id: '415', capacity: 196, tier: '4f' }, // 하단
];

const R4_BOT_Y = 685;
const R4_BOT_H = 110;
const R4_BOT_RIGHT_X = 750;
const R4_BOT_COL_W = 162;
const RING4_BOTTOM: Ring4Meta[] = [
  { id: '412', capacity: 332, tier: 'premium-view' }, // 우측
  { id: '413', capacity: 256, tier: 'premium-view' }, // 중앙
  { id: '414', capacity: 389, tier: 'premium-view' }, // 좌측
];

const RING4_ZONES: Zone[] = [
  ...RING4_LEFT.map((meta, i) => {
    const y = R4_LEFT_TOP_Y + i * R4_LEFT_H;
    return {
      id: meta.id,
      name: meta.id,
      tier: meta.tier,
      type: 'seated' as const,
      entryMode: 'seat' as const,
      svgPath: rectPath(R4_LEFT_X, y, R4_LEFT_W, R4_LEFT_H),
      labelPos: { x: R4_LEFT_X + R4_LEFT_W / 2, y: y + R4_LEFT_H / 2 },
      seatRows: zoneSeatRows(),
      capacity: meta.capacity,
    };
  }),
  ...RING4_BOTTOM.map((meta, i) => {
    const x = R4_BOT_RIGHT_X - (i + 1) * R4_BOT_COL_W;
    return {
      id: meta.id,
      name: meta.id,
      tier: meta.tier,
      type: 'seated' as const,
      entryMode: 'seat' as const,
      svgPath: rectPath(x, R4_BOT_Y, R4_BOT_COL_W, R4_BOT_H),
      labelPos: { x: x + R4_BOT_COL_W / 2, y: R4_BOT_Y + R4_BOT_H / 2 },
      seatRows: zoneSeatRows(),
      capacity: meta.capacity,
    };
  }),
];

export const INSPIRE_ARENA: VenueConfig = {
  id: 'inspire-arena-v1',
  name: '인스파이어 아레나',
  tiers: {
    floor:          { label: 'FLOOR',     price: 198000, color: '#DC2626', bg: '#FEE2E2' },
    'premium-view': { label: '정면 명당',  price: 165000, color: '#F59E0B', bg: '#FEF3C7' },
    '3f':           { label: '3층 지정석', price: 121000, color: '#059669', bg: '#D1FAE5' },
    '4f':           { label: '4층 지정석', price: 88000,  color: '#64748B', bg: '#E2E8F0' },
  },
  zones: [
    ...FLOOR_ZONES,
    ...RING3_ZONES,
    ...RING4_ZONES,
  ],
  mapGrid: [], // arena-ring layout은 SVG로 렌더, mapGrid 미사용
  layout: 'arena-ring',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
  stageShape: 't-shape',
  consoleLabel: true,
};
