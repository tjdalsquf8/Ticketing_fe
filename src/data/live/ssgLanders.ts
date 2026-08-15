import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   인천 SSG랜더스필드 (인천문학경기장) — 다이아몬드형 야외 야구장 (콘서트 모드)
   무대: 외야(센터필드) 방향 엔드스테이지. 무대 뒤 외야 상단은 판매 안 함.
   관객: 홈베이스 뒤편 반원 + 좌우 파울존 확장.
   층 구조:
     - 1층 내야 (101~112) : 홈베이스 정중앙 → 네이비(프리미엄) → 레드 → 블루
     - 외야 그린석 (401~408) : 좌우 파울존 확장. seat-mode (공평성)
     - 2층 (201~214)      : 스카이박스급 상층. 중앙 네이비, 특수 랜더스라이브존(영화관식) 포함
     - 3층 (301~316)      : 최외곽 A석
   총 수용(표시용): 25,000명 (콘서트 세팅 상한)
   등급 명칭: KBO 랜더스 실제 좌석 등급명(네이비/레드/블루/그린)을 콘서트 티어로 재구획.
   랜더스라이브존 : 영화관식 특수석. 2층 중앙 부근 2개 구역에 배치.

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일.
   외야·플로어도 대표 열/석 부여로 seat-mode 유지 (map.md 참조).
   ───────────────────────────────────────────────────────── */

const VIEW = { w: 900, h: 940 };
const CENTER = { x: 450, y: 460 };

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

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

// ─── 무대 판매 금지 반각 ───
const STAGE_HALF = 40;

// ─── 링 반지름 ───
const R1_IN = 210, R1_OUT = 270;   // 1층 내야 + 외야 그린석 (같은 반지름, 다른 각도)
const R2_IN = 290, R2_OUT = 350;   // 2층 스카이박스 (랜더스라이브존 포함)
const R3_IN = 370, R3_OUT = 435;   // 3층 A석 (최외곽)

// ─── 좌석 그리드 규격 ───
// 각 seated 구역 5열 × 6석 = 30석. seated 50구역 × 라이브 30석 = 1,500개 (백엔드 2000 상한 이내).
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_SSG = ROWS_PER_ZONE * SEATS_PER_ROW;

/* ── 1층 내야 (101~112) ──────────────────────────────
   홈베이스 하단 반원. 각 15° × 12구역 = 180° 스윕.
   대칭 tier 배치: 홈 정중앙(네이비) → 좌우로 레드 → 블루. */
const RING1_COUNT = 12;
const RING1_SWEEP = 180;
const RING1_STEP = RING1_SWEEP / RING1_COUNT; // 15°
const RING1_START = 90 - RING1_SWEEP / 2;      // 0°

const RING1_TIERS: readonly string[] = [
  'blue', 'blue', 'red',  'red',  'navy', 'navy',
  'navy', 'navy', 'red',  'red',  'blue', 'blue',
];

const RING1_INFIELD: Zone[] = RING1_TIERS.map((tier, i) => {
  const num = 101 + i;
  const degStart = RING1_START + i * RING1_STEP;
  const degEnd = degStart + RING1_STEP;
  return {
    id: String(num),
    name: String(num),
    tier,
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 외야 그린석 좌측 (401~404) ──────────────────────
   3루 파울존 확장. R1 링 좌측(180°) → 무대 앞(230°). 4구역 seat-mode. */
const OUTFIELD_LEFT_COUNT = 4;
const OUTFIELD_LEFT_START = 180;
const OUTFIELD_LEFT_END = 270 - STAGE_HALF;                       // 230°
const OUTFIELD_LEFT_STEP =
  (OUTFIELD_LEFT_END - OUTFIELD_LEFT_START) / OUTFIELD_LEFT_COUNT; // 12.5°

const OUTFIELD_LEFT: Zone[] = Array.from({ length: OUTFIELD_LEFT_COUNT }, (_, i) => {
  const num = 401 + i;
  const degStart = OUTFIELD_LEFT_START + i * OUTFIELD_LEFT_STEP;
  const degEnd = degStart + OUTFIELD_LEFT_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: 'green',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 외야 그린석 우측 (405~408) ──────────────────────
   1루 파울존 확장. 무대 우측(310°) → 우측 끝(360°). */
const OUTFIELD_RIGHT_COUNT = 4;
const OUTFIELD_RIGHT_START = 270 + STAGE_HALF;                      // 310°
const OUTFIELD_RIGHT_END = 360;
const OUTFIELD_RIGHT_STEP =
  (OUTFIELD_RIGHT_END - OUTFIELD_RIGHT_START) / OUTFIELD_RIGHT_COUNT; // 12.5°

const OUTFIELD_RIGHT: Zone[] = Array.from({ length: OUTFIELD_RIGHT_COUNT }, (_, i) => {
  const num = 405 + i;
  const degStart = OUTFIELD_RIGHT_START + i * OUTFIELD_RIGHT_STEP;
  const degEnd = degStart + OUTFIELD_RIGHT_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: 'green',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 2층 (201~214) 스카이박스 상층 ─────────────────
   판매 각도 = 280°. 14구역 × 20°.
   중앙 부근에 네이비, 대각선 위치에 랜더스라이브존(영화관식) 특수석 배치. */
const RING2_COUNT = 14;
const RING2_SWEEP = 360 - STAGE_HALF * 2;
const RING2_STEP = RING2_SWEEP / RING2_COUNT;                      // 20°
const RING2_START = 270 + STAGE_HALF;                              // 310°

/** idx 0→13 = 각도 310°→590°(=230°). 중앙(홈 뒤편 90°)은 idx 6~7 부근. */
const RING2_TIERS: readonly string[] = [
  'green', 'blue', 'blue', 'red', 'red', 'landers-live', 'navy',
  'navy',  'landers-live', 'red', 'red', 'blue', 'blue', 'green',
];

const RING2_ZONES: Zone[] = RING2_TIERS.map((tier, i) => {
  const num = 201 + i;
  const degStart = RING2_START + i * RING2_STEP;
  const degEnd = degStart + RING2_STEP;
  return {
    id: String(num),
    name: String(num),
    tier,
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R2_IN, R2_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R2_IN, R2_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 3층 A석 (301~316) ────────────────────────────
   최외곽. 16구역 × 17.5°. */
const RING3_COUNT = 16;
const RING3_SWEEP = 360 - STAGE_HALF * 2;
const RING3_STEP = RING3_SWEEP / RING3_COUNT;
const RING3_START = 270 + STAGE_HALF;

const RING3_ZONES: Zone[] = Array.from({ length: RING3_COUNT }, (_, i) => {
  const num = 301 + i;
  const degStart = RING3_START + i * RING3_STEP;
  const degEnd = degStart + RING3_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: 'a-seat',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R3_IN, R3_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R3_IN, R3_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

export const SSG_LANDERS_FIELD: VenueConfig = {
  id: 'ssg-landers-v1',
  name: '인천 SSG랜더스필드',
  tiers: {
    'landers-live': { label: '랜더스라이브존', price: 220000, color: '#EA580C', bg: '#FED7AA' },
    navy:           { label: '네이비석',       price: 198000, color: '#1E3A8A', bg: '#DBEAFE' },
    red:            { label: '레드석',         price: 176000, color: '#C82028', bg: '#FEE2E2' },
    blue:           { label: '블루석',         price: 143000, color: '#0891B2', bg: '#CFFAFE' },
    green:          { label: '그린석',         price: 99000,  color: '#059669', bg: '#D1FAE5' },
    'a-seat':       { label: 'A석',            price: 77000,  color: '#475569', bg: '#E2E8F0' },
  },
  zones: [
    ...RING1_INFIELD,
    ...OUTFIELD_LEFT,
    ...OUTFIELD_RIGHT,
    ...RING2_ZONES,
    ...RING3_ZONES,
  ],
  mapGrid: [], // baseball layout은 SVG로 렌더, mapGrid 미사용
  layout: 'baseball',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
};
