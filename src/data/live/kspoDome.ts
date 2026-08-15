import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   KSPO돔 (올림픽공원 체조경기장) — 원형 아레나
   층 구조: FLOOR(스탠딩 B/C/D) + 1층 링(101~120) + 2층 링(201~222)
   총 수용: 약 14,594석 (스탠딩 세팅 시 최대 16,000명)
   무대: 상단 12시 방향 엔드스테이지
   ───────────────────────────────────────────────────────── */

// SVG viewBox 좌표계
const VIEW = { w: 800, h: 700 };
const CENTER = { x: 400, y: 380 };

// 각도 표기 (SVG 기준): 0°=3시(우), 90°=6시(아래), 180°=9시(좌), 270°=12시(위)
// 무대는 12시 방향(270°)에 위치. 무대가 차지하는 각도는 링에서 제외.

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** 시계방향 링 세그먼트 SVG path */
function ringSeg(
  cx: number, cy: number,
  rIn: number, rOut: number,
  degStart: number, degEnd: number,
): string {
  const [x1, y1] = polar(cx, cy, rOut, degStart);
  const [x2, y2] = polar(cx, cy, rOut, degEnd);
  const [x3, y3] = polar(cx, cy, rIn,  degEnd);
  const [x4, y4] = polar(cx, cy, rIn,  degStart);
  const largeArc = Math.abs(degEnd - degStart) > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(1);
  return `M ${f(x1)} ${f(y1)} A ${rOut} ${rOut} 0 ${largeArc} 1 ${f(x2)} ${f(y2)} L ${f(x3)} ${f(y3)} A ${rIn} ${rIn} 0 ${largeArc} 0 ${f(x4)} ${f(y4)} Z`;
}

function midLabel(
  cx: number, cy: number,
  rIn: number, rOut: number,
  degStart: number, degEnd: number,
): { x: number; y: number } {
  const rMid = (rIn + rOut) / 2;
  const degMid = (degStart + degEnd) / 2;
  const [x, y] = polar(cx, cy, rMid, degMid);
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

// ─── 무대 각도 ───
const STAGE_HALF_1F = 30; // 1층 링에서 무대가 차지하는 반각 (총 60°)
const STAGE_HALF_2F = 22; // 2층 링에서 무대가 차지하는 반각 (총 44°)

// ─── 1층 링 (반지름 200~260) ───
const R1_IN = 200, R1_OUT = 260;
const R1_ZONES = 20;
const R1_SWEEP = 360 - STAGE_HALF_1F * 2; // 300°
const R1_STEP = R1_SWEEP / R1_ZONES;      // 15°
const R1_START = 270 + STAGE_HALF_1F;     // 300° (무대 오른쪽 끝부터 시계방향)

// ─── 2층 링 (반지름 285~355) ───
const R2_IN = 285, R2_OUT = 355;
const R2_ZONES = 22;
const R2_SWEEP = 360 - STAGE_HALF_2F * 2; // 316°
const R2_STEP = R2_SWEEP / R2_ZONES;      // 14.36°
const R2_START = 270 + STAGE_HALF_2F;     // 292°

// ─── 좌석 그리드 규격: 라이브 미니게임 전 구역 통일 ───
// 각 구역 5열 × 8석 = 40석. 45구역 × 40석 = 1,800석 (백엔드 2000 캡 이내).
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 8;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE = ROWS_PER_ZONE * SEATS_PER_ROW;

// ─── 플로어 3구역 (C·B·D) ───
// 무대 앞 스탠딩 구역이지만, 라이브 미니게임 공평성을 위해 좌석 그리드로 모델링.
const FLOOR_ZONES: Zone[] = [
  {
    id: 'FC', name: 'C', tier: 'floor', type: 'seated',
    entryMode: 'seat',
    svgPath: 'M 260 150 L 350 150 L 350 305 L 260 305 Z',
    labelPos: { x: 305, y: 227 },
    seatRows: zoneSeatRows(),
  },
  {
    id: 'FB', name: 'B', tier: 'floor', type: 'seated',
    entryMode: 'seat',
    svgPath: 'M 355 150 L 445 150 L 445 305 L 355 305 Z',
    labelPos: { x: 400, y: 227 },
    seatRows: zoneSeatRows(),
  },
  {
    id: 'FD', name: 'D', tier: 'floor', type: 'seated',
    entryMode: 'seat',
    svgPath: 'M 450 150 L 540 150 L 540 305 L 450 305 Z',
    labelPos: { x: 495, y: 227 },
    seatRows: zoneSeatRows(),
  },
];

// ─── 1층 링 구역 (101 ~ 120) ───
const RING1_ZONES: Zone[] = Array.from({ length: R1_ZONES }, (_, i) => {
  const num = 101 + i;
  const degStart = R1_START + i * R1_STEP;
  const degEnd = degStart + R1_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: '1f',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

// ─── 2층 링 구역 (201 ~ 222) ───
const RING2_ZONES: Zone[] = Array.from({ length: R2_ZONES }, (_, i) => {
  const num = 201 + i;
  const degStart = R2_START + i * R2_STEP;
  const degEnd = degStart + R2_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: '2f',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R2_IN, R2_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R2_IN, R2_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

export const KSPO_DOME: VenueConfig = {
  id: 'kspo-dome-v1',
  name: 'KSPO돔 (올림픽공원 체조경기장)',
  tiers: {
    floor: { label: 'FLOOR', price: 176000, color: '#C82028', bg: '#FEE2E2' },
    '1f':  { label: '1층 지정석', price: 154000, color: '#7C3AED', bg: '#EDE9FE' },
    '2f':  { label: '2층 지정석', price: 132000, color: '#2563EB', bg: '#DBEAFE' },
  },
  zones: [...FLOOR_ZONES, ...RING1_ZONES, ...RING2_ZONES],
  mapGrid: [], // arena-ring layout은 SVG로 렌더, mapGrid 미사용
  layout: 'arena-ring',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
};
