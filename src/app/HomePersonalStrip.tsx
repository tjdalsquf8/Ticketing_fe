'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getMyTickets } from '@/lib/tickets';
import {
  listMyEventRegistrations,
  type MyEventRegistration,
} from '@/lib/events';

/* ──────────────────────────────────────────
   홈 개인화 스트립 — 로그인 유저 전용
   ─ 좌: 포인트 · 누적 티켓 · 진행 중 신청 (3-스탯)
   ─ 아래: 하이라이트 CTA (open 상태 신청 있으면 "지금 참여")
             없으면 가장 가까운 pending 오픈 카운트다운
   ────────────────────────────────────────── */

interface Stats {
  ticketCount: number | null;
  activeRegs: MyEventRegistration[] | null;
}

const INITIAL_STATS: Stats = { ticketCount: null, activeRegs: null };

function formatDday(msUntil: number): string {
  if (msUntil <= 0) return 'D-DAY';
  const days = Math.floor(msUntil / (24 * 60 * 60 * 1000));
  if (days >= 1) return `D-${days}`;
  const hours = Math.floor(msUntil / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}시간 뒤`;
  const mins = Math.max(1, Math.floor(msUntil / (60 * 1000)));
  return `${mins}분 뒤`;
}

export default function HomePersonalStrip() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStats(INITIAL_STATS);
      setLoaded(true);
      return;
    }

    let alive = true;
    setLoaded(false);
    (async () => {
      const [ticketsRes, regsRes] = await Promise.allSettled([
        getMyTickets({ page: 1, limit: 1 }),
        listMyEventRegistrations({ limit: 100 }),
      ]);
      if (!alive) return;

      const ticketCount =
        ticketsRes.status === 'fulfilled'
          ? ticketsRes.value.meta?.totalCount ?? ticketsRes.value.data.length
          : null;

      const activeRegs =
        regsRes.status === 'fulfilled'
          ? regsRes.value.data.filter(
              (r) => r.status === 'pending' || r.status === 'entered',
            )
          : null;

      setStats({ ticketCount, activeRegs });
      setLoaded(true);
    })();

    return () => {
      alive = false;
    };
  }, [authLoading, user]);

  // 1분마다 tick — D-day / 카운트다운 문구 갱신
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [user]);

  const highlight = useMemo(() => {
    if (!stats.activeRegs || stats.activeRegs.length === 0) return null;

    // 우선순위 1: event.status === 'open' 인 신청
    const openOne = stats.activeRegs.find((r) => r.event.status === 'open');
    if (openOne) {
      return {
        kind: 'open' as const,
        title: openOne.event.title,
        href: `/event/${openOne.event.eventId}/wait`,
      };
    }

    // 우선순위 2: 가장 가까운 pending (opensAt 오름차순)
    const now = Date.now();
    const upcoming = stats.activeRegs
      .filter((r) => Date.parse(r.event.opensAt) > now)
      .sort((a, b) => Date.parse(a.event.opensAt) - Date.parse(b.event.opensAt));
    if (upcoming.length === 0) return null;
    const nearest = upcoming[0];
    return {
      kind: 'upcoming' as const,
      title: nearest.event.title,
      href: `/event/${nearest.event.eventId}`,
      dday: formatDday(Date.parse(nearest.event.opensAt) - now),
    };
  }, [stats.activeRegs]);

  if (authLoading || !user) return null;

  const points = user.points;
  const activeCount = stats.activeRegs?.length ?? null;

  return (
    <section className="space-y-3">
      {/* 스탯 카드 */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-primary tracking-wide">MY</p>
            <h2 className="text-lg font-bold text-text mt-0.5">
              {user.name}님, 오늘도 도전하세요
            </h2>
          </div>
        </div>

        <ul className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatItem
            label="보유 포인트"
            value={
              typeof points === 'number'
                ? `${points.toLocaleString()} P`
                : '—'
            }
            href="/my/points"
            loaded
          />
          <StatItem
            label="누적 티켓"
            value={
              stats.ticketCount !== null
                ? `${stats.ticketCount.toLocaleString()}매`
                : '—'
            }
            href="/my/tickets"
            loaded={loaded}
          />
          <StatItem
            label="진행 중 신청"
            value={activeCount !== null ? `${activeCount}건` : '—'}
            href="/my"
            loaded={loaded}
          />
        </ul>
      </div>

      {/* 하이라이트 CTA */}
      {highlight?.kind === 'open' && (
        <Link
          href={highlight.href}
          className="block rounded-xl border border-primary bg-primary-subtle px-5 py-4 hover:bg-primary-subtle/70 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-primary tracking-wider">
                지금 티켓팅 참여 가능
              </p>
              <p className="text-sm font-semibold text-text truncate mt-0.5">
                {highlight.title}
              </p>
            </div>
            <span className="btn btn-solid btn-sm shrink-0">지금 참여 →</span>
          </div>
        </Link>
      )}

      {highlight?.kind === 'upcoming' && (
        <Link
          href={highlight.href}
          className="block rounded-xl border border-border bg-bg-surface px-5 py-4 hover:border-border-strong transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-secondary tracking-wide">
                다가오는 내 이벤트
              </p>
              <p className="text-sm font-semibold text-text truncate mt-0.5">
                {highlight.title}
              </p>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-primary shrink-0">
              {highlight.dday}
            </span>
          </div>
        </Link>
      )}
    </section>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  href: string;
  loaded: boolean;
}

function StatItem({ label, value, href, loaded }: StatItemProps) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-bg-subtle transition-colors"
      >
        <p className="text-[11px] text-text-tertiary font-medium">{label}</p>
        {loaded ? (
          <p className="mt-1 font-mono-tabular text-base sm:text-lg font-bold text-text">
            {value}
          </p>
        ) : (
          <div className="mt-1.5 h-5 w-16 bg-bg-subtle rounded animate-pulse" />
        )}
      </Link>
    </li>
  );
}
