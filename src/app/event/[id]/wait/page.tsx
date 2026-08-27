'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getEvent,
  getEventSessionQueue,
  startEventSession,
  type EventDetail,
  type EventSession,
} from '@/lib/events';
import { ApiError, isEventRateLimitCode } from '@/lib/errors';

/* ──────────────────────────────────────────
   /event/[id]/wait — 대기실 (실 API 연동)
   ─ 오픈 전: opensAt 카운트다운
   ─ 오픈 도래 시: startEventSession 호출 → active면 book, queued면 큐 폴링
   ─ 종료 시: result 리다이렉트
   ────────────────────────────────────────── */

type Phase = 'countdown' | 'starting' | 'queued' | 'active' | 'closed' | 'error';

export default function WaitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [session, setSession] = useState<EventSession | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('countdown');
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadEvent = useCallback(async () => {
    try {
      const detail = await getEvent(id);
      setEvent(detail);
      if (detail.status === 'closed' || detail.status === 'cancelled') {
        router.replace(`/event/${id}/result`);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'EVENT_NOT_FOUND') {
        setError('이벤트를 찾을 수 없습니다.');
      } else {
        setError(e instanceof Error ? e.message : '이벤트를 불러올 수 없습니다.');
      }
      setPhase('error');
    }
  }, [id, router]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const opensAtMs = event ? Date.parse(event.opensAt) : Number.MAX_SAFE_INTEGER;
  const remainMs = Math.max(0, opensAtMs - nowMs);

  // 오픈 시점 도래 시 세션 시작 시도
  useEffect(() => {
    if (!event) return;
    if (phase !== 'countdown') return;
    if (nowMs < opensAtMs) return;
    setPhase('starting');
    startEventSession(event.eventId)
      .then((s) => {
        setSession(s);
        setQueuePosition(s.queuePosition);
        if (s.status === 'active') {
          router.replace(`/event/${id}/book?sid=${encodeURIComponent(s.sessionId)}&started=${encodeURIComponent(s.startedAt)}`);
        } else {
          setPhase('queued');
        }
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError) {
          if (e.code === 'AUTH_TOKEN_MISSING' || e.code === 'AUTH_INVALID_TOKEN') {
            router.replace(`/login?next=/event/${id}/wait`);
            return;
          }
          if (e.code === 'NOT_REGISTERED') {
            setError('이벤트 신청자만 참여할 수 있습니다. 상세 페이지에서 신청해 주세요.');
          } else if (e.code === 'EVENT_ALREADY_CLOSED') {
            router.replace(`/event/${id}/result`);
            return;
          } else {
            setError(e.message);
          }
        } else {
          setError('세션 시작에 실패했습니다.');
        }
        setPhase('error');
      });
  }, [event, phase, nowMs, opensAtMs, id, router]);

  // queued 상태 폴링
  useEffect(() => {
    if (phase !== 'queued' || !session) return;
    let alive = true;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      // 백그라운드 탭은 rate limit 예산 소진 방지 위해 skip.
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const q = await getEventSessionQueue(session.sessionId);
        if (!alive) return;
        setQueuePosition(q.queuePosition);
        if (q.ready) {
          router.replace(`/event/${id}/book?sid=${encodeURIComponent(session.sessionId)}&started=${encodeURIComponent(session.startedAt)}`);
        }
      } catch (e: unknown) {
        if (e instanceof ApiError) {
          // 429: 폴링 중단 후 사용자 유도. 자동 재시도 하지 않음 (BE 스펙).
          if (isEventRateLimitCode(e.code)) {
            stopped = true;
            setError(e.message);
            return;
          }
          setError(e.message);
        }
      }
    };
    const iv = setInterval(tick, 1000);
    tick();
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [phase, session, id, router]);

  const cdParts = useMemo(() => {
    if (remainMs <= 0) return { hh: '00', mm: '00', ss: '00' };
    const total = Math.ceil(remainMs / 1000);
    return {
      hh: String(Math.floor(total / 3600)).padStart(2, '0'),
      mm: String(Math.floor((total % 3600) / 60)).padStart(2, '0'),
      ss: String(total % 60).padStart(2, '0'),
    };
  }, [remainMs]);

  if (phase === 'error') {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-bg-subtle flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full card p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-text">진입할 수 없어요</h1>
          <p className="text-sm text-text-secondary">
            {error ?? '알 수 없는 오류가 발생했습니다.'}
          </p>
          <Link href={`/event/${id}`} className="btn btn-solid inline-flex">
            이벤트 상세로
          </Link>
        </div>
      </div>
    );
  }

  const isImminent = remainMs > 0 && remainMs <= 5 * 60 * 1000;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-bg-subtle flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-6">
        {/* 이벤트 요약 */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-primary tracking-wide">
            {event?.category ?? '이벤트'}
          </p>
          <h1 className="text-lg font-bold text-text">
            {event?.title ?? '이벤트 정보를 불러오는 중…'}
          </h1>
          <p className="text-xs text-text-secondary">{event?.venueId ?? ''}</p>
        </div>

        {/* 카운트다운 or 큐 카드 */}
        <div className="card p-8 space-y-6">
          {phase === 'queued' ? (
            <div className="text-center space-y-4">
              <p className="text-xs text-text-secondary">대기열 진입</p>
              <p className="text-5xl font-bold text-primary font-mono-tabular">
                {queuePosition ?? '—'}
                <span className="text-lg text-text-secondary ml-1">번째</span>
              </p>
              <p className="text-xs text-text-tertiary">
                순번이 되면 자동으로 좌석 선택 화면으로 이동합니다.
              </p>
            </div>
          ) : phase === 'starting' ? (
            <p className="text-center text-sm text-text-secondary">
              세션을 시작하는 중…
            </p>
          ) : (
            <>
              <div className="text-center">
                <p className="text-xs text-text-secondary mb-1">오픈까지</p>
                {isImminent && (
                  <p className="text-[11px] font-bold text-danger-text tracking-wide">
                    곧 오픈됩니다
                  </p>
                )}
              </div>
              <div className="flex items-end gap-1 justify-center">
                {[
                  { val: cdParts.hh, unit: '시간' },
                  { val: cdParts.mm, unit: '분' },
                  { val: cdParts.ss, unit: '초' },
                ].map(({ val, unit }, i) => (
                  <div key={unit} className="flex items-end gap-1">
                    {i > 0 && (
                      <span className="text-3xl font-light text-text-tertiary mb-1">
                        :
                      </span>
                    )}
                    <div className="text-center min-w-[3.5rem]">
                      <span
                        className={[
                          'font-mono-tabular text-5xl font-bold tracking-tight',
                          isImminent ? 'text-primary' : 'text-text',
                        ].join(' ')}
                      >
                        {val}
                      </span>
                      <p className="text-xs text-text-tertiary mt-1">{unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 안내 */}
        <div className="rounded-lg border border-info-border bg-info-bg px-4 py-3 space-y-1">
          <p className="text-xs text-info-text">
            · 오픈 시각이 되면 자동으로 좌석 선택 화면으로 이동합니다.
          </p>
          <p className="text-xs text-info-text">
            · 새로고침해도 대기 순서에 영향이 없습니다.
          </p>
        </div>

        {/* 취소 */}
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
