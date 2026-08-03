'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────
   Types & Constants
   ───────────────────────────────────────────────────────── */
type Tier = 'vip' | 'r' | 's' | 'a';
type Side = 'L' | 'R';

interface Seat {
  id: string;
  row: string;
  col: number;
  side: Side;
  tier: Tier;
  taken: boolean;
}

const TIER: Record<Tier, { label: string; price: number; availBg: string; availBorder: string; takenBg: string }> = {
  vip: { label: 'VIP석', price: 170_000, availBg: '#FFFBEB', availBorder: '#D97706', takenBg: '#FEF3C7' },
  r:   { label: 'R석',   price: 140_000, availBg: '#FEF2F2', availBorder: '#DC2626', takenBg: '#FEE2E2' },
  s:   { label: 'S석',   price: 110_000, availBg: '#EFF6FF', availBorder: '#2563EB', takenBg: '#DBEAFE' },
  a:   { label: 'A석',   price:  80_000, availBg: '#F0FDF4', availBorder: '#16A34A', takenBg: '#DCFCE7' },
};

/* 행 정의 — 위쪽(무대 가까운 열)부터 VIP */
const ROW_DEFS: { row: string; cols: number; tier: Tier }[] = [
  { row: 'A', cols: 8,  tier: 'vip' },
  { row: 'B', cols: 10, tier: 'vip' },
  { row: 'C', cols: 14, tier: 'r'   },
  { row: 'D', cols: 16, tier: 'r'   },
  { row: 'E', cols: 18, tier: 'r'   },
  { row: 'F', cols: 18, tier: 'r'   },
  { row: 'G', cols: 20, tier: 's'   },
  { row: 'H', cols: 20, tier: 's'   },
  { row: 'I', cols: 22, tier: 's'   },
  { row: 'J', cols: 22, tier: 's'   },
  { row: 'K', cols: 24, tier: 'a'   },
  { row: 'L', cols: 26, tier: 'a'   },
  { row: 'M', cols: 26, tier: 'a'   },
  { row: 'N', cols: 28, tier: 'a'   },
];

const MAX_HALF = Math.max(...ROW_DEFS.map(r => r.cols)) / 2; // 14
const SEAT_PX  = 16;   // seat width/height
const GAP_PX   = 3;    // gap between seats
const STEP_PX  = SEAT_PX + GAP_PX;
const MAX_SELECT = 4;

/* 결정적 "이미 예매됨" 패턴 */
function takenSeed(row: string, col: number, side: Side): boolean {
  const r = row.charCodeAt(0);
  const c = side === 'L' ? col : col + 50;
  return (r * 17 + c * 13 + r + c) % 5 < 2;
}

function buildSeats(): Seat[] {
  return ROW_DEFS.flatMap(({ row, cols, tier }) => {
    const half = cols / 2;
    const left: Seat[]  = Array.from({ length: half }, (_, i) => ({
      id: `${row}L${i + 1}`, row, col: i + 1, side: 'L', tier,
      taken: takenSeed(row, i + 1, 'L'),
    }));
    const right: Seat[] = Array.from({ length: half }, (_, i) => ({
      id: `${row}R${i + 1}`, row, col: i + 1, side: 'R', tier,
      taken: takenSeed(row, i + 1, 'R'),
    }));
    return [...left, ...right];
  });
}

const ALL_SEATS = buildSeats();

/* ─────────────────────────────────────────────────────────
   Helper
   ───────────────────────────────────────────────────────── */
const fmtPrice = (n: number) => n.toLocaleString('ko-KR') + '원';
const fmtMs    = (ms: number) => {
  const s   = Math.floor(ms / 1000);
  const rem = String(ms % 1000).padStart(3, '0');
  return `${s}.${rem}`;
};

/* ─────────────────────────────────────────────────────────
   Props
   ───────────────────────────────────────────────────────── */
interface SeatMapProps {
  mode: 'practice' | 'live';
  disabled?: boolean;           // 오픈 전 비활성 상태
  onComplete?: (seats: Seat[], elapsedMs: number) => void;
}

/* ─────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────── */
export default function SeatMap({ mode, disabled = false, onComplete }: SeatMapProps) {
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [elapsed,  setElapsed]    = useState(0);
  const [done,     setDone]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  /* 타이머 — practice 모드 또는 live 오픈 시 시작 */
  useEffect(() => {
    if (disabled || done) return;
    timerRef.current = setInterval(() => setElapsed(e => e + 10), 10);
    return () => clearInterval(timerRef.current);
  }, [disabled, done]);

  const toggleSeat = useCallback((seat: Seat) => {
    if (seat.taken || disabled || done) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        if (next.size >= MAX_SELECT) return prev;
        next.add(seat.id);
      }
      return next;
    });
  }, [disabled, done]);

  const handleComplete = () => {
    if (selected.size === 0) return;
    clearInterval(timerRef.current);
    setDone(true);
    const seats = ALL_SEATS.filter(s => selected.has(s.id));
    onComplete?.(seats, elapsed);
  };

  /* 선택 좌석 요약 */
  const selectedSeats = ALL_SEATS.filter(s => selected.has(s.id));
  const totalPrice    = selectedSeats.reduce((sum, s) => sum + TIER[s.tier].price, 0);

  /* 좌석 스타일 */
  const getSeatStyle = (seat: Seat): React.CSSProperties => {
    const isSelected = selected.has(seat.id);
    if (isSelected) return { background: '#E85D00', borderColor: '#C24E00', cursor: 'pointer' };
    if (seat.taken)  return { background: '#E2E8F0', borderColor: '#CBD5E1', cursor: 'not-allowed', opacity: 0.7 };
    return { background: TIER[seat.tier].availBg, borderColor: TIER[seat.tier].availBorder, cursor: disabled ? 'not-allowed' : 'pointer' };
  };

  return (
    <div className={[
      'flex flex-col lg:flex-row gap-4',
      disabled ? 'select-none' : '',
    ].join(' ')}>

      {/* ── 좌석 그리드 영역 ── */}
      <div className="flex-1 min-w-0">

        {/* 타이머 — practice 모드 */}
        {mode === 'practice' && (
          <div className="mb-3 flex items-center gap-3">
            <div className="card px-4 py-2 flex items-center gap-2">
              <span className="text-xs text-text-secondary">경과 시간</span>
              <span className={[
                'font-mono-tabular text-xl font-bold',
                done ? 'text-success-text' : 'text-primary',
              ].join(' ')}>
                {fmtMs(elapsed)}s
              </span>
            </div>
            {done && (
              <span className="badge badge-success">연습 완료</span>
            )}
          </div>
        )}

        {/* 무대 */}
        <div className="relative mb-4">
          <div className="mx-auto rounded-lg border border-border bg-bg-subtle text-center py-2.5"
               style={{ maxWidth: MAX_HALF * 2 * STEP_PX + 24 + 28 }}>
            <span className="text-xs font-semibold text-text-secondary tracking-widest uppercase">
              STAGE
            </span>
          </div>
          {/* 사다리꼴 효과 */}
          <div className="mx-auto mt-1 border-l-8 border-r-8 border-t-8 border-transparent border-t-border"
               style={{ width: MAX_HALF * 2 * STEP_PX }}
          />
        </div>

        {/* 좌석 그리드 — 가로 스크롤 허용 */}
        <div className={['overflow-x-auto pb-2', disabled ? 'opacity-50 pointer-events-none' : ''].join(' ')}>
          <div className="inline-block">
            {ROW_DEFS.map(({ row, cols }) => {
              const half    = cols / 2;
              const padCols = MAX_HALF - half;        // 양쪽 여백 열 수
              const leftSeats  = ALL_SEATS.filter(s => s.row === row && s.side === 'L');
              const rightSeats = ALL_SEATS.filter(s => s.row === row && s.side === 'R');

              return (
                <div key={row} className="flex items-center" style={{ gap: GAP_PX, marginBottom: GAP_PX }}>
                  {/* 행 라벨 */}
                  <span className="text-xs text-text-tertiary font-mono-tabular"
                        style={{ width: 20, textAlign: 'right', flexShrink: 0 }}>
                    {row}
                  </span>

                  {/* 왼쪽 패딩 */}
                  <div style={{ width: padCols * STEP_PX, flexShrink: 0 }} />

                  {/* 왼쪽 좌석 블록 */}
                  <div className="flex" style={{ gap: GAP_PX }}>
                    {leftSeats.map(seat => (
                      <button
                        key={seat.id}
                        title={`${seat.row}열 좌측 ${seat.col}번 — ${TIER[seat.tier].label} ${fmtPrice(TIER[seat.tier].price)}`}
                        onClick={() => toggleSeat(seat)}
                        style={{
                          width: SEAT_PX, height: SEAT_PX,
                          borderRadius: 3,
                          border: '1px solid',
                          flexShrink: 0,
                          transition: 'transform 80ms',
                          ...getSeatStyle(seat),
                        }}
                        className={selected.has(seat.id) ? 'scale-110' : ''}
                      />
                    ))}
                  </div>

                  {/* 통로 */}
                  <div style={{ width: 24, flexShrink: 0 }} />

                  {/* 오른쪽 좌석 블록 */}
                  <div className="flex" style={{ gap: GAP_PX }}>
                    {rightSeats.map(seat => (
                      <button
                        key={seat.id}
                        title={`${seat.row}열 우측 ${seat.col}번 — ${TIER[seat.tier].label} ${fmtPrice(TIER[seat.tier].price)}`}
                        onClick={() => toggleSeat(seat)}
                        style={{
                          width: SEAT_PX, height: SEAT_PX,
                          borderRadius: 3,
                          border: '1px solid',
                          flexShrink: 0,
                          transition: 'transform 80ms',
                          ...getSeatStyle(seat),
                        }}
                        className={selected.has(seat.id) ? 'scale-110' : ''}
                      />
                    ))}
                  </div>

                  {/* 오른쪽 패딩 */}
                  <div style={{ width: padCols * STEP_PX, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* 범례 */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {(Object.entries(TIER) as [Tier, typeof TIER[Tier]][]).map(([key, t]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="inline-block rounded"
                    style={{ width: 12, height: 12, background: t.availBg, border: `1px solid ${t.availBorder}` }} />
              <span className="text-xs text-text-secondary">{t.label} {fmtPrice(t.price)}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="inline-block rounded"
                  style={{ width: 12, height: 12, background: '#E85D00', border: '1px solid #C24E00' }} />
            <span className="text-xs text-text-secondary">선택</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block rounded"
                  style={{ width: 12, height: 12, background: '#E2E8F0', border: '1px solid #CBD5E1' }} />
            <span className="text-xs text-text-secondary">예매 완료</span>
          </div>
        </div>
      </div>

      {/* ── 우측 선택 정보 패널 ── */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="card p-4 space-y-4 lg:sticky lg:top-20">

          <div>
            <p className="text-sm font-semibold text-text">선택 좌석</p>
            <p className="text-xs text-text-tertiary mt-0.5">최대 {MAX_SELECT}매까지 선택 가능</p>
          </div>

          {/* 선택 좌석 목록 */}
          <div className="min-h-20 space-y-1.5">
            {selectedSeats.length === 0 ? (
              <p className="text-sm text-text-tertiary py-4 text-center">좌석을 클릭해 선택하세요</p>
            ) : (
              selectedSeats.map(seat => (
                <div key={seat.id}
                     className="flex items-center justify-between rounded-md border border-border bg-bg-subtle px-3 py-2">
                  <div>
                    <span className="text-sm font-semibold text-text">
                      {seat.row}열 {seat.side === 'L' ? '좌' : '우'}{seat.col}번
                    </span>
                    <span className="ml-2 text-xs text-text-secondary">{TIER[seat.tier].label}</span>
                  </div>
                  <button
                    onClick={() => toggleSeat(seat)}
                    className="text-xs text-text-tertiary hover:text-danger-text transition-colors"
                    disabled={done}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 금액 */}
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">선택 수량</span>
              <span className="font-semibold text-text">{selectedSeats.length}매</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">총 금액</span>
              <span className="font-bold text-text">{fmtPrice(totalPrice)}</span>
            </div>
          </div>

          {/* 완료 버튼 */}
          {!done ? (
            <button
              className="btn btn-solid w-full"
              onClick={handleComplete}
              disabled={selectedSeats.length === 0}
            >
              {mode === 'practice' ? '연습 완료' : '예매하기'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-md bg-success-bg border border-success-border px-3 py-2 text-center">
                <p className="text-sm font-semibold text-success-text">
                  {mode === 'practice' ? '연습 완료!' : '예매 성공!'}
                </p>
                {mode === 'practice' && (
                  <p className="text-xs text-success-text mt-0.5 font-mono-tabular">
                    소요 시간: {fmtMs(elapsed)}s
                  </p>
                )}
              </div>
              <button
                className="btn btn-neutral w-full btn-sm"
                onClick={() => {
                  setSelected(new Set());
                  setElapsed(0);
                  setDone(false);
                }}
              >
                다시 선택
              </button>
            </div>
          )}

          {/* 선택 제한 안내 */}
          {selected.size >= MAX_SELECT && !done && (
            <p className="text-xs text-warning-text text-center">최대 {MAX_SELECT}매 선택 완료</p>
          )}
        </div>
      </div>

    </div>
  );
}
