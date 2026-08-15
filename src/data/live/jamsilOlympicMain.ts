import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   잠실 종합운동장 주경기장 — 타원 육상 트랙 스타디움 (콘서트 모드)
   무대: 트랙 단측 엔드스테이지 (상단 12시 방향). 무대 반대편 스탠드는 판매 안 함(시야제한).
   층 구조:
     - GROUND (VIP·A·B·C) : 무대 앞 그라운드 스탠딩성 4구역 (seat-mode 공평성)
     - 1층 로어 (101~114) : 트랙 인접 첫 링. 정면 SR / 사이드 R
     - 2층 미드 (201~216) : 두 번째 링. 전 구역 S
     - 3층 어퍼 (301~318) : 최외곽. 정면 S / 사이드 A
   총 수용(표시용): 45,000명 (콘서트 실판매 대표 세팅)
   참고: 리모델링 이슈로 실제 세팅은 투어별 상이. 여기서는 대표 SR/R/S/A 등급으로 하드코딩.

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일.
   그라운드 스탠딩성 구역도 대표 열/석 부여로 seat-mode 유지 (map.md 참조).
   ───────────────────────────────────────────────────────── */

const VIEW = { w: 900, h: 940 };
const CENTER = { x: 450, y: 500 };

// ── 타원 좌표 헬퍼 (원형 링 대신 타원 파라미터로 계산) ──
// 파라미터 각도 θ(°)에서 타원 위의 점: (cx + rx·cosθ, cy + ry·sinθ)
// SVG polar convention: 0°=3시(우), 90°=6시(아래), 180°=9시(좌), 270°=12시(위)

function polarE(cx: number, cy: number, rx: number, ry: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + rx * Math.cos(rad), cy + ry * Math.sin(rad)];
}

/** 타원 링 세그먼트 SVG path. 안쪽 (rxIn, ryIn), 바깥쪽 (rxOut, ryOut). */
function ringSegE(
  cx: number, cy: number,
  rxIn: number, ryIn: number,
  rxOut: number, ryOut: number,
  degStart: number, degEnd: number,
): string {
  const [x1, y1] = polarE(cx, cy, rxOut, ryOut, degStart);
  const [x2, y2] = polarE(cx, cy, rxOut, ryOut, degEnd);
  const [x3, y3] = polarE(cx, cy, rxIn, ryIn, degEnd);
  const [x4, y4] = polarE(cx, cy, rxIn, ryIn, degStart);
  const largeArc = Math.abs(degEnd - degStart) > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(1);
  return `M ${f(x1)} ${f(y1)} A ${rxOut} ${ryOut} 0 ${largeArc} 1 ${f(x2)} ${f(y2)} L ${f(x3)} ${f(y3)} A ${rxIn} ${ryIn} 0 ${largeArc} 0 ${f(x4)} ${f(y4)} Z`;
}

function midLabelE(
  cx: number, cy: number,
  rxIn: number, ryIn: number,
  rxOut: number, ryOut: number,
  degStart: number, degEnd: number,
): { x: number; y: number } {
  const rxMid = (rxIn + rxOut) / 2;
  const ryMid = (ryIn + ryOut) / 2;
  const degMid = (degStart + degEnd) / 2;
  const [x, y] = polarE(cx, cy, rxMid, ryMid, degMid);
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

// ─── 무대 판매 금지 반각 ───
const STAGE_HALF = 30;

// ─── 링별 타원 반경 (rx > ry로 좌우로 넓은 타원) ───
const R1_RX_IN = 270, R1_RY_IN = 165, R1_RX_OUT = 320, R1_RY_OUT = 205;   // 1층
const R2_RX_IN = 340, R2_RY_IN = 225, R2_RX_OUT = 385, R2_RY_OUT = 265;   // 2층
const R3_RX_IN = 405, R3_RY_IN = 285, R3_RX_OUT = 445, R3_RY_OUT = 325;   // 3층

// ─── 좌석 그리드 규격 ───
// 각 seated 구역 5열 × 6석 = 30석. seated 52구역 × 라이브 30석 = 1,560개 (백엔드 2000 상한 이내).
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_JAMSIL_OLYMPIC = ROWS_PER_ZONE * SEATS_PER_ROW;

// ─── GROUND 4구역 (VIP·A·B·C) ───
// 필드 위 스탠딩성 사각형 배치. VIP는 무대 앞 정중앙, A/B/C는 뒤로 확장.
// FIELD 타원(cx=450, cy=500, rx=215, ry=115) 안에 배치.
const GROUND_ZONES: Zone[] = [
  {
    id: 'VIP', name: 'VIP', tier: 'vip-pit', type: 'seated',
    entryMode: 'seat',
    svgPath: 'M 395 405 L 505 405 L 505 445 L 395 445 Z',
    labelPos: { x: 450, y: 425 },
    seatRows: zoneSeatRows(),
  },
  {
    id: 'A', name: 'A', tier: 'ground', type: 'seated',
    entryMode: 'seat',
    svgPath: 'M 285 455 L 380 455 L 380 585 L 285 585 Z',
    labelPos: { x: 332, y: 520 },
    seatRows: zoneSeatRows(),
  },
  {
    id: 'B', name: 'B', tier: 'ground', type: 'seated',
    entryMode: 'seat',
    svgPath: 'M 395 455 L 505 455 L 505 585 L 395 585 Z',
    labelPos: { x: 450, y: 555 },
    seatRows: zoneSeatRows(),
  },
  {
    id: 'C', name: 'C', tier: 'ground', type: 'seated',
    entryMode: 'seat',
    svgPath: 'M 520 455 L 615 455 L 615 585 L 520 585 Z',
    labelPos: { x: 568, y: 520 },
    seatRows: zoneSeatRows(),
  },
];

/* ── 1층 로어 (101~114, 14구역) ───────────────────────
   판매 각도 = 360 - STAGE_HALF*2 = 300°. 14구역 ≈ 21.43°/구역.
   정면(홈 뒤편, 각도 90° 부근) idx 6~8 = 107·108·109 → SR 프리미엄.
   나머지는 R. */
const R1_COUNT = 14;
const R1_SWEEP = 360 - STAGE_HALF * 2;
const R1_STEP = R1_SWEEP / R1_COUNT;
const R1_START = 270 + STAGE_HALF;                          // 300°
const R1_SR_IDX = new Set([6, 7, 8]);                       // 107, 108, 109

const RING1_ZONES: Zone[] = Array.from({ length: R1_COUNT }, (_, i) => {
  const num = 101 + i;
  const degStart = R1_START + i * R1_STEP;
  const degEnd = degStart + R1_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: R1_SR_IDX.has(i) ? 'sr' : 'r',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSegE(CENTER.x, CENTER.y, R1_RX_IN, R1_RY_IN, R1_RX_OUT, R1_RY_OUT, degStart, degEnd),
    labelPos: midLabelE(CENTER.x, CENTER.y, R1_RX_IN, R1_RY_IN, R1_RX_OUT, R1_RY_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 2층 미드 (201~216, 16구역) — 전 구역 S ─────── */
const R2_COUNT = 16;
const R2_SWEEP = 360 - STAGE_HALF * 2;
const R2_STEP = R2_SWEEP / R2_COUNT;                        // 18.75°
const R2_START = 270 + STAGE_HALF;

const RING2_ZONES: Zone[] = Array.from({ length: R2_COUNT }, (_, i) => {
  const num = 201 + i;
  const degStart = R2_START + i * R2_STEP;
  const degEnd = degStart + R2_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: 's',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSegE(CENTER.x, CENTER.y, R2_RX_IN, R2_RY_IN, R2_RX_OUT, R2_RY_OUT, degStart, degEnd),
    labelPos: midLabelE(CENTER.x, CENTER.y, R2_RX_IN, R2_RY_IN, R2_RX_OUT, R2_RY_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 3층 어퍼 (301~318, 18구역) ───────────────────
   정면(idx 7~11 = 308·309·310·311·312) → S, 나머지 → A. */
const R3_COUNT = 18;
const R3_SWEEP = 360 - STAGE_HALF * 2;
const R3_STEP = R3_SWEEP / R3_COUNT;                        // ≈ 16.67°
const R3_START = 270 + STAGE_HALF;
const R3_S_IDX = new Set([7, 8, 9, 10, 11]);                // 308~312

const RING3_ZONES: Zone[] = Array.from({ length: R3_COUNT }, (_, i) => {
  const num = 301 + i;
  const degStart = R3_START + i * R3_STEP;
  const degEnd = degStart + R3_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: R3_S_IDX.has(i) ? 's' : 'a',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSegE(CENTER.x, CENTER.y, R3_RX_IN, R3_RY_IN, R3_RX_OUT, R3_RY_OUT, degStart, degEnd),
    labelPos: midLabelE(CENTER.x, CENTER.y, R3_RX_IN, R3_RY_IN, R3_RX_OUT, R3_RY_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

export const JAMSIL_OLYMPIC_MAIN: VenueConfig = {
  id: 'jamsil-olympic-v1',
  name: '잠실 종합운동장 주경기장',
  tiers: {
    'vip-pit': { label: 'VIP 피트',  price: 275000, color: '#B91C1C', bg: '#FEE2E2' },
    ground:    { label: '그라운드',   price: 220000, color: '#DC2626', bg: '#FEF2F2' },
    sr:        { label: 'SR 정면',    price: 198000, color: '#7C3AED', bg: '#EDE9FE' },
    r:         { label: 'R석',        price: 165000, color: '#F59E0B', bg: '#FEF3C7' },
    s:         { label: 'S석',        price: 121000, color: '#0EA5E9', bg: '#E0F2FE' },
    a:         { label: 'A석',        price: 77000,  color: '#64748B', bg: '#E2E8F0' },
  },
  zones: [
    ...GROUND_ZONES,
    ...RING1_ZONES,
    ...RING2_ZONES,
    ...RING3_ZONES,
  ],
  mapGrid: [], // stadium-oval layout은 SVG로 렌더, mapGrid 미사용
  layout: 'stadium-oval',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
};
