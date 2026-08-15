import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   잠실 야구장 — 다이아몬드형 야외 야구장 (콘서트 모드)
   무대: 외야(센터필드) 방향 엔드스테이지. 무대 뒤 외야 상단은 판매 안 함.
   관객: 홈베이스 뒤편(백네트 방향)을 중심으로 3층 원호 감쌈.
   층 구조:
     - 1층 내야 (101~112) : 홈베이스 정중앙(테라존/프리미엄) → 좌우로 응원지정석 → 일반 → 익사이팅존
     - 외야 지정석 (401~408) : 좌우 파울존 확장 (전 zone seat-mode로 공평성 유지)
     - 2층 (201~214)      : 내야 상층 원호 지정석. 중앙 프리미엄·응원, 익사이팅 혼합
     - 3층 (301~318)      : 최외곽 원호 지정석
   총 수용(표시용): 30,000명 (실제 콘서트 세팅 상한)
   참고: 2026년 재건축 착공 예정이라 콘서트 사례는 적음. 야구 좌석 등급을 콘서트 관례에 맞춘 추정치.

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일한다.
   zone-mode(구역 클릭 즉시 예매)는 seat-mode(구역 → 좌석 그리드 → 개별 좌석)보다
   랭킹 게임에서 명백히 유리하므로 사용 금지. 외야·스탠딩 성격 구역도 seat-mode 사용.
   ───────────────────────────────────────────────────────── */

const VIEW = { w: 900, h: 940 };
const CENTER = { x: 450, y: 460 };

// SVG polar: 0°=3시(우), 90°=6시(아래), 180°=9시(좌), 270°=12시(위)
// 무대는 위쪽(270°). 무대 뒤 외야 상단은 판매 안 함(빈 각도로 처리).

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
const R1_IN = 210, R1_OUT = 270;   // 1층 내야 + 외야 스탠딩 (같은 반지름, 다른 각도)
const R2_IN = 290, R2_OUT = 350;   // 2층
const R3_IN = 370, R3_OUT = 435;   // 3층

// ─── 좌석 그리드 규격 ───
// 각 seated 구역 5열 × 6석 = 30석. seated 52구역 × 라이브 30석 = 1,560개 (백엔드 2000개 상한 이내).
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_JAMSIL = ROWS_PER_ZONE * SEATS_PER_ROW;

/* ── 1층 내야 (101~112) ────────────────────────────────
   홈베이스 하단 반원. 각 15° × 12구역 = 180° 스윕.
   중앙 대칭으로 tier 배치 (홈 정중앙 → 테라존/프리미엄 → 응원지정석 → 일반 → 익사이팅). */
const RING1_INFIELD_COUNT = 12;
const RING1_INFIELD_SWEEP = 180;
const RING1_INFIELD_STEP = RING1_INFIELD_SWEEP / RING1_INFIELD_COUNT; // 15°
const RING1_INFIELD_START = 90 - RING1_INFIELD_SWEEP / 2;             // 0°

/** idx 0→11 = 각도 0°→180°. idx 5·6이 홈 정중앙(90°). */
const RING1_INFIELD_TIERS: readonly string[] = [
  'exciting', 'infield', 'cheer', 'cheer', 'premium', 'terrace',
  'terrace',  'premium', 'cheer', 'cheer', 'infield', 'exciting',
];

const RING1_INFIELD: Zone[] = RING1_INFIELD_TIERS.map((tier, i) => {
  const num = 101 + i;
  const degStart = RING1_INFIELD_START + i * RING1_INFIELD_STEP;
  const degEnd = degStart + RING1_INFIELD_STEP;
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

/* ── 외야 지정석 좌측 (401~404) ────────────────────────
   3루 파울존 확장. R1 링 좌측(180°) → 무대 앞(230°). seat-mode(공평성 원칙). */
const OUTFIELD_LEFT_COUNT = 4;
const OUTFIELD_LEFT_START = 180;
const OUTFIELD_LEFT_END = 270 - STAGE_HALF;                     // 230°
const OUTFIELD_LEFT_STEP =
  (OUTFIELD_LEFT_END - OUTFIELD_LEFT_START) / OUTFIELD_LEFT_COUNT; // 12.5°

const OUTFIELD_LEFT: Zone[] = Array.from({ length: OUTFIELD_LEFT_COUNT }, (_, i) => {
  const num = 401 + i;
  const degStart = OUTFIELD_LEFT_START + i * OUTFIELD_LEFT_STEP;
  const degEnd = degStart + OUTFIELD_LEFT_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: 'outfield',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 외야 지정석 우측 (405~408) ────────────────────────
   1루 파울존 확장. 무대 우측(310°) → 우측 끝(360°). seat-mode. */
const OUTFIELD_RIGHT_COUNT = 4;
const OUTFIELD_RIGHT_START = 270 + STAGE_HALF;                    // 310°
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
    tier: 'outfield',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 2층 (201~214) ─────────────────────────────────────
   판매 각도 = 360 - STAGE_HALF*2 = 280°. 14구역 × 20°.
   중앙 부근에 프리미엄/응원, 파울존 방향에 익사이팅존 배치. */
const RING2_COUNT = 14;
const RING2_SWEEP = 360 - STAGE_HALF * 2;
const RING2_STEP = RING2_SWEEP / RING2_COUNT;                     // 20°
const RING2_START = 270 + STAGE_HALF;                             // 310°

/** idx 0→13 = 각도 310°→590°(=230°). 중앙(홈 뒤편 90°)는 idx 6~7 부근. */
const RING2_TIERS: readonly string[] = [
  'infield', 'infield', 'cheer',    'cheer',   'exciting', 'cheer',   'premium',
  'premium', 'cheer',   'exciting', 'cheer',   'cheer',    'infield', 'infield',
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

/* ── 3층 (301~318) ─────────────────────────────────────
   최외곽. 18구역 × 약 15.56°. 모두 upper 등급. */
const RING3_COUNT = 18;
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
    tier: 'upper',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R3_IN, R3_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R3_IN, R3_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

export const JAMSIL_BASEBALL: VenueConfig = {
  id: 'jamsil-baseball-v1',
  name: '잠실 야구장',
  tiers: {
    terrace:  { label: '테라존',      price: 220000, color: '#1D4ED8', bg: '#DBEAFE' },
    premium:  { label: '프리미엄석',   price: 198000, color: '#7C3AED', bg: '#EDE9FE' },
    exciting: { label: '익사이팅존',   price: 187000, color: '#EA580C', bg: '#FED7AA' },
    cheer:    { label: '응원지정석',   price: 165000, color: '#0891B2', bg: '#CFFAFE' },
    infield:  { label: '내야 지정석',  price: 132000, color: '#C82028', bg: '#FEE2E2' },
    outfield: { label: '외야 지정석',  price: 99000,  color: '#059669', bg: '#D1FAE5' },
    upper:    { label: '3층 지정석',   price: 88000,  color: '#1E3A8A', bg: '#C7D2FE' },
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
