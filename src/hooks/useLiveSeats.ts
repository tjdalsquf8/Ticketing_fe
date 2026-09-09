'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getLiveSeats,
  type LiveHold,
  type LiveSeatMap,
  type LiveSeatStatus,
} from '@/lib/live';
import { ApiError } from '@/lib/errors';

/* ─────────────────────────────────────────────────────────
   useLiveSeats — 라이브 세션 좌석 상태 관리 훅
   ─ 첫 진입 시 getLiveSeats 로 seatMap 초기화 후 2초 폴링
   ─ 응답의 myHold 도 함께 갱신
   ─ SESSION_NOT_FOUND / FORBIDDEN / NOT_ACTIVE / SESSION_ALREADY_COMPLETED
     는 폴링 중단 + error state 노출
   ─ TOO_MANY_LIVE_REQUESTS / 네트워크 오류는 조용히 다음 tick
   ─ hold/confirm 성공 직후 로컬 delta 갱신 콜백 제공(폴링 tick 대기 없이 즉시 반영)
   ───────────────────────────────────────────────────────── */

const POLL_INTERVAL_MS = 2_000;

interface MyHold {
  seatLabel: string;
  expiresAt: string;
}

interface UseLiveSeatsResult {
  seatMap: Map<string, LiveSeatStatus>;
  myHold: MyHold | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
  onHoldSuccess: (hold: LiveHold) => void;
  onConfirmSuccess: (seatLabel: string) => void;
}

const FATAL_CODES = new Set([
  'SESSION_NOT_FOUND',
  'FORBIDDEN',
  'SESSION_FORBIDDEN',
  'NOT_ACTIVE',
  'SESSION_ALREADY_COMPLETED',
]);

export function useLiveSeats(
  sessionId: string | null,
  fetchSeats: (sessionId: string) => Promise<LiveSeatMap> = getLiveSeats,
): UseLiveSeatsResult {
  const [seatMap, setSeatMap] = useState<Map<string, LiveSeatStatus>>(new Map());
  const [myHold, setMyHold] = useState<MyHold | null>(null);
  const [loading, setLoading] = useState<boolean>(sessionId !== null);
  const [error, setError] = useState<ApiError | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  // 폴링 중단 신호. fatal error 발생 후 refetch 호출 시 재활성화 목적.
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      // sessionId 가 null 로 리셋되면 훅 상태 초기화. (예: 세션 만료 후 대기실 이탈)
      // set-state-in-effect 룰 예외: 외부 prop 변경에 대한 로컬 상태 리셋은 이펙트 외 대체 경로 없음.
      /* eslint-disable react-hooks/set-state-in-effect */
      setSeatMap(new Map());
      setMyHold(null);
      setError(null);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      stoppedRef.current = false;
      return;
    }

    let alive = true;
    stoppedRef.current = false;
    setLoading(true);

    const applySnapshot = (
      seats: { seatLabel: string; status: LiveSeatStatus }[],
      hold: MyHold | null,
    ) => {
      const next = new Map<string, LiveSeatStatus>();
      for (const seat of seats) {
        next.set(seat.seatLabel, seat.status);
      }
      // 내 hold 좌석은 서버 응답에서 held 로 오지만, UI 구분을 위해 held 로 유지하고 별도 myHold 로 표시.
      setSeatMap(next);
      setMyHold(hold);
    };

    const fetchOnce = async (isFirst: boolean) => {
      try {
        const snapshot = await fetchSeats(sessionId);
        if (!alive) return;
        applySnapshot(snapshot.seats, snapshot.myHold);
        setError(null);
        if (isFirst) setLoading(false);
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError) {
          if (FATAL_CODES.has(err.code)) {
            setError(err);
            stoppedRef.current = true;
            if (isFirst) setLoading(false);
            return;
          }
          // rate limit / 기타 tick 실패는 조용히 다음 tick 대기.
          if (err.code === 'TOO_MANY_LIVE_REQUESTS') {
            if (isFirst) setLoading(false);
            return;
          }
        }
        // 첫 요청이 네트워크로 실패하면 사용자에게 노출, 이후 tick 은 조용히 재시도.
        if (isFirst) {
          if (err instanceof ApiError) {
            setError(err);
          }
          setLoading(false);
        } else if (process.env.NODE_ENV !== 'production') {
          console.warn('[useLiveSeats] tick failed', err);
        }
      }
    };

    void fetchOnce(true);

    const intervalId = setInterval(() => {
      if (stoppedRef.current) return;
      // 백그라운드 탭 rate-limit 방어: 화면이 숨김이면 tick 스킵.
      // 여러 탭 열어도 활성 탭 하나만 30 req/min 예산 소비 → 429 회피.
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchOnce(false);
    }, POLL_INTERVAL_MS);

    // visible 로 돌아오면 지연 없이 즉시 1회 갱신.
    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) return;
      if (stoppedRef.current) return;
      void fetchOnce(false);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      alive = false;
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
    // refetchTick 을 의존성으로 넣어 refetch() 호출 시 이펙트 재실행.
  }, [sessionId, refetchTick, fetchSeats]);

  const refetch = useCallback(() => {
    setError(null);
    stoppedRef.current = false;
    setRefetchTick((t) => t + 1);
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
