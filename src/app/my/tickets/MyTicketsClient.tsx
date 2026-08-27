'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getMyTickets, type TicketListItem, type TicketListMeta } from '@/lib/tickets';
import { getLiveEventByEventId } from '@/data/live';
import { getEvent, type EventDetail } from '@/lib/events';
import { getAdminVenueOption } from '@/data/live';
import { safeImageUrl } from '@/lib/safe';

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())}`;
}

interface RowMeta {
  title: string;
  venueName: string;
  poster?: string;
  badgeLabel: string;
}

function TicketRow({ ticket, meta }: { ticket: TicketListItem; meta: RowMeta }) {
  const timeStr = (ticket.elapsedMs / 1000).toFixed(3);

  return (
    <Link
      href={`/my/tickets/${ticket.ticketId}`}
      className="card p-4 flex items-stretch gap-4 hover:border-primary transition-colors"
    >
      {/* 좌측 포스터 */}
      <div className="relative w-20 h-28 sm:w-24 sm:h-32 shrink-0 rounded-md overflow-hidden bg-bg-muted">
        {meta.poster ? (
          <Image
            src={meta.poster}
            alt={meta.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-text-tertiary">
            NO IMAGE
          </div>
        )}
      </div>

      {/* 중앙 정보 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-bg-subtle text-text-tertiary">
              {meta.badgeLabel}
            </span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-text truncate">
            {meta.title}
          </p>
          <p className="text-xs text-text-secondary truncate">{meta.venueName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <span className="badge badge-neutral font-mono-tabular">
            좌석 {ticket.seatLabel}
          </span>
          <span className="badge badge-primary font-mono-tabular">
            #{ticket.rankNumber}위
          </span>
          <span className="text-xs font-mono-tabular text-text-secondary">
            {timeStr}s
          </span>
        </div>
      </div>

      {/* 우측 발급일 + CTA */}
      <div className="hidden sm:flex flex-col items-end justify-between shrink-0 py-0.5">
        <p className="text-xs text-text-tertiary font-mono-tabular">
          {formatDate(ticket.issuedAt)}
        </p>
        <span className="text-xs font-semibold text-primary">상세 →</span>
      </div>
    </Link>
  );
}

function TicketRowSkeleton() {
  return (
    <div className="card p-4 flex items-stretch gap-4">
      <div className="w-20 h-28 sm:w-24 sm:h-32 shrink-0 rounded-md bg-bg-subtle animate-pulse" />
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-bg-subtle rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-bg-subtle rounded animate-pulse" />
        </div>
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-16 bg-bg-subtle rounded animate-pulse" />
          <div className="h-5 w-14 bg-bg-subtle rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function MyTicketsClient() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [meta, setMeta] = useState<TicketListMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventMap, setEventMap] = useState<Map<number, EventDetail>>(
    () => new Map(),
  );

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await getMyTickets({ page: nextPage, limit: PAGE_SIZE });
      setTickets(data);
      setMeta(meta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '티켓 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  // 이벤트 티켓(roundId=null)에 필요한 이벤트 메타를 병렬 조회.
  // getEvent 실패는 조용히 무시 — 폴백 라벨로 렌더.
  useEffect(() => {
    const eventIds = Array.from(
      new Set(
        tickets
          .filter((t) => t.roundId == null && typeof t.eventId === 'number')
          .map((t) => t.eventId as number)
          .filter((id) => !eventMap.has(id)),
      ),
    );
    if (eventIds.length === 0) return;
    let alive = true;
    Promise.all(
      eventIds.map((id) =>
        getEvent(id)
          .then((ev) => [id, ev] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (!alive) return;
      setEventMap((prev) => {
        const next = new Map(prev);
        for (const r of results) {
          if (r) next.set(r[0], r[1]);
        }
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, [tickets, eventMap]);

  const rowMetaOf = (ticket: TicketListItem): RowMeta => {
    // 이벤트 티켓
    if (ticket.roundId == null && ticket.eventId != null) {
      const ev = eventMap.get(ticket.eventId);
      const venue = ev ? getAdminVenueOption(ev.venueId) : undefined;
      return {
        title: ev?.title ?? '유료 이벤트',
        venueName: venue?.name ?? ev?.venueId ?? '—',
        poster: safeImageUrl(venue?.posterImage),
        badgeLabel: '유료 이벤트',
      };
    }
    // 라이브 티켓 — 기존 카탈로그 조회 유지
    const live = ticket.eventId != null ? getLiveEventByEventId(ticket.eventId) : null;
    return {
      title: live?.title ?? '실시간 회차',
      venueName: live?.venueName ?? '—',
      poster: safeImageUrl(live?.posterImage),
      badgeLabel: '실시간',
    };
  };

  const totalPages = meta ? Math.max(1, Math.ceil(meta.totalCount / (meta.size || PAGE_SIZE))) : 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-text">내 티켓</h1>
        <p className="text-sm text-text-secondary">
          실시간 티켓팅 · 유료 이벤트에서 순위권 진입 시 발급받은 티켓입니다.
        </p>
      </header>

      {/* 로딩 스켈레톤 */}
      {isLoading && tickets.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <TicketRowSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && !isLoading && (
        <div className="card p-6 space-y-3 text-center">
          <p className="text-sm text-danger-text">{error}</p>
          <button
            type="button"
            onClick={() => load(page)}
            className="btn btn-outline btn-sm"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && tickets.length === 0 && (
        <div className="card p-10 text-center space-y-4">
          <p className="text-base font-semibold text-text">
            아직 획득한 티켓이 없습니다
          </p>
          <p className="text-sm text-text-secondary">
            실시간 이벤트에서 TOP 10 안에 들면 티켓이 자동 발급됩니다.
          </p>
          <div className="pt-2">
            <Link href="/live" className="btn btn-solid">
              실시간 이벤트 보러가기
            </Link>
          </div>
        </div>
      )}

      {/* 목록 */}
      {!isLoading && !error && tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketRow key={t.ticketId} ticket={t} meta={rowMetaOf(t)} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {!error && meta && meta.totalCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => canPrev && setPage((p) => p - 1)}
            disabled={!canPrev || isLoading}
            className="btn btn-outline btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← 이전
          </button>
          <p className="text-xs text-text-secondary font-mono-tabular">
            {page} / {totalPages}
            <span className="ml-2 text-text-tertiary">
              (총 {meta.totalCount}매)
            </span>
          </p>
          <button
            type="button"
            onClick={() => canNext && setPage((p) => p + 1)}
            disabled={!canNext || isLoading}
            className="btn btn-outline btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
