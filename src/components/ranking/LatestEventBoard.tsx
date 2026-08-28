'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { formatKstDateTime } from '@/lib/kst';
import { getAdminVenueOption } from '@/data/live';
import { safeHexColor, safeImageUrl } from '@/lib/safe';
import {
  getLatestEventRankings,
  type LatestEventRankings,
  type LatestEventRankingEntry,
  type LatestEventInfo,
} from '@/lib/events';
import { ApiError } from '@/lib/errors';
import LatestEventMyRow from './LatestEventMyRow';

/* ──────────────────────────────────────────
   LatestEventBoard — /ranking?board=latest-event
   ─ getLatestEventRankings() 직접 호출 (백엔드 공개 API)
   ─ 10초 폴링, 탭 hidden 이면 pause (BE Cache-Control: public, max-age=5)
   ─ event === null (아직 종료된 이벤트 없음) 빈 상태 UI 필수
   ────────────────────────────────────────── */

const RANK_BADGE: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const POLL_INTERVAL_MS = 10_000;

function formatMs(ms: number) {
  return (ms / 1000).toFixed(3) + 's';
}

export default function LatestEventBoard() {
  const [data, setData] = useState<LatestEventRankings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFirstLoad, setFirstLoad] = useState(true);
  // 폴링 중 setState 가 언마운트 이후 발동되는 것을 방지.
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;

    async function fetchOnce() {
      try {
        const res = await getLatestEventRankings(100);
        if (!aliveRef.current) return;
        setData(res);
        setError(null);
      } catch (e) {
        if (!aliveRef.current) return;
        setError(e instanceof ApiError ? e.message : '랭킹을 불러오지 못했습니다.');
      } finally {
        if (aliveRef.current) setFirstLoad(false);
      }
    }

    fetchOnce();

    // 탭이 보일 때만 폴링. hidden 상태에서는 setInterval 을 걸지 않아
    // 브라우저 백그라운드 스로틀링·서버 부하를 함께 줄인다.
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

  if (isFirstLoad) return <SkeletonBoard />;

  if (error && !data) {
    return (
      <div className="card p-12 text-center space-y-3">
        <p className="text-base font-semibold text-text">
          랭킹을 불러오지 못했어요
        </p>
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  // 아직 종료된 이벤트가 하나도 없는 경우 (event === null)
  if (!data || !data.event) {
    return (
      <div className="card p-12 text-center space-y-3">
        <p className="text-base font-semibold text-text">
          아직 종료된 이벤트가 없어요
        </p>
        <p className="text-sm text-text-secondary">
          첫 이벤트가 마무리되면 이곳에 결과가 표시됩니다.
        </p>
        <div className="pt-2">
          <Link href="/event" className="btn btn-solid btn-sm">
            이벤트 보러가기
          </Link>
        </div>
      </div>
    );
  }

  const { event, rankings } = data;

  return (
    <div className="space-y-6">
      <EventCard event={event} />

      {rankings.length === 0 ? (
        <div className="card p-12 text-center space-y-2">
          <p className="text-base font-semibold text-text">
            참여자 기록이 없어요
          </p>
          <p className="text-sm text-text-secondary">
            이 이벤트에는 확정된 좌석이 없었습니다.
          </p>
        </div>
      ) : (
        <>
          <LatestEventMyRow rankings={rankings} />
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary w-12 whitespace-nowrap">
                    순위
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">
                    닉네임
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">
                    좌석
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">
                    소요 시간
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rankings.map((row, i) => (
                  <RankingRow key={`${row.rank}-${i}`} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-text-tertiary text-right">
            10초마다 자동 갱신 · 탭이 보이는 동안에만 폴링합니다.
          </p>
        </>
      )}
    </div>
  );
}

function EventCard({ event }: { event: LatestEventInfo }) {
  const venue = getAdminVenueOption(event.venueId);
  const posterImage = safeImageUrl(venue?.posterImage);
  const venueName = event.venueName ?? venue?.name ?? event.venueId;

  return (
    <Link
      href={`/event/${event.eventId}`}
      className="card overflow-hidden flex hover:border-border-strong transition-colors group"
    >
      <div className="w-28 sm:w-32 aspect-[3/4] shrink-0 relative bg-bg-subtle">
        {posterImage ? (
          <Image
            src={posterImage}
            alt={venueName}
            fill
            sizes="128px"
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
      <div className="flex-1 p-4 flex flex-col gap-1.5 min-w-0">
        <p className="text-[11px] font-semibold text-text-tertiary tracking-wide">
          가장 최근에 종료된 이벤트
        </p>
        <p className="text-base font-bold text-text truncate group-hover:text-primary transition-colors">
          {event.title}
        </p>
        <p className="text-xs text-text-secondary truncate">{venueName}</p>
        <div className="mt-auto pt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <p className="text-text-tertiary">오픈</p>
            <p className="font-mono-tabular font-semibold text-text truncate">
              {formatKstDateTime(event.opensAt)}
            </p>
          </div>
          <div>
            <p className="text-text-tertiary">상품</p>
            <p className="font-semibold text-text truncate">{event.prize}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RankingRow({ row }: { row: LatestEventRankingEntry }) {
  return (
    <tr className="hover:bg-bg-subtle transition-colors">
      <td className="px-4 py-3 font-mono-tabular font-semibold text-text-secondary">
        {RANK_BADGE[row.rank] ?? row.rank}
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-text">{row.nickname}</span>
      </td>
      <td className="px-4 py-3 text-right font-mono-tabular text-text-secondary">
        {row.seatLabel}
      </td>
      <td className="px-4 py-3 text-right font-mono-tabular font-bold text-text">
        {formatMs(row.elapsedMs)}
      </td>
    </tr>
  );
}

function SkeletonBoard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="card flex overflow-hidden">
        <div className="w-28 sm:w-32 aspect-[3/4] bg-bg-subtle" />
        <div className="flex-1 p-4 space-y-2">
          <div className="h-3 w-20 bg-bg-subtle rounded" />
          <div className="h-4 w-3/4 bg-bg-subtle rounded" />
          <div className="h-3 w-1/2 bg-bg-subtle rounded" />
        </div>
      </div>
      <div className="card h-64" />
    </div>
  );
}
