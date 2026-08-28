'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  getLatestEventRankings,
  type LatestEventRankings,
} from '@/lib/events';
import { getAdminVenueOption } from '@/data/live';
import { safeHexColor, safeImageUrl } from '@/lib/safe';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   HomeLatestResults — 홈 하단 "최근 티켓팅 결과 TOP 10"
   ─ GET /api/events/rankings/latest?limit=10 공개 API
   ─ 15초 폴링, 탭 hidden 시 pause
   ─ event === null → 섹션 자체 숨김 (첫 이벤트 종료 전까지)
   ─ 랭킹 페이지 latest-event 보드로 이어지는 진입 지점
   ────────────────────────────────────────── */

const POLL_INTERVAL_MS = 15_000;
const TOP_LIMIT = 10;

function formatMs(ms: number) {
  return (ms / 1000).toFixed(3) + 's';
}

export default function HomeLatestResults() {
  const [data, setData] = useState<LatestEventRankings | null>(null);
  const [isFirstLoad, setFirstLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;

    async function fetchOnce() {
      try {
        const res = await getLatestEventRankings(TOP_LIMIT);
        if (!aliveRef.current) return;
        setData(res);
        setHasError(false);
      } catch (e) {
        if (!aliveRef.current) return;
        // 홈에서는 조용히 실패. rate limit / 네트워크 이슈로 홈 전체 UX 방해 X.
        setHasError(true);
        if (process.env.NODE_ENV !== 'production' && e instanceof ApiError) {
          console.warn('[home] latest results fetch failed:', e.message);
        }
      } finally {
        if (aliveRef.current) setFirstLoad(false);
      }
    }

    fetchOnce();

    let timerId: ReturnType<typeof setInterval> | null = null;
    function startPolling() {
      if (timerId !== null) return;
      timerId = setInterval(fetchOnce, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (timerId === null) return;
      clearInterval(timerId);
      timerId = null;
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        fetchOnce();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'visible') startPolling();
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      aliveRef.current = false;
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  // 첫 로드 중엔 skeleton 노출.
  if (isFirstLoad) return <SkeletonSection />;

  // 조용히 실패 or 종료된 이벤트 없음 → 섹션 자체 숨김. 홈은 오밀조밀 밀도 유지.
  if (hasError && !data) return null;
  if (!data || !data.event) return null;

  const { event, rankings } = data;
  const venue = getAdminVenueOption(event.venueId);
  const posterUrl = safeImageUrl(venue?.posterImage);
  const venueName = event.venueName ?? venue?.name ?? event.venueId;
  const top = rankings.slice(0, TOP_LIMIT);

  return (
    <section aria-labelledby="latest-results-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="latest-results-heading"
            className="text-lg font-bold text-text"
          >
            최근 티켓팅 결과 TOP {TOP_LIMIT}
          </h2>
          <p className="text-xs text-text-tertiary truncate">
            방금 종료된 이벤트의 성공자 순위
          </p>
        </div>
        <Link
          href="/ranking?board=latest-event"
          className="text-sm font-semibold text-primary hover:underline shrink-0"
        >
          전체 순위 →
        </Link>
      </div>

      <div className="grid md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4">
        {/* 좌: 이벤트 카드 */}
        <Link
          href={`/event/${event.eventId}`}
          className="card overflow-hidden flex md:flex-col hover:border-border-strong transition-colors group"
        >
          <div className="w-24 md:w-full aspect-[3/4] shrink-0 relative bg-bg-subtle">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={venueName}
                fill
                sizes="(min-width: 768px) 220px, 96px"
                className="object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: safeHexColor(event.posterColor) }}
              >
                <span className="text-3xl font-black text-white/90 tracking-tight select-none">
                  {event.posterInitial || 'TR'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 p-3 md:p-4 space-y-1">
            <p className="text-[11px] font-semibold text-text-tertiary tracking-wide">
              가장 최근 종료
            </p>
            <p className="text-sm font-bold text-text truncate group-hover:text-primary transition-colors">
              {event.title}
            </p>
            <p className="text-xs text-text-secondary truncate">{venueName}</p>
            <p className="text-[11px] text-text-tertiary pt-1">
              상품 · <span className="text-text-secondary">{event.prize}</span>
            </p>
          </div>
        </Link>

        {/* 우: TOP 10 리스트 */}
        <div className="card overflow-hidden">
          {top.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              확정된 좌석이 없었습니다.
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {top.map((row, i) => (
                <li
                  key={`${row.rank}-${i}`}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-subtle transition-colors"
                >
                  <span
                    className={[
                      'w-7 shrink-0 text-center font-mono-tabular font-bold',
                      row.rank === 1
                        ? 'text-primary text-base'
                        : row.rank <= 3
                          ? 'text-text'
                          : 'text-text-secondary',
                    ].join(' ')}
                  >
                    {row.rank}
                  </span>
                  <span className="flex-1 truncate font-medium text-text">
                    {row.nickname}
                  </span>
                  <span className="text-xs text-text-tertiary font-mono-tabular hidden sm:inline">
                    {row.seatLabel}
                  </span>
                  <span className="font-mono-tabular font-bold text-text w-16 text-right shrink-0">
                    {formatMs(row.elapsedMs)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function SkeletonSection() {
  return (
    <section className="space-y-3 animate-pulse">
      <div className="flex items-baseline justify-between">
        <div className="h-5 w-40 bg-bg-subtle rounded" />
        <div className="h-4 w-16 bg-bg-subtle rounded" />
      </div>
      <div className="grid md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4">
        <div className="card overflow-hidden">
          <div className="w-full aspect-[3/4] bg-bg-subtle" />
        </div>
        <div className="card p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 bg-bg-subtle rounded" />
          ))}
        </div>
      </div>
    </section>
  );
}
