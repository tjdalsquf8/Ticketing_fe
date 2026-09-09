'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ROUTES } from '@/lib/api';

/* ──────────────────────────────────────────
   HomeActivityStats — 홈 지표 카드
   ─ 이번 주 최고 기록 / 오늘 참여 인원
   ────────────────────────────────────────── */

interface DailyStats {
  fastestMsThisWeek: number | null;
  participantsToday: number;
}

function useDailyStats(): { data: DailyStats | null; error: boolean } {
  const [data, setData] = useState<DailyStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DailyStats>(ROUTES.stats.daily)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
}

/** 0 → target easeOutQuad tween. 800ms. */
function useCounter(target: number | null, durationMs = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) return;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

function formatMs(ms: number | null): string {
  if (ms === null) return '—.---';
  return (ms / 1000).toFixed(3);
}

export default function HomeActivityStats() {
  const { data, error } = useDailyStats();

  const fastest = useCounter(data?.fastestMsThisWeek ?? null);
  const participants = useCounter(data?.participantsToday ?? null);

  return (
    <section aria-labelledby="stats-heading" className="space-y-3">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"
            aria-hidden
          />
          <h2
            id="stats-heading"
            className="text-sm font-bold text-text tracking-wide"
          >
            지금 이 시각 TicketRush
          </h2>
        </div>
        {error && (
          <span className="text-[10px] font-semibold text-text-tertiary tracking-wider uppercase px-2 py-0.5 rounded bg-bg-subtle">
            집계 불러오기 실패
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 이번 주 최고 기록 */}
        <div className="rounded-2xl border border-border bg-bg-surface shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className="text-text-tertiary"
            >
              <path
                d="M10 2a1 1 0 011 1v1.05A7.001 7.001 0 0117 11v1a1 1 0 01-2 0v-1a5 5 0 00-10 0v1a1 1 0 11-2 0v-1a7.001 7.001 0 016-6.95V3a1 1 0 011-1zm0 8a1 1 0 011 1v.586l1.707 1.707a1 1 0 11-1.414 1.414l-2-2A1 1 0 019 12v-1a1 1 0 011-1z"
                fill="currentColor"
              />
            </svg>
            <p className="text-xs font-semibold text-text-secondary">
              이번 주 최고 기록
            </p>
          </div>
          <p className="flex items-baseline gap-1 font-mono-tabular">
            <span className="text-3xl font-black text-text tracking-tight">
              {formatMs(data?.fastestMsThisWeek != null ? fastest : null)}
            </span>
            <span className="text-sm font-semibold text-text-tertiary">
              s
            </span>
          </p>
          <p className="mt-1 text-[11px] text-text-tertiary">
            가장 빠른 좌석 확정
          </p>
        </div>

        {/* 오늘 참여 인원 */}
        <div className="rounded-2xl border border-border bg-bg-surface shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className="text-text-tertiary"
            >
              <path
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-6 8a6 6 0 1112 0 1 1 0 01-1 1H5a1 1 0 01-1-1z"
                fill="currentColor"
              />
            </svg>
            <p className="text-xs font-semibold text-text-secondary">
              오늘 참여 인원
            </p>
          </div>
          <p className="flex items-baseline gap-1 font-mono-tabular">
            <span className="text-3xl font-black text-text tracking-tight">
              {Math.round(participants).toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-text-tertiary">
              명
            </span>
          </p>
          <p className="mt-1 text-[11px] text-text-tertiary">
            실시간 티켓팅 참여자
          </p>
        </div>
      </div>
    </section>
  );
}
