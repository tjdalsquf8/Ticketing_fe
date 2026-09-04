'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  getLiveCurrent,
  getLiveNext,
  type LiveRoundSummary,
} from '@/lib/live';
import { useServerTime } from '@/hooks/useServerTime';
import { getLiveEventByVenueSlug, type LiveEvent } from '@/data/live';

/* ──────────────────────────────────────────
   홈 hero — 진행 중 회차 우선, 없으면 다음 예정
   ─ 좌: 이벤트 정보 + CTA
   ─ 우: 포스터 (venueId slug 매핑 실패 시 fallback)
   ────────────────────────────────────────── */

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function HomeLiveHero() {
  const [current, setCurrent] = useState<LiveRoundSummary | null | undefined>(undefined);
  const [next, setNext] = useState<LiveRoundSummary | null | undefined>(undefined);
  const { nowServer } = useServerTime();
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, n] = await Promise.allSettled([getLiveCurrent(), getLiveNext()]);
      if (!alive) return;
      setCurrent(c.status === 'fulfilled' ? c.value : null);
      setNext(n.status === 'fulfilled' ? n.value : null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const loaded = current !== undefined && next !== undefined;
  if (!loaded) return <SkeletonHero />;

  const round = current ?? next;
  if (!round) return <EmptyHero />;

  const event: LiveEvent | null = getLiveEventByVenueSlug(round.venueId);
  const isOpen = current?.roundId === round.roundId;
  const opensAtMs = Date.parse(round.opensAt);
  const remainingMs = Math.max(0, opensAtMs - nowServer());
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const countdown =
    h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;

  const title = event?.title ?? `실시간 회차 #${round.roundId}`;
  const venueName = event?.venueName ?? '';
  const category = event?.category ?? '실시간';
  const poster = event?.posterImage;

  const opensAtLabel = new Date(opensAtMs).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="grid md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start">
      {/* 좌: 이벤트 정보 카드 */}
      <div className="card p-6 sm:p-8 flex flex-col gap-5 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-bg border border-danger-border">
              {isOpen && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-text opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger-text" />
                </span>
              )}
              <span className="text-[11px] font-bold text-danger-text tracking-wider">
                {isOpen ? 'LIVE' : 'UPCOMING'}
              </span>
            </span>
            <span className="text-xs text-text-secondary">
              {isOpen ? '지금 진행 중' : `오픈까지 ${countdown}`}
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-primary tracking-wide">{category}</p>
            <h1 className="text-2xl sm:text-[28px] font-bold text-text leading-tight">
              {title}
            </h1>
            {venueName && <p className="text-sm text-text-secondary">{venueName}</p>}
          </div>

          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              총 좌석{' '}
              <strong className="text-text font-mono-tabular">
                {round.totalSeats.toLocaleString()}
              </strong>
              석
            </span>
            <span className="text-xs text-text-tertiary">회차 #{round.roundId}</span>
          </div>

          <div className="pt-2 mt-auto space-y-2.5">
            <Link
              href={`/live/${round.roundId}`}
              className="btn btn-solid btn-lg w-full sm:w-auto"
            >
              {isOpen ? '지금 티켓팅 참여' : '대기실 입장'}
            </Link>
            <p className="text-[11px] text-text-tertiary">
              성공 순위 <strong className="text-text-secondary">TOP 10</strong>에게 티켓이 즉시 지급됩니다.
            </p>
          </div>
        </div>

      {/* 우: 포스터 카드 (practice 상세 카드와 동일 스타일) */}
      <div
        className="hidden md:block relative w-full rounded-xl overflow-hidden aspect-[3/4] bg-[#0b1220]"
        aria-label="공연 포스터"
      >
        {poster && (
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(min-width: 1024px) 18rem, 16rem"
            className="object-cover"
            priority
          />
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.85) 20%, transparent)',
          }}
        />
        <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/70">
            Ticket Rush · Live
          </p>
          <div>
            <p className="text-white font-black text-base leading-tight drop-shadow line-clamp-2">
              {title}
            </p>
            {venueName && (
              <p className="text-white/50 text-xs mt-2 truncate">{venueName}</p>
            )}
            <p className="text-white/30 text-[11px] mt-0.5 font-mono-tabular">
              {isOpen ? '진행 중' : opensAtLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyHero() {
  return (
    <section className="card px-5 py-4 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text">
          진행 중이거나 예정된 회차가 없어요
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          새 회차가 오픈되면 여기에 표시됩니다.
        </p>
      </div>
      <Link href="/live" className="btn btn-outline btn-sm shrink-0">
        실시간 페이지로
      </Link>
    </section>
  );
}

function SkeletonHero() {
  return (
    <section className="grid md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start animate-pulse">
      <div className="card p-6 sm:p-8 flex flex-col gap-5">
        <div className="h-4 w-24 rounded bg-bg-subtle" />
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-bg-subtle" />
          <div className="h-6 w-3/4 rounded bg-bg-subtle" />
          <div className="h-3 w-40 rounded bg-bg-subtle" />
        </div>
        <div className="h-10 rounded bg-bg-subtle" />
      </div>
      <div className="hidden md:block aspect-[3/4] rounded-xl bg-bg-subtle" />
    </section>
  );
}
