'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ROUTES } from '@/lib/api';

/* ──────────────────────────────────────────
   HomeActivityStats — 홈 지표 카드 (비대칭 레이아웃)
   ─ 좌: 오늘 발급 티켓 — 큰 강조 셀 (primary-subtle 배경, 시선 앵커)
   ─ 우: 이번 주 최고 기록 / 오늘 참여 인원 — 세로 스택
   ────────────────────────────────────────── */

interface DailyStats {
  ticketsIssuedToday: number;
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

  const tickets = useCounter(data?.ticketsIssuedToday ?? null);
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

      {/* 비대칭 그리드: 좌 강조 + 우 세로 스택 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* 좌: 오늘 발급 티켓 (강조) */}
        <div
          className="md:col-span-3 relative overflow-hidden rounded-2xl border shadow-sm p-6 sm:p-7"
          style={{
            backgroundColor: 'var(--primary-subtle)',
            borderColor: 'var(--primary-border)',
          }}
        >
          {/* 우측 하단 장식 원형 (subtle) */}
          <div
            className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full opacity-20"
            style={{ backgroundColor: 'var(--color-primary)' }}
            aria-hidden
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="text-primary"
              >
                <path
                  d="M4 6a2 2 0 012-2h8a2 2 0 012 2v1a2 2 0 100 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1a2 2 0 100-4V6z"
                  fill="currentColor"
                />
              </svg>
              <p className="text-xs font-semibold text-primary tracking-wide">
                오늘 발급된 티켓
              </p>
            </div>
            <p className="flex items-baseline gap-1.5 font-mono-tabular">
              <span
                className="text-5xl sm:text-6xl font-black tracking-tight"
                style={{ color: 'var(--color-primary)' }}
              >
                {Math.round(tickets).toLocaleString()}
              </span>
              <span className="text-lg font-bold text-primary/80">장</span>
            </p>
            <p className="mt-2 text-xs text-text-secondary">
              자정 기준 · 실시간·유료 회차 합산
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
              <Link
                href="/live"
                className="btn btn-solid btn-sm"
              >
                지금 참여하기
              </Link>
              <Link
                href="/ranking"
                className="font-semibold text-primary hover:underline"
              >
                리더보드 →
              </Link>
            </div>
          </div>
        </div>

        {/* 우: 세로 스택 2셀 */}
        <div className="md:col-span-2 grid grid-cols-1 gap-3">
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
      </div>
    </section>
  );
}
