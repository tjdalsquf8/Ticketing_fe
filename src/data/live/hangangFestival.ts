import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   한강 페스티벌 필드 — 야외 오픈필드 페스티벌
   구조:
     - 메인 스테이지 (상단 중앙) — VIP · GOLDEN CIRCLE · GA 스탠딩 · 피크닉
     - 서브 스테이지 A (좌 하단) — GA 스탠딩
     - 서브 스테이지 B (우 하단) — GA 스탠딩
     - VIP 라운지/캐노피 (우 상단, F&B 포함)
   수용: 하루 10,000~30,000명 (부지·소방 안전 기준별 상이).

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일.
   스탠딩/피크닉 존도 대표 열·석 부여 → 좌석 그리드에서 개별 선택.
   ───────────────────────────────────────────────────────── */

const VIEW = { w: 960, h: 780 };

// ─── 좌석 그리드 규격 ───
// seated 10구역 × 30석 = 300개 (백엔드 2000 상한 이내).
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_HANGANG = ROWS_PER_ZONE * SEATS_PER_ROW;

/** 사각형 zone SVG path 헬퍼. */
function rect(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/** 사다리꼴 zone SVG path 헬퍼 (스탠딩 존 확산 형태 표현). */
function trap(x1: number, x2: number, x3: number, x4: number, yTop: number, yBottom: number): string {
  // (x1,yTop) ─ (x2,yTop)
  //     \\           //
  //  (x4,yBottom) ─ (x3,yBottom)
  return `M ${x1} ${yTop} L ${x2} ${yTop} L ${x3} ${yBottom} L ${x4} ${yBottom} Z`;
}

/* ─────────────────────────────────────────────────────────
   메인 스테이지 앞 존 (상단 → 하단 순, 무대에서 멀어질수록 등급 낮음)
   메인스테이지: y=40~130 (컴포넌트에서 고정 그림)
   ─ VIP 스탠딩 (펜스 최전방): y=170~230
   ─ GOLDEN CIRCLE (프리미엄 스탠딩): y=240~310
   ─ GA 스탠딩 (일반, 좌·중·우 3구역): y=320~430
   ─ 피크닉 존 (돗자리, 좌·우 2구역): y=440~540
   ─ VIP 라운지·캐노피 (우측 별도): y=170~310
   ───────────────────────────────────────────────────────── */

const CENTER_X = VIEW.w / 2;

// VIP 스탠딩 (무대 최전방 펜스, 단일 좁은 밴드)
const VIP_FRONT: Zone = {
  id: 'VIP-스탠딩',
  name: 'VIP 스탠딩',
  tier: 'vip',
  type: 'seated',
  entryMode: 'seat',
  svgPath: rect(CENTER_X - 200, 170, 400, 55),
  labelPos: { x: CENTER_X, y: 197 },
  seatRows: zoneSeatRows(),
};

// GOLDEN CIRCLE 프리미엄 스탠딩 (VIP 뒤쪽 확장 밴드)
const GOLDEN_CIRCLE: Zone = {
  id: 'GOLDEN-CIRCLE',
  name: 'GOLDEN CIRCLE',
  tier: 'gold',
  type: 'seated',
  entryMode: 'seat',
  svgPath: trap(CENTER_X - 230, CENTER_X + 230, CENTER_X + 260, CENTER_X - 260, 240, 310),
  labelPos: { x: CENTER_X, y: 275 },
  seatRows: zoneSeatRows(),
};

// GA 스탠딩 3구역 (좌·중·우) — 사다리꼴로 무대에서 확산
const GA_STAND_ZONES: Zone[] = [
  {
    id: 'GA-스탠딩L',
    name: 'GA 스탠딩 L',
    tier: 'ga',
    type: 'seated',
    entryMode: 'seat',
    svgPath: trap(CENTER_X - 260, CENTER_X - 90, CENTER_X - 130, CENTER_X - 310, 320, 430),
    labelPos: { x: CENTER_X - 200, y: 375 },
    seatRows: zoneSeatRows(),
  },
  {
    id: 'GA-스탠딩C',
    name: 'GA 스탠딩 C',
    tier: 'ga',
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(CENTER_X - 90, 320, 180, 110),
    labelPos: { x: CENTER_X, y: 375 },
    seatRows: zoneSeatRows(),
  },
  {
    id: 'GA-스탠딩R',
    name: 'GA 스탠딩 R',
    tier: 'ga',
    type: 'seated',
    entryMode: 'seat',
    svgPath: trap(CENTER_X + 90, CENTER_X + 260, CENTER_X + 310, CENTER_X + 130, 320, 430),
    labelPos: { x: CENTER_X + 200, y: 375 },
    seatRows: zoneSeatRows(),
  },
];

// 피크닉 존 (돗자리, 후방 좌·우)
const PICNIC_ZONES: Zone[] = [
  {
    id: '피크닉-L',
    name: '피크닉 L',
    tier: 'picnic',
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(120, 445, 320, 100),
    // SUB_A_GA(x=60-300)가 좌측 절반 덮음. 라벨은 노출 구간(x=300-440) 중앙에 배치.
    labelPos: { x: 370, y: 495 },
    seatRows: zoneSeatRows(),
  },
  {
    id: '피크닉-R',
    name: '피크닉 R',
    tier: 'picnic',
    type: 'seated',
    entryMode: 'seat',
    svgPath: rect(VIEW.w - 440, 445, 320, 100),
    // SUB_B_GA(x=660-900)가 우측 절반 덮음. 라벨은 노출 구간(x=520-660) 중앙에 배치.
    labelPos: { x: VIEW.w - 370, y: 495 },
    seatRows: zoneSeatRows(),
  },
];

// VIP 라운지/캐노피 (우측 상단, F&B·의자 포함)
const VIP_LOUNGE: Zone = {
  id: 'VIP-라운지',
  name: 'VIP 라운지',
  tier: 'vip',
  type: 'seated',
  entryMode: 'seat',
  svgPath: rect(VIEW.w - 130, 175, 100, 135),
  labelPos: { x: VIEW.w - 80, y: 242 },
  seatRows: zoneSeatRows(),
};

// 서브 스테이지 A 앞 GA (좌 하단, 스테이지 위쪽에 배치)
const SUB_A_GA: Zone = {
  id: 'SUBA-GA',
  name: 'SUB A GA',
  tier: 'ga',
  type: 'seated',
  entryMode: 'seat',
  svgPath: rect(60, VIEW.h - 300, 240, 100),
  labelPos: { x: 180, y: VIEW.h - 250 },
  seatRows: zoneSeatRows(),
};

// 서브 스테이지 B 앞 GA (우 하단)
const SUB_B_GA: Zone = {
  id: 'SUBB-GA',
  name: 'SUB B GA',
  tier: 'ga',
  type: 'seated',
  entryMode: 'seat',
  svgPath: rect(VIEW.w - 300, VIEW.h - 300, 240, 100),
  labelPos: { x: VIEW.w - 180, y: VIEW.h - 250 },
  seatRows: zoneSeatRows(),
};

export const HANGANG_FESTIVAL: VenueConfig = {
  id: 'hangang-festival-v1',
  name: '한강 페스티벌 필드',
  tiers: {
    vip:    { label: 'VIP',           price: 220000, color: '#B91C1C', bg: '#FEE2E2' },
    gold:   { label: 'GOLDEN CIRCLE', price: 176000, color: '#B45309', bg: '#FEF3C7' },
    ga:     { label: 'GA 스탠딩',      price: 121000, color: '#0EA5E9', bg: '#E0F2FE' },
    picnic: { label: '피크닉존',        price: 88000,  color: '#15803D', bg: '#DCFCE7' },
  },
  zones: [
    VIP_FRONT,
    GOLDEN_CIRCLE,
    ...GA_STAND_ZONES,
    ...PICNIC_ZONES,
    VIP_LOUNGE,
    SUB_A_GA,
    SUB_B_GA,
  ],
  mapGrid: [], // festival layout은 SVG로 렌더, mapGrid 미사용
  layout: 'festival',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
};

// 총 seated 구역: 1 + 1 + 3 + 2 + 1 + 1 + 1 = 10개.
// 각 구역 5열 × 6석 = 30석 → 라이브 30석/구역 시 300개 (백엔드 2000 상한 이내).
