'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import TicketCard from '@/components/booking/TicketCard';
import { useAuth } from '@/contexts/AuthContext';
import { getLiveEventByEventId } from '@/data/live';
import { ApiError } from '@/lib/errors';
import { getTicket, type TicketDetail } from '@/lib/tickets';

interface Props {
  ticketId: string;
}

interface ErrorState {
  code: string;
  message: string;
}

function TicketCardSkeleton() {
  return (
    <div
      className="w-full rounded-2xl bg-bg-subtle animate-pulse"
      style={{ maxWidth: 700, minHeight: 220 }}
    />
  );
}

export default function TicketDetailClient({ ticketId }: Props) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTicket(ticketId);
      setTicket(data);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError({ code: e.code, message: e.message });
      } else {
        setError({
          code: 'UNKNOWN',
          message: e instanceof Error ? e.message : '티켓을 불러올 수 없습니다.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const backToList = (
    <Link
      href="/my/tickets"
      className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
    >
      ← 티켓 목록
    </Link>
  );

  // 에러 케이스별 안내 문구.
  // default 분기는 apiFetch(M-4) 의 마스킹(5xx/미매핑 4xx generic 치환) 에 의존하지만,
  // 코드가 UNKNOWN 이거나 메시지가 비어 있는 경우 추가 폴백으로 방어한다.
  const errorMessage = (() => {
    if (!error) return null;
    switch (error.code) {
      case 'TICKET_NOT_FOUND':
        return '존재하지 않는 티켓입니다.';
      case 'TICKET_FORBIDDEN':
        return '본인 티켓만 조회할 수 있습니다.';
      case 'VALIDATION_ERROR':
        return '잘못된 티켓 정보입니다.';
      default: {
        const msg = error.message?.trim();
        if (error.code === 'UNKNOWN' || !msg) {
          return '티켓 정보를 불러오지 못했습니다.';
        }
        return msg;
      }
    }
  })();

  const isFatalError =
    error?.code === 'TICKET_NOT_FOUND' ||
    error?.code === 'TICKET_FORBIDDEN' ||
    error?.code === 'VALIDATION_ERROR';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <header>{backToList}</header>

      {/* 로딩 */}
      {isLoading && !ticket && (
        <div className="flex justify-center">
          <TicketCardSkeleton />
        </div>
      )}

      {/* 에러 */}
      {error && !isLoading && (
        <div className="card p-8 space-y-4 text-center">
          <p className="text-base font-semibold text-text">{errorMessage}</p>
          <div className="flex justify-center gap-2">
            {!isFatalError && (
              <button type="button" onClick={load} className="btn btn-outline btn-sm">
                다시 시도
              </button>
            )}
            <Link href="/my/tickets" className="btn btn-solid btn-sm">
              목록으로
            </Link>
          </div>
        </div>
      )}

      {/* 성공 */}
      {ticket && !error && (
        <>
          <div className="flex justify-center">
            <TicketCard
              mode="live"
              eventTitle={
                getLiveEventByEventId(ticket.eventId)?.title ?? '실시간 회차'
              }
              seat={ticket.seatLabel}
              nickname={user?.name ?? '—'}
              elapsedMs={ticket.elapsedMs}
              ranked
              rankNumber={ticket.rankNumber}
              totalCount={ticket.totalParticipants}
              rankPercentile={
                ticket.rankPercentile ??
                (ticket.totalParticipants > 0
                  ? ((ticket.totalParticipants - ticket.rankNumber + 1) /
                      ticket.totalParticipants) *
                    100
                  : null)
              }
              serial={ticket.serial}
              issuedAt={new Date(ticket.issuedAt)}
            />
          </div>

          {/* rankPercentile 집계 전 안내 */}
          {ticket.rankPercentile === null && (
            <div className="max-w-xl mx-auto rounded-lg border border-info-border bg-info-bg px-4 py-3 text-center">
              <p className="text-xs text-info-text">
                최종 백분위 순위는 집계 완료 후 반영됩니다.
              </p>
            </div>
          )}

          {/* 하단 CTA */}
          <div className="flex gap-2 max-w-xl mx-auto">
            <Link href="/my/tickets" className="btn btn-outline flex-1">
              내 티켓 목록
            </Link>
            <Link href="/live" className="btn btn-solid flex-1">
              다른 회차 보기
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
