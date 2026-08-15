import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   고척스카이돔 — 다이아몬드형 실내 야구장 (콘서트 모드)
   무대: 외야 방향(센터필드) 엔드스테이지. 무대 뒤 외야 상단은 판매 안 함.
   관객: 홈베이스 뒤편(백네트 방향)을 중심으로 반원 링 3개 감쌈.
   층 구조:
     - 1층 내야 (101~112) : 홈~1루/3루 부채꼴 지정석
     - 1층 외야 (113~124) : 좌우 파울존 확장 원호 지정석
     - 2층 (201~214)      : 내야 상층 원호 지정석 (박스 T/S 포함 개념)
     - 3층 (301~316)      : 최외곽 원호 지정석
   총 수용(표시용): 25,000명 (실제 콘서트 세팅 상한)
   ───────────────────────────────────────────────────────── */

// R3_OUT = 435, CENTER.y = 460 → 3F 링 하단 y = 895. viewBox 높이는 이 이상 필요.
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

// ─── 무대(외야) 판매 금지 각도 ───
// 무대는 위쪽(270°) 중심. 반각이 클수록 상단 미판매 구간이 넓어짐.
const STAGE_HALF = 45;

// ─── 링 반지름 ───
// 3개 링을 하단(90°) 중심으로 감쌈. 위쪽은 STAGE_HALF 만큼 비움.
const R1_IN = 210, R1_OUT = 270;   // 1층 내야
const R2_IN = 290, R2_OUT = 350;   // 2층
const R3_IN = 370, R3_OUT = 435;   // 3층
// 1층 외야: 1층 링에 이어 좌우로 뻗는 소형 링 (동일 반지름, 다른 구간 각도)

// ─── 좌석 그리드 규격 ───
// 각 구역 5열 × 6석 = 30석. seated 구역 최대치 대비 라이브 라벨 2000개 상한 여유.
const ROWS_PER_ZONE = 5;
const SEATS_PER_ROW = 6;
const zoneSeatRows = () =>
  Array.from({ length: ROWS_PER_ZONE }, (_, r) => ({
    label: String(r + 1),
    seatCount: SEATS_PER_ROW,
  }));
export const SEATS_PER_ZONE_GOCHEOK = ROWS_PER_ZONE * SEATS_PER_ROW;

/* ── 1층: 내야(101~112) + 외야(113~124) ──
   내야: 홈(하단, 90°) 중심으로 좁게 12구역. 각 15° → 총 180°.
   외야: 내야 좌우로 이어서 6+6=12구역. 각도별 무대 근처(270°)까지 남기고 STAGE_HALF만큼 비움. */
const RING1_INFIELD_COUNT = 12;
const RING1_INFIELD_SWEEP = 180;                              // 홈베이스 하단 반원
const RING1_INFIELD_STEP = RING1_INFIELD_SWEEP / RING1_INFIELD_COUNT; // 15°
const RING1_INFIELD_START = 90 - RING1_INFIELD_SWEEP / 2;     // 0° (3시)

const RING1_INFIELD: Zone[] = Array.from({ length: RING1_INFIELD_COUNT }, (_, i) => {
  const num = 101 + i;
  const degStart = RING1_INFIELD_START + i * RING1_INFIELD_STEP;
  const degEnd = degStart + RING1_INFIELD_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: '1f-infield',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

// 외야 좌측 (3루 파울존 확장): 180° ~ (270° - STAGE_HALF) = 180°~225°, 총 45°를 6구역.
const RING1_OF_LEFT_COUNT = 6;
const RING1_OF_LEFT_START = 180;
const RING1_OF_LEFT_STEP = ((270 - STAGE_HALF) - 180) / RING1_OF_LEFT_COUNT; // 7.5°

const RING1_OUTFIELD_LEFT: Zone[] = Array.from({ length: RING1_OF_LEFT_COUNT }, (_, i) => {
  const num = 113 + i;
  const degStart = RING1_OF_LEFT_START + i * RING1_OF_LEFT_STEP;
  const degEnd = degStart + RING1_OF_LEFT_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: '1f-outfield',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

// 외야 우측 (1루 파울존 확장, 0°→ 위쪽으로 STAGE_HALF까지 = -45°~0°)
const RING1_OF_RIGHT_COUNT = 6;
const RING1_OF_RIGHT_START = 270 + STAGE_HALF; // 315°
const RING1_OF_RIGHT_END = 360;                 // 0°(=360)
const RING1_OF_RIGHT_STEP = (RING1_OF_RIGHT_END - RING1_OF_RIGHT_START) / RING1_OF_RIGHT_COUNT;

const RING1_OUTFIELD_RIGHT: Zone[] = Array.from({ length: RING1_OF_RIGHT_COUNT }, (_, i) => {
  const num = 119 + i;
  const degStart = RING1_OF_RIGHT_START + i * RING1_OF_RIGHT_STEP;
  const degEnd = degStart + RING1_OF_RIGHT_STEP;
  return {
    id: String(num),
    name: String(num),
    tier: '1f-outfield',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R1_IN, R1_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

/* ── 2층 (201~214) ─────────────────────────────────────
   1층 링 밖으로 한 겹 더. 판매 각도: 180°→ 90°→ 0°까지 감싸고 위쪽 STAGE_HALF 비움.
   구역 수 14개. 총 스윕 = 360 - STAGE_HALF*2 = 270°. 14로 나누면 약 19.3°. */
const RING2_COUNT = 14;
const RING2_SWEEP = 360 - STAGE_HALF * 2; // 270°
const RING2_STEP = RING2_SWEEP / RING2_COUNT;
const RING2_START = 270 + STAGE_HALF;      // 315° 시작(오른쪽 상단), 시계방향으로 감음

const RING2_ZONES: Zone[] = Array.from({ length: RING2_COUNT }, (_, i) => {
  const num = 201 + i;
  const degStart = RING2_START + i * RING2_STEP;
  const degEnd = degStart + RING2_STEP;
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

/* ── 3층 (301~316) ─────────────────────────────────────
   최외곽. 16구역. 스윕 270° / 16 ≈ 16.9°. */
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
    tier: '3f',
    type: 'seated' as const,
    entryMode: 'seat' as const,
    svgPath: ringSeg(CENTER.x, CENTER.y, R3_IN, R3_OUT, degStart, degEnd),
    labelPos: midLabel(CENTER.x, CENTER.y, R3_IN, R3_OUT, degStart, degEnd),
    seatRows: zoneSeatRows(),
  };
});

export const GOCHEOK_SKYDOME: VenueConfig = {
  id: 'gocheok-skydome-v1',
  name: '고척스카이돔',
  tiers: {
    '1f-infield':  { label: '1층 내야', price: 187000, color: '#C82028', bg: '#FEE2E2' },
    '1f-outfield': { label: '1층 외야', price: 154000, color: '#7C3AED', bg: '#EDE9FE' },
    '2f':          { label: '2층',     price: 121000, color: '#0891B2', bg: '#CFFAFE' },
    '3f':          { label: '3층',      price: 99000,  color: '#059669', bg: '#D1FAE5' },
  },
  zones: [
    ...RING1_INFIELD,
    ...RING1_OUTFIELD_LEFT,
    ...RING1_OUTFIELD_RIGHT,
    ...RING2_ZONES,
    ...RING3_ZONES,
  ],
  mapGrid: [], // baseball layout은 SVG로 렌더, mapGrid 미사용
  layout: 'baseball',
  svgViewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
};
