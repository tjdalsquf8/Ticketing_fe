'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  confirmEventSeat,
  eventSeatsStreamUrl,
  getEvent,
  holdEventSeat,
  startEventSession,
  type EventDetail,
} from '@/lib/events';
import { getLiveEventByVenueSlug } from '@/data/live';
import { getVenueConfig } from '@/lib/venues';
import type { VenueConfig } from '@/types/ticketing';
import BookingFlow from '@/components/booking/BookingFlow';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   /event/[id]/book — 좌석 선택
   ─ URL: /event/[id]/book?sid=<sessionId>&started=<ISO>
   ─ sid 미주어지면 startEventSession 자동 호출 (재진입)
   ─ 실시간 티켓팅과 동일한 BookingFlow(zone→좌석 그리드) 재사용,
     hold/confirm/seat-fetch만 이벤트 세션 API로 주입한다.
   ────────────────────────────────────────── */

const EVENT_API = {
  holdSeat: holdEventSeat,
  confirmSeat: confirmEventSeat,
};

export default function EventBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const sp = useSearchParams();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    sp.get('sid'),
  );
  const [startedAt, setStartedAt] = useState<string | null>(() =>
    sp.get('started'),
  );
  const [error, setError] = useState<string | null>(null);
  // 백엔드 venue config(geometry). 실패 시 FE 정적 카탈로그(liveEvent.venue)로 폴백.
  const [venueConfig, setVenueConfig] = useState<VenueConfig | null>(null);

  // 이벤트 로드 + 세션 fallback 시작
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const detail = await getEvent(id);
        if (!alive) return;
        setEvent(detail);
        if (detail.status === 'closed' || detail.status === 'cancelled') {
          router.replace(`/event/${id}/result`);
          return;
        }
        if (!sessionId) {
          const s = await startEventSession(detail.eventId);
          if (!alive) return;
          setSessionId(s.sessionId);
          setStartedAt(s.startedAt);
          if (s.status !== 'active') {
            router.replace(`/event/${id}/wait`);
          }
        }
      } catch (e: unknown) {
        if (e instanceof ApiError) {
          if (e.code === 'AUTH_TOKEN_MISSING' || e.code === 'AUTH_INVALID_TOKEN') {
            router.replace(`/login?next=/event/${id}/wait`);
            return;
          }
          if (e.code === 'NOT_REGISTERED') {
            router.replace(`/event/${id}`);
            return;
          }
          if (e.code === 'EVENT_ALREADY_CLOSED' || e.code === 'EVENT_NOT_OPEN') {
            router.replace(`/event/${id}/result`);
            return;
          }
          setError(e.message);
        } else {
          setError('이벤트를 불러올 수 없습니다.');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, sessionId, router]);

  // event.venueId(slug)로 실제 공연장 좌석 배치(VenueConfig) 조회 — 실시간 티켓팅과 동일 카탈로그.
  const liveEvent = event ? getLiveEventByVenueSlug(event.venueId) : null;

  // 백엔드 venue config 조회. 실시간/이벤트 티켓팅 공용 geometry 소스.
  useEffect(() => {
    if (!event) return;
    let alive = true;
    (async () => {
      try {
        const { config } = await getVenueConfig(event.venueId);
        if (alive) setVenueConfig(config);
      } catch {
        // 폴백: FE 정적 카탈로그(liveEvent.venue) 그대로 사용.
      }
    })();
    return () => {
      alive = false;
    };
  }, [event]);

  const handleConfirmed = useCallback(
    (result: { rankNumber: number; elapsedMs: number }, seatLabel: string) => {
      const q = new URLSearchParams({
        seat: seatLabel,
        rank: String(result.rankNumber),
        elapsed: String(result.elapsedMs),
      });
      router.replace(`/event/${id}/result?${q.toString()}`);
    },
    [id, router],
  );

  const bookingMeta = useMemo(() => {
    if (!event) return null;
    const opensAtDate = new Date(Date.parse(event.opensAt));
    return {
      eventTitle: event.title,
      venueName: venueConfig?.name ?? liveEvent?.venueName ?? event.venueId,
      date: opensAtDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
      }),
      time: opensAtDate.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }, [event, liveEvent, venueConfig]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-danger-text">{error}</p>
        <Link href={`/event/${id}`} className="btn btn-neutral btn-sm">
          이벤트 상세로 돌아가기
        </Link>
      </div>
    );
  }

  if (!event || !sessionId || !bookingMeta) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-text-secondary">좌석 정보를 불러오는 중…</p>
      </div>
    );
  }

  const venue = venueConfig ?? liveEvent?.venue;
  if (!venue) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
        <span className="badge badge-warning">좌석 배치 정보 누락</span>
        <h3 className="text-lg font-bold text-text">
          좌석 배치를 표시할 수 없습니다
        </h3>
        <p className="text-sm text-text-secondary">
          관리자에게 문의하거나 다른 이벤트를 이용해 주세요.
        </p>
        <Link href={`/event/${id}`} className="btn btn-neutral btn-sm">
          이벤트 상세로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <BookingFlow
        venue={venue}
        meta={bookingMeta}
        mode="live"
        startedAt={startedAt ?? undefined}
        liveMode={{
          sessionId,
          roundId: event.eventId,
          seatsStreamUrl: eventSeatsStreamUrl(event.eventId, sessionId),
          onConfirmed: handleConfirmed,
          api: EVENT_API,
        }}
        onBack={() => router.replace(`/event/${id}`)}
      />
    </div>
  );
}
