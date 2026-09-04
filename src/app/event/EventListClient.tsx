'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import EventCalendar, {
  type CalendarEvent,
} from '@/components/event/EventCalendar';
import EventRegistrationModal from '@/components/event/EventRegistrationModal';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminVenueOption } from '@/data/live';
import {
  formatKstDateTime,
  getKstCurrentYm,
  toKstDate,
} from '@/lib/kst';
import {
  getEventsCalendar,
  getNearestEvent,
  listEvents,
  listMyEventRegistrations,
  registerForEvent,
  type EventListItem,
  type EventStatus,
  type RegistrationStatus,
} from '@/lib/events';
import { myRegistrationBadge } from '@/lib/eventBadge';
import { ApiError } from '@/lib/errors';
import { safeHexColor, safeImageUrl } from '@/lib/safe';

/* ──────────────────────────────────────────
   EventListClient — /event 상단 캘린더 + 하단 리스트
   ─ 실제 API 연동: GET /api/events, /api/events/calendar, /api/events/nearest
   ─ 참여 신청: POST /api/events/:id/registrations (보유 티켓 사용)
   ────────────────────────────────────────── */

const STATUS_LABEL: Record<EventStatus, { text: string; cls: string }> = {
  scheduled: { text: '예정', cls: 'badge-info' },
  open: { text: '진행 중', cls: 'badge-danger' },
  closed: { text: '종료', cls: 'badge-neutral' },
  cancelled: { text: '취소', cls: 'badge-neutral' },
};

export default function EventListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshMe } = useAuth();

  const ymParam = searchParams.get('ym');
  const ym = useMemo(() => {
    if (ymParam && /^\d{4}-\d{2}$/.test(ymParam)) return ymParam;
    return getKstCurrentYm();
  }, [ymParam]);

  const [listItems, setListItems] = useState<EventListItem[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarEvent[]>([]);
  const [nearest, setNearest] = useState<EventListItem | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalTargetId, setModalTargetId] = useState<number | null>(null);
  const [modalPending, setModalPending] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  // eventId → 내 registration status. 취소·환불 포함(배지 매트릭스에 사용).
  const [myRegMap, setMyRegMap] = useState<Map<number, RegistrationStatus>>(
    () => new Map(),
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: eventList }, calendar, nearestEv, myRegs] = await Promise.all([
        listEvents({ limit: 100 }),
        getEventsCalendar(ym),
        getNearestEvent().catch(() => null),
        user
          ? listMyEventRegistrations({ limit: 100 }).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] as Awaited<ReturnType<typeof listMyEventRegistrations>>['data'] }),
      ]);
      setListItems(eventList);
      setNearest(nearestEv ?? null);
      const flat: CalendarEvent[] = calendar.days.flatMap((day) =>
        day.events.map((ev) => ({
          id: String(ev.eventId),
          title: ev.title,
          prize: ev.prize,
          opensAtKstDate: toKstDate(ev.opensAt),
          status: ev.status,
        })),
      );
      setCalendarDays(flat);
      // 같은 eventId 에 대해 여러 registration 이 있으면 가장 최근(createdAt DESC) 것을 사용.
      const nextMap = new Map<number, RegistrationStatus>();
      const sorted = [...myRegs.data].sort(
        (a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''),
      );
      for (const r of sorted) {
        if (!nextMap.has(r.eventId)) nextMap.set(r.eventId, r.status);
      }
      setMyRegMap(nextMap);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '이벤트 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [ym, user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const modalTarget = useMemo(
    () =>
      modalTargetId
        ? listItems.find((e) => e.eventId === modalTargetId) ?? null
        : null,
    [modalTargetId, listItems],
  );

  const handleChangeYm = useCallback(
    (nextYm: string) => {
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      sp.set('ym', nextYm);
      router.replace(`/event?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleClickCalendarEvent = useCallback(
    (eventId: string) => {
      router.push(`/event/${eventId}`);
    },
    [router],
  );

  const handleOpenRegistration = useCallback(
    (eventId: number) => {
      if (!user) {
        router.push(`/login?next=/event`);
        return;
      }
      setModalError(null);
      setModalTargetId(eventId);
    },
    [router, user],
  );

  const handleCloseRegistration = useCallback(() => {
    if (modalPending) return;
    setModalTargetId(null);
    setModalError(null);
  }, [modalPending]);

  const handleConfirmRegistration = useCallback(async () => {
    if (!modalTarget || modalPending) return;
    setModalPending(true);
    setModalError(null);
    try {
      await registerForEvent(modalTarget.eventId);
      setMyRegMap((prev) => {
        const next = new Map(prev);
        next.set(modalTarget.eventId, 'pending');
        return next;
      });
      setModalTargetId(null);
      loadAll();
      refreshMe();
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message);
      } else {
        setModalError('신청 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setModalPending(false);
    }
  }, [modalTarget, modalPending, loadAll, refreshMe]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* 헤더 */}
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">유료 이벤트</h1>
        <p className="text-sm text-text-secondary">
          보유 티켓으로 도전하고, 소요 시간 TOP 3에게 기프티콘이 즉시 지급됩니다.
        </p>
      </header>

      {/* 캘린더 */}
      <EventCalendar
        ym={ym}
        events={calendarDays}
        onChangeYm={handleChangeYm}
        onClickEvent={handleClickCalendarEvent}
      />

      {/* 에러 배너 */}
      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 flex items-center justify-between gap-3"
        >
          <p className="text-sm text-danger-text">{error}</p>
          <button
            type="button"
            onClick={loadAll}
            className="btn btn-outline btn-sm shrink-0"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 리스트 */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text">전체 이벤트</h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6 flex gap-4 animate-pulse">
                <div className="w-32 h-24 bg-bg-subtle rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-bg-subtle rounded" />
                  <div className="h-3 w-1/3 bg-bg-subtle rounded" />
                  <div className="h-3 w-1/2 bg-bg-subtle rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : listItems.length === 0 ? (
          <div className="card p-12 text-center space-y-2">
            <p className="text-lg font-bold text-text">아직 등록된 이벤트가 없어요</p>
            <p className="text-sm text-text-secondary">
              새로운 이벤트가 곧 열립니다. 조금만 기다려 주세요.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {listItems.map((ev) => {
              const isNearest = nearest?.eventId === ev.eventId;
              const isCancelled = ev.status === 'cancelled';
              const isClosed = ev.status === 'closed';
              const isOpen = ev.status === 'open';
              const regStatus = myRegMap.get(ev.eventId);
              const regBadge = myRegistrationBadge(regStatus, ev.status);
              // 종료/취소 이후 결과가 확정된 registration
              const isRegTerminal =
                regStatus === 'ticketed' ||
                regStatus === 'no_show' ||
                regStatus === 'missed' ||
                regStatus === 'cancelled' ||
                regStatus === 'refunded';
              // 재신청 가능(신청 안 함 또는 취소 후 재도전)
              const canRegister =
                !regStatus ||
                regStatus === 'cancelled' ||
                regStatus === 'refunded';
              const st = STATUS_LABEL[ev.status];
              const venue = getAdminVenueOption(ev.venueId);

              return (
                <li key={ev.eventId}>
                  <div className="card overflow-hidden flex flex-col sm:flex-row">
                    {/* 포스터 */}
                    <Link
                      href={`/event/${ev.eventId}`}
                      className="sm:w-48 aspect-[4/3] sm:aspect-auto relative shrink-0 group bg-bg-subtle"
                    >
                      {safeImageUrl(venue?.posterImage) ? (
                        <Image
                          src={safeImageUrl(venue?.posterImage) as string}
                          alt={venue?.name ?? ev.title}
                          fill
                          sizes="(min-width: 640px) 192px, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ backgroundColor: safeHexColor(ev.posterColor) }}
                        >
                          <span className="text-5xl font-black text-white/90 tracking-tight select-none">
                            {ev.posterInitial || 'TR'}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[10px] font-semibold text-white tracking-wide z-10">
                        {ev.category}
                      </div>
                    </Link>

                    {/* 정보 */}
                    <div className="flex-1 p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/event/${ev.eventId}`} className="block group">
                            <h3 className="text-lg font-bold text-text truncate group-hover:text-primary transition-colors">
                              {ev.title}
                            </h3>
                            <p className="text-sm text-text-secondary mt-0.5 truncate">
                              {venue?.name ?? ev.venueId}
                            </p>
                          </Link>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`badge ${st.cls}`}>{st.text}</span>
                          {regBadge && (
                            <span className={`badge ${regBadge.cls}`}>
                              {regBadge.text}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-text-tertiary">오픈 (KST)</p>
                          <p className="mt-0.5 font-mono-tabular font-semibold text-text">
                            {formatKstDateTime(ev.opensAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-tertiary">참여비</p>
                          <p className="mt-0.5 font-mono-tabular font-semibold text-text">
                            {ev.entryFeePoints}매
                          </p>
                        </div>
                        <div>
                          <p className="text-text-tertiary">좌석</p>
                          <p className="mt-0.5 font-mono-tabular font-semibold text-text">
                            {ev.totalSeats.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-tertiary">상품</p>
                          <p className="mt-0.5 font-semibold text-text truncate">
                            {ev.prize}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-3 flex items-center justify-between gap-3 border-t border-border-subtle">
                        <p className="text-xs text-text-secondary truncate">
                          신청자 <strong className="text-text">{ev.registeredCount}</strong>명
                        </p>
                        {regStatus === 'entered' && isOpen ? (
                          <Link
                            href={`/event/${ev.eventId}/wait`}
                            className="btn btn-solid btn-sm shrink-0"
                          >
                            티켓팅 이어하기
                          </Link>
                        ) : regStatus === 'pending' && isOpen ? (
                          <Link
                            href={`/event/${ev.eventId}/wait`}
                            className="btn btn-solid btn-sm shrink-0"
                          >
                            지금 참여
                          </Link>
                        ) : regStatus === 'ticketed' ? (
                          <Link
                            href={`/event/${ev.eventId}/result`}
                            className="btn btn-outline btn-sm shrink-0"
                          >
                            결과 보기
                          </Link>
                        ) : isRegTerminal ? (
                          <span className="text-sm font-semibold text-text-tertiary shrink-0">
                            {regBadge?.text ?? '종료'}
                          </span>
                        ) : regStatus === 'pending' || regStatus === 'entered' ? (
                          <span className="text-sm font-semibold text-text-tertiary shrink-0">
                            신청 완료
                          </span>
                        ) : isClosed || isCancelled ? (
                          <span className="text-sm font-semibold text-text-tertiary shrink-0">
                            {isCancelled ? '취소됨' : '종료'}
                          </span>
                        ) : isNearest && canRegister ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRegistration(ev.eventId)}
                            className="btn btn-solid btn-sm shrink-0"
                          >
                            참여 신청 ({ev.entryFeePoints}매)
                          </button>
                        ) : (
                          <Link
                            href={`/event/${ev.eventId}`}
                            className="btn btn-outline btn-sm shrink-0"
                          >
                            자세히 보기
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <EventRegistrationModal
        open={!!modalTarget}
        eventTitle={modalTarget?.title ?? ''}
        entryFeeTickets={modalTarget?.entryFeePoints ?? 0}
        currentTickets={user?.ticketBalance ?? Number.POSITIVE_INFINITY}
        pending={modalPending}
        errorMessage={modalError}
        onConfirm={handleConfirmRegistration}
        onClose={handleCloseRegistration}
      />
    </div>
  );
}
