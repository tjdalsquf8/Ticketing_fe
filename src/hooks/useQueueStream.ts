'use client';

import { useEffect, useState } from 'react';
import { openSseStream } from '@/lib/sse';
import type { LiveQueueState } from '@/lib/live';
import { ApiError } from '@/lib/errors';

/**
 * 대기열 순번 SSE 구독 훅 (회차·이벤트 공용).
 *
 * - `streamUrl` 이 null 이면 연결하지 않는다.
 * - `initialState` 로 `POST /sessions` 응답을 초기 값으로 주입 가능.
 *   이미 active/ready 이면 연결 자체를 하지 않는다 (좌석 스트림으로 바로 넘어간다).
 * - `snapshot`(최초 1회) / `queue_update`(순번 변경 시) 이벤트를 그대로 state 에 반영.
 * - `ready === true`(active 승격) 또는 `status === 'failed'` 면 연결을 닫는다.
 *   BE 계약상 대기 중엔 queue 스트림만, active 가 되면 seats 스트림만 열어 둔다.
 * - 세션 소실/권한 오류(404/403)는 error state 로 노출하고 재연결하지 않는다.
 * - 언마운트 시 연결 정리.
 */

interface UseQueueStreamResult {
  state: LiveQueueState | null;
  error: ApiError | null;
  ready: boolean;
}

export function useQueueStream(
  streamUrl: string | null,
  initialState: LiveQueueState | null = null,
): UseQueueStreamResult {
  const [state, setState] = useState<LiveQueueState | null>(initialState);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    // set-state-in-effect 룰 예외: 외부 prop(streamUrl) 변경에 따른 로컬 리셋은 대체 경로가 없다.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!streamUrl) {
      setState(initialState);
      setError(null);
      return;
    }

    setError(null);
    if (initialState) setState(initialState);
    /* eslint-enable react-hooks/set-state-in-effect */

    // 이미 승격된 세션이면 스트림을 열 필요가 없다.
    if (initialState?.ready || initialState?.status === 'active') return;

    let close: (() => void) | null = null;
    let closed = false;
    const stop = () => {
      closed = true;
      close?.();
      close = null;
    };

    close = openSseStream(streamUrl, {
      onEvent: (name, data) => {
        if (closed) return;
        if (name !== 'snapshot' && name !== 'queue_update') return;
        const next = data as LiveQueueState;
        setState(next);
        // 승격 완료 또는 이탈 처리 — 더 받을 것이 없다.
        if (next.ready || next.status === 'failed') stop();
      },
      onFatal: (err) => {
        if (closed) return;
        setError(err);
        stop();
      },
    });

    return () => {
      stop();
    };
    // initialState 는 마운트/URL 변경 시점 값만 쓴다 (매 갱신마다 재연결 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  const ready = state?.ready === true || state?.status === 'active';

  return { state, error, ready };
}
