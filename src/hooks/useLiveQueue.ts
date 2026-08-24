'use client';

import { useEffect, useState } from 'react';
import { getLiveQueue, type LiveQueueState } from '@/lib/live';
import { ApiError } from '@/lib/errors';

/**
 * 라이브 세션 큐 폴링 훅.
 *
 * - sessionId 가 null 이면 폴링하지 않는다.
 * - initialState 로 `POST /sessions` 응답을 초기 값으로 주입 가능. 이미 active/ready 이면 폴링 시작 안 함.
 * - 폴링 주기 1초 (백엔드 rate limit 60회/분 이내).
 * - 응답 `ready === true` 이면 interval 즉시 clear, ready 값 노출.
 * - SESSION_NOT_FOUND(404) / FORBIDDEN(403) 는 error state 로 노출하고 폴링 중단.
 * - TOO_MANY_LIVE_REQUESTS(429) 는 조용히 다음 interval 로 넘김.
 * - 기타 tick 실패는 로그만 남기고 재시도.
 * - 언마운트 시 alive flag + clearInterval 로 race 방어.
 */

const POLL_INTERVAL_MS = 1_000;

interface UseLiveQueueResult {
  state: LiveQueueState | null;
  error: ApiError | null;
  ready: boolean;
}

export function useLiveQueue(
  sessionId: string | null,
  initialState: LiveQueueState | null = null,
): UseLiveQueueResult {
  const [state, setState] = useState<LiveQueueState | null>(initialState);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState(initialState);
      setError(null);
      return;
    }

    // initialState 가 이미 승격 상태이면 폴링 시작하지 않는다.
    const alreadyReady =
      initialState !== null &&
      initialState.sessionId === sessionId &&
      (initialState.ready || initialState.status === 'active');

    if (alreadyReady) {
      setState(initialState);
      setError(null);
      return;
    }

    let alive = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      // 백그라운드 탭 rate-limit 방어: 화면이 숨김이면 요청 자체를 건너뜀.
      // 사용자가 여러 탭을 열어도 활성 탭 하나만 60 req/min 예산을 소비.
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const next = await getLiveQueue(sessionId);
        if (!alive) return;
        setState(next);
        setError(null);
        if (next.ready) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError) {
          // 세션 소실/권한 오류는 폴링 중단하고 UI 로 노출.
          if (err.code === 'SESSION_NOT_FOUND' || err.code === 'FORBIDDEN') {
            setError(err);
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            return;
          }
          // 레이트리밋은 조용히 다음 tick 대기.
          if (err.code === 'TOO_MANY_LIVE_REQUESTS') {
            return;
          }
        }
        // 그 외 (네트워크 등)는 콘솔에만 남기고 다음 tick 재시도.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[useLiveQueue] tick failed', err);
        }
      }
    };

    // 초기 상태를 이미 UI 에 반영하되, 즉시 첫 폴링은 스킵하고 interval 만 등록.
    // initialState.sessionId 가 현재 sessionId 와 일치할 때만 한 tick 스킵 대상.
    const skipFirstTick =
      initialState !== null && initialState.sessionId === sessionId;

    if (skipFirstTick) {
      setState(initialState);
    } else {
      // 최초 진입: 즉시 1회 조회 후 interval 등록.
      void tick();
    }
    intervalId = setInterval(tick, POLL_INTERVAL_MS);

    // 탭이 백그라운드에서 다시 visible 로 돌아오면 최신 상태를 즉시 반영해 지연을 줄인다.
    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (!document.hidden) void tick();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      alive = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
    // initialState 는 마운트 시점 값을 기준으로 하고, sessionId 변경 시에만 재구성.
    // 매 tick 마다 초기화되지 않도록 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const ready = state?.ready === true || state?.status === 'active';

  return { state, error, ready };
}
