'use client';

import { useCallback, useEffect, useMemo, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  confirmEventSeat,
  getEvent,
  getEventSessionSeats,
  holdEventSeat,
  startEventSession,
  type EventDetail,
} from '@/lib/events';
import { ApiError, isEventRateLimitCode } from '@/lib/errors';

/* ──────────────────────────────────────────
   /event/[id]/book — 좌석 선택 (실 API 연동, 미니 UI)
   ─ URL: /event/[id]/book?sid=<sessionId>&started=<ISO>
   ─ sid 미주어지면 startEventSession 자동 호출 (재진입)
   ─ 좌석 목록 2초 폴링, 클릭 시 hold, "확정" 시 confirm → result 이동
   ─ 좌석 카탈로그는 서버 응답 seats[] 에 등장한 라벨만 표시 (임시 폴백)
   ────────────────────────────────────────── */

interface SeatState {
  seatLabel: string;
  status: 'available' | 'held' | 'sold';
}

const POLL_MS = 2_000;

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
  const [seats, setSeats] = useState<SeatState[]>([]);
  const [myHold, setMyHold] = useState<{
    seatLabel: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const stoppedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

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

  // 좌석 폴링
  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    stoppedRef.current = false;
    const tick = async () => {
      try {
        const snap = await getEventSessionSeats(sessionId);
        if (!alive) return;
        setSeats(snap.seats);
        setMyHold(snap.myHold);
      } catch (e: unknown) {
        if (e instanceof ApiError) {
          if (
            e.code === 'SESSION_NOT_FOUND' ||
            e.code === 'FORBIDDEN' ||
            e.code === 'NOT_ACTIVE' ||
            isEventRateLimitCode(e.code)
          ) {
            stoppedRef.current = true;
            setError(e.message);
          }
        }
      }
    };
    tick();
    const iv = setInterval(() => {
      if (stoppedRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      tick();
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [sessionId]);

  const closesAtMs = event ? Date.parse(event.closesAt) : Number.MAX_SAFE_INTEGER;
  const remainMs = Math.max(0, closesAtMs - nowMs);
  const totalSec = Math.ceil(remainMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const isUrgent = remainMs > 0 && remainMs <= 30_000;

  // 종료 시 result 이동
  useEffect(() => {
    if (!event) return;
    if (nowMs >= closesAtMs) {
      router.replace(`/event/${id}/result`);
    }
  }, [event, nowMs, closesAtMs, id, router]);

  const holdRemainMs = myHold
    ? Math.max(0, Date.parse(myHold.expiresAt) - nowMs)
    : null;

  const handleHold = useCallback(
    async (seatLabel: string) => {
      if (!sessionId || pending || confirming) return;
      setPending(true);
      setError(null);
      try {
        const hold = await holdEventSeat(sessionId, seatLabel);
        setMyHold(hold);
        // 로컬 시각 업데이트
        setSeats((prev) =>
          prev.map((s) =>
            s.seatLabel === seatLabel
              ? { ...s, status: 'held' }
              : s.status === 'held' && myHold?.seatLabel === s.seatLabel
                ? { ...s, status: 'available' }
                : s,
          ),
        );
      } catch (e: unknown) {
        if (e instanceof ApiError) setError(e.message);
      } finally {
        setPending(false);
      }
    },
    [sessionId, pending, confirming, myHold],
  );

  const handleConfirm = useCallback(async () => {
    if (!sessionId || !myHold || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await confirmEventSeat(sessionId, myHold.seatLabel);
      const q = new URLSearchParams({
        seat: myHold.seatLabel,
        rank: String(res.rankNumber),
        elapsed: String(res.elapsedMs),
      });
      if (res.ticketId !== null) q.set('ticket', String(res.ticketId));
      router.replace(`/event/${id}/result?${q.toString()}`);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.message);
        // errors.ts §5: HOLD_EXPIRED / SEAT_ALREADY_CONFIRMED 는 hold 무효화 후
        // 좌석 목록 재조회 유도. UI가 옛 hold 를 계속 붙들지 못하게 함.
        if (
          e.code === 'HOLD_EXPIRED' ||
          e.code === 'SEAT_ALREADY_CONFIRMED' ||
          e.code === 'SEAT_ALREADY_HELD'
        ) {
          setMyHold(null);
          try {
            const snap = await getEventSessionSeats(sessionId);
            setSeats(snap.seats);
            setMyHold(snap.myHold);
          } catch {
            /* 폴링 루프가 다음 tick에 재시도 */
          }
        }
      }
      setConfirming(false);
    }
  }, [sessionId, myHold, confirming, id, router]);

  const seatsSorted = useMemo(
    () => [...seats].sort((a, b) => a.seatLabel.localeCompare(b.seatLabel)),
    [seats],
  );

  return (
    <div
      className="flex flex-col relative bg-bg-subtle"
      style={{ minHeight: 'calc(100vh - 56px)' }}
    >
      {/* 종료까지 타이머 */}
      <div
        className={[
          'fixed top-16 right-4 z-40 card px-4 py-2.5 shadow-md flex items-baseline gap-2',
          isUrgent ? 'border-danger-border bg-danger-bg' : '',
        ].join(' ')}
      >
        <p
          className={[
            'text-[10px] font-semibold tracking-wide',
            isUrgent ? 'text-danger-text' : 'text-text-tertiary',
          ].join(' ')}
        >
          종료까지
        </p>
        <p
          className={[
            'font-mono-tabular text-lg font-bold tracking-tight',
            isUrgent ? 'text-danger-text' : 'text-text',
          ].join(' ')}
        >
          {mm}:{ss}
        </p>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-5">
        <header>
          <p className="text-xs text-text-tertiary font-mono-tabular">
            {startedAt && `세션 시작 ${new Date(startedAt).toLocaleTimeString('ko-KR')}`}
          </p>
          <h1 className="text-xl font-bold text-text">
            {event?.title ?? '좌석 선택'}
          </h1>
          <p className="text-sm text-text-secondary">{event?.venueId ?? ''}</p>
        </header>

        {/* hold 안내 */}
        <div className="card p-4 flex flex-wrap items-center gap-3 text-sm">
          {myHold ? (
            <>
              <span className="badge badge-primary">선점 중</span>
              <span className="text-text-secondary">
                좌석{' '}
                <strong className="text-text font-mono-tabular">
                  {myHold.seatLabel}
                </strong>
              </span>
              {holdRemainMs !== null && (
                <span
                  className={[
                    'font-mono-tabular font-bold',
                    holdRemainMs <= 5000 ? 'text-danger-text' : 'text-primary',
                  ].join(' ')}
                >
                  {Math.ceil(holdRemainMs / 1000)}s
                </span>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="btn btn-solid btn-sm ml-auto"
              >
                {confirming ? '확정 중…' : '이 좌석 확정'}
              </button>
            </>
          ) : (
            <p className="text-text-secondary">
              좌석을 클릭하면 30초 동안 임시 예약됩니다.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text"
          >
            {error}
          </div>
        )}

        {/* 좌석 그리드 (임시) — 좌석 카탈로그 전체 렌더는 후속. 지금은 API가 반환한 seats + myHold만. */}
        <div className="card p-4">
          <p className="text-xs text-text-tertiary mb-3">
            현재 서버에 등록된 좌석 {seatsSorted.length}개
          </p>
          {seatsSorted.length === 0 && !myHold ? (
            <p className="text-sm text-text-secondary py-8 text-center">
              첫 좌석을 선점하려면 아래에 원하는 좌석 라벨을 입력해 주세요.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {seatsSorted.map((s) => {
                const isMine = myHold?.seatLabel === s.seatLabel;
                const isSold = s.status === 'sold';
                const isHeld = s.status === 'held' && !isMine;
                return (
                  <button
                    key={s.seatLabel}
                    type="button"
                    disabled={isSold || isHeld || pending}
                    onClick={() => handleHold(s.seatLabel)}
                    className={[
                      'px-2 py-2 rounded-md border text-xs font-mono-tabular text-center transition-colors',
                      isMine
                        ? 'border-primary bg-primary-subtle text-primary'
                        : isSold
                          ? 'border-border bg-bg-muted text-text-disabled cursor-not-allowed'
                          : isHeld
                            ? 'border-border bg-bg-subtle text-text-tertiary cursor-not-allowed'
                            : 'border-border bg-bg-surface text-text hover:border-primary',
                    ].join(' ')}
                  >
                    {s.seatLabel}
                  </button>
                );
              })}
            </div>
          )}
          <SeatLabelInput onSubmit={handleHold} pending={pending} />
        </div>

        <div className="text-center">
          <Link
            href={`/event/${id}`}
            className="text-xs text-text-tertiary hover:text-text-secondary underline underline-offset-2"
          >
            이벤트 상세로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

function SeatLabelInput({
  onSubmit,
  pending,
}: {
  onSubmit: (label: string) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState('');
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v) return;
        onSubmit(v);
        setValue('');
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="예: A-1-1"
        className="flex-1 px-3 py-2 rounded-md border border-border bg-bg-surface text-text font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={pending}
        className="btn btn-outline btn-sm"
      >
        좌석 선점
      </button>
    </form>
  );
}
