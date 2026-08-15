import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '실시간 이벤트' };

/* ──────────────────────────────────────────
   /live — 매시간 정시 이벤트 랜딩
   ─ 매시 정각 자동 오픈 · 성공 TOP 10 → 티켓 1매 (회원 한정)
   ─ 게스트도 참여 가능하나 티켓 지급 대상 X
   ────────────────────────────────────────── */

// 정적 mock — 실제로는 GET /events/live/next 응답으로 대체
const NEXT_EVENT = {
  id: 'live-1400',
  title: '싸이 홈빽쇼 SUMMERSWAG 2026 - 서울',
  category: '콘서트',
  venue: '잠실종합운동장 주경기장',
  opensAt: '14:00',
  countdown: { h: '00', m: '24', s: '32' },
  totalSeats: 3000,
  registeredViewers: 87,
  posterColor: '#1E3A8A',
  posterInitial: 'PSY',
};

const RECENT_RESULTS = [
  { rank: 1, nickname: '조성민', elapsedMs: 4523 },
  { rank: 2, nickname: '낭낭',   elapsedMs: 5102 },
  { rank: 3, nickname: '시골쥐', elapsedMs: 5847 },
];

const RANK_BADGE: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatMs(ms: number) {
  return (ms / 1000).toFixed(3) + 's';
}

export default function LivePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-14">

      {/* ── 헤더 ─────────────────────────────────────────── */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-bg border border-danger-border">
            <span className="h-1.5 w-1.5 rounded-full bg-danger-text" />
            <span className="text-[11px] font-bold text-danger-text tracking-wider">LIVE</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">실시간 이벤트</h1>
        </div>
        <p className="text-sm text-text-secondary">
          매시간 정각에 자동 오픈. 성공 순위 TOP 10 회원에게 티켓 1매가 지급됩니다.
        </p>
      </header>

      {/* ── 다음 오픈 카운트다운 카드 ─────────────────────── */}
      <section className="card overflow-hidden">
        <div className="grid md:grid-cols-[1.35fr_1fr]">
          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold text-primary tracking-wide">{NEXT_EVENT.category} · 다음 오픈 {NEXT_EVENT.opensAt}</p>
              <h2 className="mt-1.5 text-2xl sm:text-[28px] font-bold text-text leading-tight">
                {NEXT_EVENT.title}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{NEXT_EVENT.venue}</p>
            </div>

            {/* 카운트다운 */}
            <div className="rounded-xl border border-border bg-bg-subtle p-4 flex items-end gap-1 justify-center">
              {[
                { val: NEXT_EVENT.countdown.h, unit: '시간' },
                { val: NEXT_EVENT.countdown.m, unit: '분'   },
                { val: NEXT_EVENT.countdown.s, unit: '초'   },
              ].map(({ val, unit }, i) => (
                <div key={i} className="flex items-end gap-1">
                  {i > 0 && <span className="text-2xl font-light text-text-tertiary mb-1">:</span>}
                  <div className="text-center min-w-[3rem]">
                    <span className="font-mono-tabular text-4xl font-bold text-text">{val}</span>
                    <p className="text-xs text-text-tertiary mt-0.5">{unit}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>대기 중 <strong className="text-text font-mono-tabular">{NEXT_EVENT.registeredViewers}</strong>명</span>
              <span>총 좌석 <strong className="text-text font-mono-tabular">{NEXT_EVENT.totalSeats.toLocaleString()}</strong>석</span>
            </div>

            <Link href={`/event/${NEXT_EVENT.id}/wait`} className="btn btn-solid btn-lg w-full sm:w-auto">
              대기실 입장
            </Link>
            <p className="text-[11px] text-text-tertiary">
              게스트도 참여 가능하지만, 티켓 지급은 <strong className="text-text-secondary">회원</strong>만 대상입니다.
            </p>
          </div>

          <div
            className="hidden md:flex items-center justify-center min-h-[320px] relative"
            style={{ backgroundColor: NEXT_EVENT.posterColor }}
          >
            <span className="text-6xl font-black text-white/90 tracking-tight select-none">
              {NEXT_EVENT.posterInitial}
            </span>
            <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm text-[11px] font-medium text-white">
              POSTER
            </div>
          </div>
        </div>
      </section>

      {/* ── 지난 회차 TOP 3 ───────────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-text">지난 회차 TOP 3</h2>
          <p className="text-sm text-text-secondary mt-1">이전 시간대 소요 시간 순위</p>
        </div>

        <ol className="card divide-y divide-border overflow-hidden">
          {RECENT_RESULTS.map((row) => (
            <li key={row.rank} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-8 text-center font-mono-tabular font-semibold text-text-secondary">
                {RANK_BADGE[row.rank] ?? row.rank}
              </span>
              <span className="flex-1 text-sm font-medium text-text truncate">{row.nickname}</span>
              <span className="font-mono-tabular font-bold text-text">{formatMs(row.elapsedMs)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 규칙 안내 ─────────────────────────────────────── */}
      <section className="card p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-text">실시간 이벤트 규칙</h2>
        <ul className="text-sm text-text-secondary space-y-1.5 list-disc list-inside">
          <li>매시간 정각에 자동으로 오픈됩니다.</li>
          <li>성공한 사람 중 소요 시간이 가장 빠른 <strong className="text-text">TOP 10</strong> 회원에게 티켓 1매가 지급됩니다.</li>
          <li>게스트도 참여 가능하지만 티켓 획득·리더보드 등재는 <strong className="text-text">회원 전용</strong>입니다.</li>
          <li>모은 티켓은 리더보드 순위와 유료 이벤트 참여권으로 사용됩니다.</li>
        </ul>
      </section>

    </div>
  );
}
