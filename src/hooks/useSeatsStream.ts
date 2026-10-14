'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { openSseStream } from '@/lib/sse';
import type {
  LiveHold,
  LiveSeatMap,
  LiveSeatStatus,
  LiveSeatUpdate,
} from '@/lib/live';
import { ApiError } from '@/lib/errors';

/* ─────────────────────────────────────────────────────────
   useSeatsStream — 좌석맵 SSE 구독 훅 (회차·이벤트 공용)

   ─ `snapshot`: 전체 좌석 + myHold. 최초 1회.
   ─ `seat_update`: 변경된 좌석 한 건. 해당 좌석 status 만 갱신한다
     (서버가 매번 전체를 다시 주지 않는다).
   ─ 404/403 등 연결 자체가 거절되면 error 로 노출하고 재연결하지 않는다.
   ─ refetch(): 스트림을 다시 열어 snapshot 부터 새로 받는다 (hold 만료 복구용).
   ─ hold/confirm 성공 직후엔 서버 push 를 기다리지 않고 로컬 delta 를 먼저 반영.
   ───────────────────────────────────────────────────────── */

interface MyHold {
  seatLabel: string;
  expiresAt: string;
}

interface UseSeatsStreamResult {
  seatMap: Map<string, LiveSeatStatus>;
  myHold: MyHold | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
  onHoldSuccess: (hold: LiveHold) => void;
  onConfirmSuccess: (seatLabel: string) => void;
}

export function useSeatsStream(streamUrl: string | null): UseSeatsStreamResult {
  const [seatMap, setSeatMap] = useState<Map<string, LiveSeatStatus>>(new Map());
  const [myHold, setMyHold] = useState<MyHold | null>(null);
  const [loading, setLoading] = useState<boolean>(streamUrl !== null);
  const [error, setError] = useState<ApiError | null>(null);
  const [reconnectTick, setReconnectTick] = useState(0);

  useEffect(() => {
    if (!streamUrl) {
      // URL 이 null 로 바뀌면(세션 종료·이탈) 훅 상태를 초기화한다.
      // set-state-in-effect 룰 예외: 외부 prop 변경에 대한 로컬 리셋은 대체 경로가 없다.
      /* eslint-disable react-hooks/set-state-in-effect */
      setSeatMap(new Map());
      setMyHold(null);
      setError(null);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let closed = false;
    let close: (() => void) | null = null;
    const stop = () => {
      closed = true;
      close?.();
      close = null;
    };

    close = openSseStream(streamUrl, {
      onEvent: (name, data) => {
        if (closed) return;
        if (name === 'snapshot') {
          const snapshot = data as LiveSeatMap;
          const next = new Map<string, LiveSeatStatus>();
          for (const seat of snapshot.seats) next.set(seat.seatLabel, seat.status);
          setSeatMap(next);
          setMyHold(snapshot.myHold);
          setError(null);
          setLoading(false);
          return;
        }
        if (name === 'seat_update') {
          const update = data as LiveSeatUpdate;
          setSeatMap((prev) => {
            const next = new Map(prev);
            next.set(update.seatLabel, update.status);
            return next;
          });
          // 내가 잡고 있던 좌석이 held 가 아니게 되면(TTL 만료·타인 확정) 내 hold 도 해제.
          setMyHold((prev) =>
            prev && prev.seatLabel === update.seatLabel && update.status !== 'held'
              ? null
              : prev,
          );
          return;
        }
      },
      onFatal: (err) => {
        if (closed) return;
        setError(err);
        setLoading(false);
        stop();
      },
    });

    return () => {
      stop();
    };
  }, [streamUrl, reconnectTick]);

  const refetch = useCallback(() => {
    setError(null);
    setReconnectTick((t) => t + 1);
  }, []);

  // 최신 myHold 참조를 setSeatMap 안에서 안전하게 읽기 위한 ref.
  const myHoldRef = useRef<MyHold | null>(null);
  useEffect(() => {
    myHoldRef.current = myHold;
  }, [myHold]);

  const onHoldSuccess = useCallback((hold: LiveHold) => {
    const prevHold = myHoldRef.current;
    setSeatMap((prev) => {
      const next = new Map(prev);
      // 이전 hold 좌석은 available 로 되돌린다(백엔드가 자동 해제).
      if (prevHold && prevHold.seatLabel !== hold.seatLabel) {
        if (next.get(prevHold.seatLabel) === 'held') {
          next.set(prevHold.seatLabel, 'available');
        }
      }
      next.set(hold.seatLabel, 'held');
      return next;
    });
    setMyHold({ seatLabel: hold.seatLabel, expiresAt: hold.expiresAt });
  }, []);

  const onConfirmSuccess = useCallback((seatLabel: string) => {
    setSeatMap((prev) => {
      const next = new Map(prev);
      next.set(seatLabel, 'sold');
      return next;
    });
    setMyHold((prev) => (prev && prev.seatLabel === seatLabel ? null : prev));
  }, []);

  return {
    seatMap,
    myHold,
    loading,
    error,
    refetch,
    onHoldSuccess,
    onConfirmSuccess,
  };
}
