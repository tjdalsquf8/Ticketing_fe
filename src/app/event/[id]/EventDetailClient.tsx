'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TicketingDetailLayout, {
  type TicketingSession,
} from '@/components/booking/TicketingDetailLayout';
import EventRegistrationModal from '@/components/event/EventRegistrationModal';
import { formatCountdown, formatKstDateTime, toKstDate } from '@/lib/kst';
import { useAuth } from '@/contexts/AuthContext';
import {
  cancelEventRegistration,
  getEvent,
  registerForEvent,
  type EventDetail,
} from '@/lib/events';
import { ApiError } from '@/lib/errors';
import { getAdminVenueOption } from '@/data/live';
import { safeHexColor, safeImageUrl } from '@/lib/safe';

/* ──────────────────────────────────────────
   /event/[id] — 이벤트 상세 (클라이언트)
   ─ GET /api/events/:id (로그인 시 myRegistration 포함)
   ─ 상태: scheduled → 신청 필요 · 오픈 대기 · 티켓팅 참여
   ─ 액션: 신청(무료, 로그인 필수) · 취소 · 티켓팅 진입
   ────────────────────────────────────────── */

interface EventDetailClientProps {
  eventId: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function EventDetailClient({ eventId }: EventDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPending, setModalPending] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getEvent(eventId);
      setEvent(detail);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'EVENT_NOT_FOUND') {
        setEvent(null);
      } else {
        setError(e instanceof Error ? e.message : '이벤트를 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);


  const opensAtMs = event ? Date.parse(event.opensAt) : 0;
  const remainingMs = Math.max(0, opensAtMs - nowMs);
  const isOpenOrLater = event ? nowMs >= opensAtMs : false;
  const isClosed = event?.status === 'closed';
  const isCancelled = event?.status === 'cancelled';

  const registration = event?.myRegistration ?? null;
  const isRegistered =
    !!registration &&
    registration.status !== 'cancelled' &&
    registration.status !== 'refunded';

  const canBook = !!event && isRegistered && isOpenOrLater && !isClosed && !isCancelled;

  const disabledReason: string | undefined = (() => {
    if (!event) return undefined;
    if (isCancelled) return '취소된 이벤트';
    if (isClosed) return '종료된 이벤트';
    if (!isRegistered) return '먼저 참여 신청이 필요합니다';
    if (!isOpenOrLater) return `오픈까지 ${formatCountdown(remainingMs)}`;
    return undefined;
  })();

  const handleBook = () => {
    if (!event) return;
    if (!isRegistered) {
      if (!user) {
        router.push(`/login?next=/event/${event.eventId}`);
        return;
      }
      // 서버 계약(§사전 신청) 재검증 — 무의미한 POST 폭탄 방지.
      if (isCancelled) {
        setInlineError('취소된 이벤트는 신청할 수 없습니다.');
        return;
      }
      if (isClosed) {
        setInlineError('종료된 이벤트는 신청할 수 없습니다.');
        return;
      }
      const deadlineMs = Date.parse(event.registrationDeadline);
      if (Number.isFinite(deadlineMs) && Date.now() >= deadlineMs) {
        setInlineError('신청 마감 시각이 지났습니다.');
        return;
      }
      setInlineError(null);
      setModalError(null);
      setModalOpen(true);
      return;
    }
    router.push(`/event/${event.eventId}/wait`);
  };

  const handleConfirmRegister = useCallback(async () => {
    if (!event || modalPending) return;
    setModalPending(true);
    setModalError(null);
    try {
      await registerForEvent(event.eventId);
      setModalOpen(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message);
      } else {
        setModalError('신청 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setModalPending(false);
    }
  }, [event, modalPending, load]);

  const handleCancelRegistration = useCallback(async () => {
    if (!event || cancelPending) return;
    const deadlineText = formatKstDateTime(event.registrationDeadline);
    const ok = window.confirm(
      `신청을 취소하시겠어요? 취소는 신청 마감 시각(${deadlineText})까지만 가능합니다.`,
    );
    if (!ok) return;
    setCancelPending(true);
    setInlineError(null);
    try {
      await cancelEventRegistration(event.eventId);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setInlineError(err.message);
      } else {
        setInlineError('취소 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setCancelPending(false);
    }
  }, [event, cancelPending, load]);

  // ── 로딩/에러/404 케이스 ────────────────
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="card p-8 space-y-4 animate-pulse">
          <div className="h-6 w-1/2 bg-bg-subtle rounded" />
          <div className="h-4 w-1/3 bg-bg-subtle rounded" />
          <div className="h-32 bg-bg-subtle rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <div className="card p-8 text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-text">이벤트를 불러올 수 없어요</h1>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
          <button type="button" onClick={load} className="btn btn-solid">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <div className="card p-8 text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-text">이벤트를 찾을 수 없습니다</h1>
            <p className="text-sm text-text-secondary">
              요청하신 이벤트가 삭제됐거나 존재하지 않습니다. 이벤트 목록에서 다시 선택해 주세요.
            </p>
          </div>
          <Link href="/event" className="btn btn-solid inline-flex">
            이벤트 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const layoutSessions: TicketingSession[] = [
    {
      id: 'session-1',
      label: new Date(event.opensAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      opensAt: event.opensAt,
      totalSeats: event.totalSeats,
    },
  ];

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: '공연장', value: event.venueId },
    {
      label: '오픈',
      value: (
        <span className="font-mono-tabular">{formatDateTime(event.opensAt)}</span>
      ),
    },
    {
      label: '종료',
      value: (
        <span className="font-mono-tabular">{formatDateTime(event.closesAt)}</span>
      ),
    },
    {
      label: '총 좌석',
      value: (
        <span className="font-mono-tabular">
          {event.totalSeats.toLocaleString()}석
        </span>
      ),
    },
    {
      label: '신청자',
      value: (
        <span className="font-mono-tabular">
          {event.registeredCount.toLocaleString()}명
        </span>
      ),
    },
    { label: '상품', value: event.prize },
  ];

  const cancelDeadlineMs = event ? Date.parse(event.registrationDeadline) : 0;
  const canCancel = nowMs < cancelDeadlineMs;
  const deadlineText = event ? formatKstDateTime(event.registrationDeadline) : '';

  const rules: string[] = [
    '이벤트는 오픈 시각부터 진행됩니다.',
    '소요 시간 TOP 3에게 기프티콘이 즉시 지급됩니다.',
    `신청 마감 시각(${deadlineText}) 전까지 취소할 수 있습니다.`,
  ];

  const regStatus = registration?.status;

  const ctaFootnote: React.ReactNode = (() => {
    if (inlineError) {
      return <span className="text-danger-text">{inlineError}</span>;
    }
    // 종료 후 확정된 결과 상태
    if (regStatus === 'ticketed') {
      return (
        <span className="text-success-text font-medium">
          TOP 10 진입 · 결과가 확정됐습니다
        </span>
      );
    }
    if (regStatus === 'no_show') {
      return (
        <span className="text-text-secondary">
          이번엔 좌석을 잡지 못했어요. 다음 이벤트에 도전해 보세요.
        </span>
      );
    }
    if (regStatus === 'missed') {
      return (
        <span className="text-text-secondary">
          이번엔 참여하지 못했어요. 다음 이벤트에 미리 신청해 두세요.
        </span>
      );
    }
    if (regStatus === 'cancelled' || regStatus === 'refunded') {
      return (
        <span className="text-text-secondary">
          이전에 취소된 신청입니다. 다시 신청할 수 있어요.
        </span>
      );
    }
    if (isRegistered) {
      const message =
        event?.status === 'open'
          ? '✓ 오픈 진행 중 · 지금 티켓팅에 참여할 수 있습니다'
          : '✓ 참여 신청 완료 · 오픈 시각에 티켓팅 시작';
      return (
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-success-text font-medium">{message}</span>
          {canCancel ? (
            <button
              type="button"
              onClick={handleCancelRegistration}
              disabled={cancelPending}
              className="text-xs text-text-tertiary underline underline-offset-2 hover:text-danger-text disabled:opacity-50"
            >
              {cancelPending ? '취소 중…' : '신청 취소'}
            </button>
          ) : (
            <span className="text-xs text-text-tertiary">
              취소 마감({deadlineText}) 경과
            </span>
          )}
        </span>
      );
    }
    if (isCancelled) return '취소된 이벤트입니다.';
    if (isClosed) return '종료된 이벤트입니다.';
    if (!user) return '로그인 후 무료로 참여 신청할 수 있습니다.';
    return `신청 마감 시각(${deadlineText}) 전까지 취소할 수 있습니다.`;
  })();

  return (
    <>
      <TicketingDetailLayout
        mode="event"
        title={event.title}
        venueName={getAdminVenueOption(event.venueId)?.name ?? event.venueId}
        category={event.category}
        posterImage={safeImageUrl(getAdminVenueOption(event.venueId)?.posterImage)}
        posterInitial={event.posterInitial}
        posterColor={safeHexColor(event.posterColor)}
        infoRows={infoRows}
        availableDates={[toKstDate(event.opensAt)]}
        sessions={layoutSessions}
        selectedSessionId="session-1"
        canBook={canBook}
        disabledReason={disabledReason}
        onBook={handleBook}
        ctaLabel={isRegistered ? undefined : '참여 신청'}
        backHref="/event"
        backLabel="← 이벤트 목록"
        ctaFootnote={ctaFootnote}
        rules={rules}
      />
      <EventRegistrationModal
        open={modalOpen}
        eventTitle={event.title}
        pending={modalPending}
        errorMessage={modalError}
        onConfirm={handleConfirmRegister}
        onClose={() => {
          if (modalPending) return;
          setModalOpen(false);
          setModalError(null);
        }}
      />
    </>
  );
}
