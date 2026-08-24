'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  getLiveCurrent,
  getLiveRound,
  startLiveSession,
  type LiveRoundPublic,
  type LiveRoundStatus,
  type LiveSession,
} from '@/lib/live';
import { useServerTime } from '@/hooks/useServerTime';
import { useLiveQueue } from '@/hooks/useLiveQueue';
import { ApiError, validateNickname } from '@/lib/errors';
import { useAuth } from '@/contexts/AuthContext';
import { postGuest } from '@/lib/guests';
import QueueOverlay from '@/components/live/QueueOverlay';
import { getLiveEventByEventId, type LiveEvent } from '@/data/live';
import BookingFlow from '@/components/booking/BookingFlow';
import type { LiveConfirmResult } from '@/lib/live';
import { getMyTickets, getTicket, type TicketDetail } from '@/lib/tickets';
import TicketModal, { type TicketData } from '@/components/booking/TicketModal';
import LiveResultCard from '@/components/live/LiveResultCard';

/* ──────────────────────────────────────────
   /live/[roundId] — 회차 상세 + 예매하기 게이트
   ─ 상태별(scheduled/open/closed/cancelled) UI 분기
   ─ scheduled: 카운트다운 + opensAt 도래 시 CTA 활성화
   ─ scheduled → open 승격: opensAt 임박 시 /live/current 1초 폴링
   ─ Phase 4: [예매하기] → POST /sessions → QueueOverlay + 1초 큐 폴링
   ────────────────────────────────────────── */

interface RoundDetailClientProps {
  roundId: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; error: ApiError | Error }
  | { kind: 'ready'; round: LiveRoundPublic };

// 예매하기 활성화 3~5초 전부터 폴링 시작 (백엔드 합의)
const POLL_LEAD_MS = 5_000;
const POLL_INTERVAL_MS = 1_000;

// sessionStorage 스키마: { sessionId, roundId, savedAt }
const LIVE_SESSION_KEY = 'live_session_v1';
// 결과 폴백: 백엔드 재조회 API 는 v2. 새로고침 시 결과 화면 복구용.
const LIVE_RESULT_KEY = 'live_result_v1';
// 결과 폴백 TTL. 새로고침 복구용 임시 스냅샷이므로 시간 창을 짧게 잡아
// devtools 로 sessionStorage 를 위조해 "1등 화면"을 무기한 재현하는 시도를 차단한다.
// (백엔드 게스트 결과 재조회 API 도입 시 이 폴백 자체가 제거될 예정.)
const LIVE_RESULT_TTL_MS = 30 * 60 * 1000;

interface LiveSessionSnapshot {
  sessionId: string;
  roundId: number;
  savedAt: number;
}

interface LiveResultSnapshot {
  roundId: number;
  rankNumber: number;
  elapsedMs: number;
  ticketId: number | null;
  seatLabel: string;
  savedAt: number;
}

function readSessionSnapshot(): LiveSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LiveSessionSnapshot>;
    if (
      typeof parsed.sessionId === 'string' &&
      typeof parsed.roundId === 'number' &&
      typeof parsed.savedAt === 'number'
    ) {
      return parsed as LiveSessionSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

function writeSessionSnapshot(snap: LiveSessionSnapshot) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LIVE_SESSION_KEY, JSON.stringify(snap));
}

function clearSessionSnapshot() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LIVE_SESSION_KEY);
}

function readResultSnapshot(): LiveResultSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LIVE_RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LiveResultSnapshot>;
    if (
      typeof parsed.roundId === 'number' &&
      typeof parsed.rankNumber === 'number' &&
      typeof parsed.elapsedMs === 'number' &&
      (parsed.ticketId === null || typeof parsed.ticketId === 'number') &&
      typeof parsed.seatLabel === 'string' &&
      typeof parsed.savedAt === 'number'
    ) {
      // TTL 검사: 30분 초과 스냅샷은 위조 방어 목적으로 조용히 제거.
      // (게스트 결과는 서버 재조회 API 가 없어 TTL 만이 유일한 방어선.)
      if (Date.now() - parsed.savedAt > LIVE_RESULT_TTL_MS) {
        sessionStorage.removeItem(LIVE_RESULT_KEY);
        return null;
      }
      return parsed as LiveResultSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

function writeResultSnapshot(snap: LiveResultSnapshot) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LIVE_RESULT_KEY, JSON.stringify(snap));
}

function clearResultSnapshot() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LIVE_RESULT_KEY);
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function splitCountdown(ms: number): {
  h: string;
  m: string;
  s: string;
  done: boolean;
} {
  if (ms <= 0) return { h: '00', m: '00', s: '00', done: true };
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h: pad2(h), m: pad2(m), s: pad2(s), done: false };
}

export default function RoundDetailClient({ roundId }: RoundDetailClientProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const { nowServer } = useServerTime();
  const { user, guestNickname, setGuestNickname, syncGuestNickname } = useAuth();
  const [, setTick] = useState(0);

  // ── 세션 상태 ─────────────────────────────
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [initialSessionData, setInitialSessionData] = useState<LiveSession | null>(null);
  const [startError, setStartError] = useState<ApiError | Error | null>(null);
  const [starting, setStarting] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [needsNickname, setNeedsNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  // ready 승격 후 좌석 선택 화면으로 넘긴다. sessionId 를 그대로 BookingFlow(liveMode) 에 주입.
  const [enteredSessionId, setEnteredSessionId] = useState<string | null>(null);
  // confirm 성공 결과. Phase 6: 3분기(회원 TOP10 / 회원 밖 / 게스트) 결과 화면 렌더 소스.
  const [liveResult, setLiveResult] = useState<{
    result: LiveConfirmResult;
    seatLabel: string;
  } | null>(null);
  // 회원 && TOP10 인 경우 티켓 상세 채움. null=미조회, {detail}=성공, {error}=실패(재시도 UI 노출).
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [ticketError, setTicketError] = useState<Error | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  // 이 회차에 이미 참여 완료했는지 (회원). 최근 20개 티켓 조회로 감지 → [예매하기] 대신 "참여 완료" 배지.
  // 게스트는 여기서 감지 못 하고 [예매하기] 클릭 후 completed 세션 응답으로 알림 (RoundDetailClient performStart).
  const [alreadyParticipatedTicketId, setAlreadyParticipatedTicketId] = useState<number | null>(null);

  // 큐 폴링 → 초기 세션 응답을 LiveQueueState 로 변환해 주입
  const initialQueueState = useMemo(() => {
    if (!initialSessionData) return null;
    return {
      sessionId: initialSessionData.sessionId,
      status: initialSessionData.status,
      queuePosition: initialSessionData.queuePosition,
      ready: initialSessionData.status === 'active',
    };
  }, [initialSessionData]);

  const {
    state: queueState,
    error: queueError,
    ready: queueReady,
  } = useLiveQueue(activeSessionId, initialQueueState);

  // ── 상세 로드 ─────────────────────────────
  const loadRound = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const round = await getLiveRound(roundId);
      setState({ kind: 'ready', round });
    } catch (err) {
      if (err instanceof Error) {
        setState({ kind: 'error', error: err });
      } else {
        setState({
          kind: 'error',
          error: new Error('요청 처리 중 오류가 발생했습니다.'),
        });
      }
    }
  }, [roundId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const round = await getLiveRound(roundId);
        if (alive) setState({ kind: 'ready', round });
      } catch (err) {
        if (!alive) return;
        if (err instanceof Error) {
          setState({ kind: 'error', error: err });
        } else {
          setState({
            kind: 'error',
            error: new Error('요청 처리 중 오류가 발생했습니다.'),
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [roundId]);

  // 회원 참여 이력 감지: 최근 20개 티켓에서 이 roundId 매칭 시 이미 참여 완료 표시.
  // 실패는 조용히 무시 (감지 못 해도 클릭 후 completed 세션 응답으로 fallback 알림 있음).
  useEffect(() => {
    if (!user) {
      setAlreadyParticipatedTicketId(null);
      return;
    }
    const numericRoundId = Number(roundId);
    if (!Number.isFinite(numericRoundId)) return;
    let alive = true;
    (async () => {
      try {
        const { data: tickets } = await getMyTickets({ page: 1, limit: 20 });
        if (!alive) return;
        const match = tickets.find((t) => t.roundId === numericRoundId);
        setAlreadyParticipatedTicketId(match ? match.ticketId : null);
      } catch {
        // 감지 실패는 무시. clic 후 completed 세션으로 알림된다.
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, roundId]);

  // sessionStorage 복구: 새로고침/이탈 후 재진입 시 큐 오버레이 or 결과 화면 자동 복원.
  // 결과 스냅샷 우선 — 이미 confirm 완료된 세션이라면 큐/좌석 화면으로 되돌리면 안 됨.
  useEffect(() => {
    const numericRoundId = Number(roundId);
    if (!Number.isFinite(numericRoundId)) return;

    const resultSnap = readResultSnapshot();
    if (resultSnap && resultSnap.roundId === numericRoundId) {
      setLiveResult({
        result: {
          rankNumber: resultSnap.rankNumber,
          elapsedMs: resultSnap.elapsedMs,
          ticketId: resultSnap.ticketId,
        },
        seatLabel: resultSnap.seatLabel,
      });
      // 결과가 남아있으면 세션 스냅샷은 잔여물이므로 정리
      clearSessionSnapshot();
      return;
    }
    if (resultSnap && resultSnap.roundId !== numericRoundId) {
      // 다른 회차 결과 잔재 → 정리
      clearResultSnapshot();
    }

    const snap = readSessionSnapshot();
    if (!snap) return;
    if (snap.roundId !== numericRoundId) {
      // 저장된 세션이 다른 회차 것 → 정리
      clearSessionSnapshot();
      return;
    }
    // 초기 상태 없이 폴링만 시작. useLiveQueue 가 SESSION_NOT_FOUND 응답 시 알아서 에러 노출.
    setActiveSessionId(snap.sessionId);
    setInitialSessionData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  // 카운트다운 tick (500ms)
  useEffect(() => {
    if (state.kind !== 'ready') return;
    if (state.round.status !== 'scheduled' && state.round.status !== 'open') {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [state]);

  // scheduled → open 승격 감지: opensAt 임박 시 /live/current 1초 폴링
  // 세션이 이미 시작됐다면(활성 sessionId 존재) 승격 폴링은 불필요.
  useEffect(() => {
    if (state.kind !== 'ready') return;
    if (state.round.status !== 'scheduled') return;
    if (activeSessionId) return;

    const opensAtMs = Date.parse(state.round.opensAt);
    const targetRoundId = state.round.roundId;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let startTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    const runOnce = async () => {
      try {
        const current = await getLiveCurrent();
        if (!alive) return;
        if (current && current.roundId === targetRoundId && current.status === 'open') {
          setState({ kind: 'ready', round: current });
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch {
        // 폴링 에러는 무시 (다음 tick 에서 재시도)
      }
    };

    const startPolling = () => {
      if (!alive || intervalId) return;
      intervalId = setInterval(() => {
        // 백그라운드 탭에서는 rate-limit 예산을 아끼기 위해 tick 스킵.
        if (typeof document !== 'undefined' && document.hidden) return;
        void runOnce();
      }, POLL_INTERVAL_MS);
    };

    const untilStart = opensAtMs - nowServer() - POLL_LEAD_MS;
    if (untilStart <= 0) {
      startPolling();
    } else {
      startTimeoutId = setTimeout(startPolling, untilStart);
    }

    // visible 로 돌아오면 승격을 지체 없이 반영하기 위해 폴링 중이라면 즉시 1회 실행.
    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) return;
      if (!intervalId) return;
      void runOnce();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      alive = false;
      if (intervalId) clearInterval(intervalId);
      if (startTimeoutId) clearTimeout(startTimeoutId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
    // nowServer 는 훅 내부에서 안정적 참조지만, 승격 판정은 최초 상태 진입 시 1회 세팅으로 충분.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, state.kind === 'ready' ? state.round.status : null, state.kind === 'ready' ? state.round.roundId : null, activeSessionId]);

  // ── ready 승격 감지: Phase 5 로 이양 예정. 지금은 임시 안내. ────────
  useEffect(() => {
    if (!activeSessionId || !queueReady) return;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[live] ready', {
        sessionId: activeSessionId,
        roundId,
      });
    }
    setEnteredSessionId(activeSessionId);
    // 오버레이 언마운트: activeSessionId 는 유지하되 별도 플래그로 렌더 차단.
    // (sessionStorage 는 남겨서 새로고침 시 재복구 가능하게 두거나 정리해도 OK.
    //  Phase 5 에서 좌석 선택 화면이 sessionId 를 요구하므로 유지가 자연스러움.)
  }, [activeSessionId, queueReady, roundId]);

  // ── 세션 시작 핸들러 ──────────────────────
  const performStart = useCallback(
    async (nicknameToSend?: string) => {
      if (state.kind !== 'ready') return;
      setStarting(true);
      setStartError(null);
      setNicknameError(null);
      try {
        // 게스트: 라이브 세션 시작 전에 guest_uuid 쿠키를 idempotent 로 확보.
        // 헤더에서 저장한 유저는 쿠키가 이미 있어 서버가 기존 UUID 그대로 반환.
        if (!user && nicknameToSend) {
          try {
            await postGuest(nicknameToSend);
          } catch (err) {
            if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
              setNeedsNickname(true);
              setNicknameError(err.message);
              setStartError(err);
              return;
            }
            throw err;
          }
        }
        const body = nicknameToSend ? { nickname: nicknameToSend } : {};
        const session = await startLiveSession(state.round.roundId, body);
        // 이미 이 회차에 참여 완료한 경우, 백엔드가 idempotent 로 completed 세션을 반환.
        // 큐 오버레이 진입하면 폴링만 무한 반복되므로 사전에 차단하고 안내한다.
        if (session.status === 'completed') {
          setStartError(
            new Error('이미 이 회차에 참여하셨습니다. 결과는 내 티켓 또는 다른 회차에서 확인해 주세요.'),
          );
          clearSessionSnapshot();
          return;
        }
        // 서버가 강제한 닉네임(immutability) 을 로컬에 동기화
        if (session.nickname) {
          syncGuestNickname(session.nickname);
        }
        // 게스트가 새로 발급한 닉네임이면 쿨다운 타임스탬프 등록
        if (!user && nicknameToSend && nicknameToSend === session.nickname) {
          try {
            await setGuestNickname(nicknameToSend);
          } catch {
            // 쿨다운/규칙 예외 or postGuest 중복 호출 실패는 무시 (쿠키는 이미 확보됨).
          }
        }
        writeSessionSnapshot({
          sessionId: session.sessionId,
          roundId: state.round.roundId,
          savedAt: Date.now(),
        });
        setInitialSessionData(session);
        setActiveSessionId(session.sessionId);
        setNeedsNickname(false);
        setNicknameDraft('');
      } catch (err) {
        if (err instanceof ApiError) {
          setStartError(err);
          // 라운드 상태가 바뀌었을 수 있으니 상세 재조회
          if (err.code === 'ROUND_NOT_OPEN' || err.code === 'ROUND_ALREADY_CLOSED') {
            void loadRound();
          }
          if (err.code === 'VALIDATION_ERROR' || err.code === 'NICKNAME_REQUIRED') {
            setNeedsNickname(true);
            setNicknameError(err.message);
          }
          if (err.code === 'GUEST_UUID_REQUIRED') {
            setNeedsNickname(true);
          }
        } else if (err instanceof Error) {
          setStartError(err);
        } else {
          setStartError(new Error('요청 처리 중 오류가 발생했습니다.'));
        }
      } finally {
        setStarting(false);
      }
    },
    [state, user, syncGuestNickname, setGuestNickname, loadRound],
  );

  const handleBook = useCallback(() => {
    if (state.kind !== 'ready') return;
    setStartError(null);
    setNicknameError(null);

    // 로그인 유저: 닉네임 없이 시작
    if (user) {
      void performStart();
      return;
    }

    // 게스트: 저장된 닉네임 있으면 그대로 시작
    if (guestNickname) {
      void performStart(guestNickname);
      return;
    }

    // 게스트 최초 진입: 인라인 입력 UI 열기
    setNeedsNickname(true);
    setNicknameDraft('');
  }, [state, user, guestNickname, performStart]);

  const handleNicknameSubmit = useCallback(() => {
    const trimmed = nicknameDraft.trim();
    const err = validateNickname(trimmed);
    if (err) {
      setNicknameError(err);
      return;
    }
    setNicknameError(null);
    void performStart(trimmed);
  }, [nicknameDraft, performStart]);

  const handleCancelOverlay = useCallback(() => {
    clearSessionSnapshot();
    setActiveSessionId(null);
    setInitialSessionData(null);
    setStartError(null);
  }, []);

  // ── 좌석 확정 결과 / 대기실 이탈 핸들러 (rules-of-hooks 준수 위해 early return 이전 선언) ──
  const handleConfirmed = useCallback(
    (result: LiveConfirmResult, seatLabel: string) => {
      setLiveResult({ result, seatLabel });
      // 세션은 완료됐으니 정리. 결과는 별도 키로 폴백 저장 (새로고침 복구용).
      clearSessionSnapshot();
      const numericRoundId = Number(roundId);
      if (Number.isFinite(numericRoundId)) {
        writeResultSnapshot({
          roundId: numericRoundId,
          rankNumber: result.rankNumber,
          elapsedMs: result.elapsedMs,
          ticketId: result.ticketId,
          seatLabel,
          savedAt: Date.now(),
        });
      }
    },
    [roundId],
  );

  const handleBackFromBooking = useCallback(() => {
    // 좌석 선택 화면에서 나가면 세션 정리(재입장 방지). 결과 폴백도 함께 정리.
    clearSessionSnapshot();
    clearResultSnapshot();
    setEnteredSessionId(null);
    setActiveSessionId(null);
    setInitialSessionData(null);
    setLiveResult(null);
    setTicketDetail(null);
    setTicketError(null);
  }, []);

  // 결과 화면 이탈(다른 회차 보기/회원가입/내 티켓 보기 링크) 훅
  const handleLeaveResult = useCallback(() => {
    clearResultSnapshot();
    clearSessionSnapshot();
  }, []);

  // 회원 && TOP10 (ticketId !== null) → 티켓 상세 조회. 실패 시 재시도 가능.
  const loadTicketDetail = useCallback(async (ticketId: number) => {
    setTicketLoading(true);
    setTicketError(null);
    try {
      const detail = await getTicket(ticketId);
      setTicketDetail(detail);
    } catch (err) {
      if (err instanceof Error) setTicketError(err);
      else setTicketError(new Error('티켓 상세를 불러오지 못했습니다.'));
    } finally {
      setTicketLoading(false);
    }
  }, []);

  // liveResult 변경 감지 → 회원 && ticketId 있으면 상세 조회
  useEffect(() => {
    if (!liveResult) return;
    if (!user) return;
    const tid = liveResult.result.ticketId;
    if (tid === null) return;
    if (ticketDetail?.ticketId === tid) return;
    void loadTicketDetail(tid);
    // ticketDetail 은 의존성에서 제외 — 성공 시 재조회 트리거 방지.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveResult, user, loadTicketDetail]);

  // ── 렌더 ─────────────────────────────────
  if (state.kind === 'loading') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <BackLink />
        <SkeletonHero />
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <BackLink />
        <ErrorPanel error={state.error} onRetry={loadRound} />
      </div>
    );
  }

  const { round } = state;
  const event: LiveEvent | null = getLiveEventByEventId(round.eventId);
  const roundTitle = event?.title ?? `실시간 회차 #${round.roundId}`;

  // 결과 화면(liveResult) 이 있으면 부킹/오버레이/히어로 모두 숨김. 결과가 최우선.
  const showResult = liveResult !== null;
  // ready 승격 후 좌석 선택 화면 노출 여부.
  const showBookingFlow =
    !showResult &&
    enteredSessionId !== null && enteredSessionId === activeSessionId;
  const showOverlay = !showResult && activeSessionId !== null && !showBookingFlow;
  const showHero = !showBookingFlow && !showResult;

  // 3분기 결과 화면 분기 파생값
  const resultTicketId = liveResult?.result.ticketId ?? null;
  const resultRankNumber = liveResult?.result.rankNumber ?? null;
  const resultElapsedMs = liveResult?.result.elapsedMs ?? 0;
  const resultSeatLabel = liveResult?.seatLabel ?? '';
  const isMemberWithTicket = showResult && !!user && resultTicketId !== null;
  const isMemberMissed     = showResult && !!user && resultTicketId === null;
  const isGuestResult      = showResult && !user;

  // TicketModal 로 넘길 데이터. 티켓 상세 성공 시 정식 값, 로딩/실패 시 폴백값.
  const liveTicketData: TicketData | null = isMemberWithTicket
    ? (() => {
        const nickname = user!.name;
        const seatDisplay = resultSeatLabel; // 서버 seatLabel 그대로 표기 (예: "A-A-1")
        if (ticketDetail) {
          return {
            eventTitle: event?.title ?? `실시간 회차 #${round.roundId}`,
            seat: seatDisplay,
            nickname,
            elapsedMs: ticketDetail.elapsedMs,
            ranked: true,
            rankNumber: ticketDetail.rankNumber,
            totalCount: ticketDetail.totalParticipants,
            rankPercentile: ticketDetail.rankPercentile,
            serial: ticketDetail.serial,
            issuedAt: new Date(Date.parse(ticketDetail.issuedAt)),
          };
        }
        // 상세 조회 실패/로딩 폴백: confirm 응답 값만으로 UI 채움
        return {
          eventTitle: event?.title ?? `실시간 회차 #${round.roundId}`,
          seat: seatDisplay,
          nickname,
          elapsedMs: resultElapsedMs,
          ranked: true,
          rankNumber: resultRankNumber,
          totalCount: null,
          rankPercentile: null,
          serial: ticketLoading ? 'TR-......-loading' : 'TR-......-error',
          issuedAt: new Date(),
        };
      })()
    : null;

  // BookingFlow 에 넘길 meta 매핑.
  const opensAtDate = new Date(Date.parse(round.opensAt));
  const bookingMeta = {
    eventTitle: event?.title ?? `실시간 회차 #${round.roundId}`,
    venueName: event?.venueName ?? '',
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <BackLink />

      {showHero && (
        <RoundHero
          round={round}
          event={event}
          nowServer={nowServer}
          onBook={handleBook}
          starting={starting}
          startError={startError}
          needsNickname={needsNickname}
          nicknameDraft={nicknameDraft}
          onNicknameChange={setNicknameDraft}
          onNicknameSubmit={handleNicknameSubmit}
          onNicknameCancel={() => {
            setNeedsNickname(false);
            setNicknameDraft('');
            setNicknameError(null);
          }}
          nicknameError={nicknameError}
          alreadyParticipatedTicketId={alreadyParticipatedTicketId}
        />
      )}

      {showBookingFlow && enteredSessionId && (
        event ? (
          <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
            <BookingFlow
              venue={event.venue}
              meta={bookingMeta}
              mode="live"
              skipCaptcha
              liveMode={{
                sessionId: enteredSessionId,
                roundId: round.roundId,
                onConfirmed: handleConfirmed,
              }}
              onBack={handleBackFromBooking}
            />
          </div>
        ) : (
          <div className="card p-8 text-center space-y-3">
            <span className="badge badge-warning">이벤트 정보 누락</span>
            <h3 className="text-lg font-bold text-text">
              이벤트 정보를 불러올 수 없습니다
            </h3>
            <p className="text-sm text-text-secondary">
              세션은 유지되지만 좌석 배치를 표시할 수 없습니다.
              <br />
              관리자에게 문의하거나 다른 회차를 이용해 주세요.
            </p>
            <button
              type="button"
              onClick={handleBackFromBooking}
              className="btn btn-neutral"
            >
              대기실 나가기
            </button>
          </div>
        )
      )}

      {/* ─── 결과 3분기 ─── */}
      {isMemberMissed && (
        <LiveResultCard
          rankNumber={resultRankNumber}
          elapsedMs={resultElapsedMs}
          seatLabel={resultSeatLabel}
          variant="member-missed"
          onLeave={handleLeaveResult}
        />
      )}

      {isGuestResult && (
        <LiveResultCard
          rankNumber={resultRankNumber}
          elapsedMs={resultElapsedMs}
          seatLabel={resultSeatLabel}
          variant="guest"
          wouldHaveBeenTicketed={
            resultRankNumber !== null && resultRankNumber <= 10
          }
          onLeave={handleLeaveResult}
        />
      )}

      {/* 티켓 상세 로딩 실패 시 재시도 UI (모달 위에 카드 형태로 얹기 어렵기 때문에
          모달 바깥에도 노출). ticketDetail 성공 시 자동 사라짐. */}
      {isMemberWithTicket && ticketError && !ticketLoading && (
        <div className="card p-4 max-w-xl mx-auto space-y-2">
          <div className="flex items-center gap-2">
            <span className="badge badge-warning">티켓 상세 불러오기 실패</span>
          </div>
          <p className="text-sm text-text-secondary">
            티켓은 발급됐지만 상세 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <p className="text-xs text-danger-text">{ticketError.message}</p>
          <button
            type="button"
            onClick={() => {
              if (liveResult?.result.ticketId !== null && liveResult) {
                void loadTicketDetail(liveResult.result.ticketId!);
              }
            }}
            className="btn btn-outline btn-sm"
          >
            다시 시도
          </button>
        </div>
      )}

      {isMemberWithTicket && liveTicketData && (
        <TicketModal
          {...liveTicketData}
          mode="live"
          onClose={handleLeaveResult}
        />
      )}

      {showOverlay && activeSessionId && (
        <QueueOverlay
          sessionId={activeSessionId}
          roundTitle={roundTitle}
          queueState={queueState}
          error={queueError}
          onCancel={handleCancelOverlay}
        />
      )}
    </div>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────

function BackLink() {
  return (
    <Link href="/live" className="btn btn-neutral btn-sm inline-flex">
      ← 실시간 이벤트 목록
    </Link>
  );
}

interface RoundHeroProps {
  round: LiveRoundPublic;
  event: LiveEvent | null;
  nowServer: () => number;
  onBook: () => void;
  starting: boolean;
  startError: ApiError | Error | null;
  needsNickname: boolean;
  nicknameDraft: string;
  onNicknameChange: (v: string) => void;
  onNicknameSubmit: () => void;
  onNicknameCancel: () => void;
  nicknameError: string | null;
  alreadyParticipatedTicketId: number | null;
}

function RoundHero({
  round,
  event,
  nowServer,
  onBook,
  starting,
  startError,
  needsNickname,
  nicknameDraft,
  onNicknameChange,
  onNicknameSubmit,
  onNicknameCancel,
  nicknameError,
  alreadyParticipatedTicketId,
}: RoundHeroProps) {
  const title = event?.title ?? `실시간 회차 #${round.roundId}`;
  const venueName = event?.venueName ?? '';
  const category = event?.category ?? '실시간';
  const poster = event?.posterImage;

  const opensAtMs = Date.parse(round.opensAt);
  const opensAtLabel = new Date(opensAtMs).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="grid md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start">
      {/* 좌: 정보 카드 */}
      <div className="card p-6 sm:p-8 flex flex-col gap-5 min-w-0">
        <StatusBadgeRow status={round.status} opensAtLabel={opensAtLabel} />

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-primary tracking-wide">
            {category}
          </p>
          <h1 className="text-2xl sm:text-[28px] font-bold text-text leading-tight">
            {title}
          </h1>
          {venueName && (
            <p className="text-sm text-text-secondary">{venueName}</p>
          )}
        </div>

        <StatusPanel round={round} nowServer={nowServer} />

        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            총 좌석{' '}
            <strong className="text-text font-mono-tabular">
              {round.totalSeats.toLocaleString()}
            </strong>
            석
          </span>
          <span>회차 #{round.roundId}</span>
        </div>

        {startError && (
          <div
            role="alert"
            className="text-sm text-danger-text bg-danger-bg border border-danger-border rounded-lg px-4 py-3"
          >
            {startError.message}
          </div>
        )}

        {needsNickname ? (
          <NicknamePrompt
            value={nicknameDraft}
            onChange={onNicknameChange}
            onSubmit={onNicknameSubmit}
            onCancel={onNicknameCancel}
            error={nicknameError}
            pending={starting}
          />
        ) : (
          <ActionArea
            round={round}
            nowServer={nowServer}
            onClick={onBook}
            pending={starting}
            alreadyParticipatedTicketId={alreadyParticipatedTicketId}
          />
        )}

        <p className="text-[11px] text-text-tertiary">
          게스트도 참여 가능하지만, 티켓 지급은{' '}
          <strong className="text-text-secondary">회원</strong>만 대상입니다.
        </p>
      </div>

      {/* 우: 포스터 카드 */}
      <div
        className="hidden md:block relative w-full rounded-xl overflow-hidden aspect-[3/4] bg-[#0b1220]"
        aria-label="공연 포스터"
      >
        {poster && (
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(min-width: 1024px) 18rem, 16rem"
            className="object-cover"
            priority
          />
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.85) 20%, transparent)',
          }}
        />
        <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/70">
            Ticket Rush · Live
          </p>
          <div>
            <p className="text-white font-black text-base leading-tight drop-shadow line-clamp-2">
              {title}
            </p>
            {venueName && (
              <p className="text-white/50 text-xs mt-2 truncate">{venueName}</p>
            )}
            <p className="text-white/30 text-[11px] mt-0.5 font-mono-tabular">
              {statusPosterLabel(round.status, opensAtLabel)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function statusPosterLabel(status: LiveRoundStatus, opensAtLabel: string): string {
  switch (status) {
    case 'open':
      return '진행 중';
    case 'closed':
      return '종료됨';
    case 'cancelled':
      return '취소됨';
    case 'scheduled':
    default:
      return `오픈 ${opensAtLabel}`;
  }
}

function StatusBadgeRow({
  status,
  opensAtLabel,
}: {
  status: LiveRoundStatus;
  opensAtLabel: string;
}) {
  if (status === 'open') {
    return (
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-bg border border-danger-border">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-text opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger-text" />
          </span>
          <span className="text-[11px] font-bold text-danger-text tracking-wider">
            진행 중
          </span>
        </span>
        <span className="text-xs text-text-secondary">지금 티켓팅 가능</span>
      </div>
    );
  }

  if (status === 'scheduled') {
    return (
      <div className="flex items-center gap-2.5">
        <span className="badge badge-neutral">오픈 예정</span>
        <span className="text-xs text-text-secondary">오픈 {opensAtLabel}</span>
      </div>
    );
  }

  if (status === 'closed') {
    return (
      <div className="flex items-center gap-2.5">
        <span className="badge badge-neutral">종료됨</span>
      </div>
    );
  }

  // cancelled
  return (
    <div className="flex items-center gap-2.5">
      <span className="badge badge-danger">취소됨</span>
    </div>
  );
}

function StatusPanel({
  round,
  nowServer,
}: {
  round: LiveRoundPublic;
  nowServer: () => number;
}) {
  if (round.status === 'open') {
    return (
      <div className="rounded-xl border border-danger-border bg-danger-bg p-4 text-center">
        <p className="text-sm font-semibold text-danger-text">
          지금 티켓팅 가능
        </p>
        <p className="text-xs text-text-secondary mt-1">
          아래 [예매하기] 버튼을 눌러 대기실에 입장하세요.
        </p>
      </div>
    );
  }

  if (round.status === 'scheduled') {
    const opensAtMs = Date.parse(round.opensAt);
    const remaining = opensAtMs - nowServer();
    const cd = splitCountdown(remaining);
    return (
      <div className="rounded-xl border border-border bg-bg-subtle p-4 flex items-end gap-1 justify-center">
        {[
          { val: cd.h, unit: '시간' },
          { val: cd.m, unit: '분' },
          { val: cd.s, unit: '초' },
        ].map(({ val, unit }, i) => (
          <div key={unit} className="flex items-end gap-1">
            {i > 0 && (
              <span className="text-2xl font-light text-text-tertiary mb-1">
                :
              </span>
            )}
            <div className="text-center min-w-[3rem]">
              <span className="font-mono-tabular text-4xl font-bold text-text">
                {val}
              </span>
              <p className="text-xs text-text-tertiary mt-0.5">{unit}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (round.status === 'closed') {
    return (
      <div className="rounded-xl border border-border bg-bg-subtle p-4 text-center">
        <p className="text-sm font-semibold text-text">
          이 회차는 종료되었습니다.
        </p>
        <p className="text-xs text-text-secondary mt-1">
          다른 예정 회차를 확인해 보세요.
        </p>
      </div>
    );
  }

  // cancelled
  return (
    <div className="rounded-xl border border-danger-border bg-danger-bg p-4 text-center">
      <p className="text-sm font-semibold text-danger-text">
        이 회차는 관리자에 의해 취소되었습니다.
      </p>
      <p className="text-xs text-text-secondary mt-1">
        다른 예정 회차로 이동해 주세요.
      </p>
    </div>
  );
}

function ActionArea({
  round,
  nowServer,
  onClick,
  pending,
  alreadyParticipatedTicketId,
}: {
  round: LiveRoundPublic;
  nowServer: () => number;
  onClick: () => void;
  pending: boolean;
  alreadyParticipatedTicketId: number | null;
}) {
  if (round.status === 'closed' || round.status === 'cancelled') {
    return (
      <Link href="/live" className="btn btn-outline btn-lg w-full sm:w-auto">
        다른 회차 보기
      </Link>
    );
  }

  // 회원이 이미 이 회차에서 티켓을 받은 경우: [예매하기] 대신 참여 완료 배지 + 티켓 이동.
  if (alreadyParticipatedTicketId !== null) {
    return (
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <div className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full bg-success-bg border border-success-border">
          <span className="text-xs font-bold text-success-text">참여 완료</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/my/tickets/${alreadyParticipatedTicketId}`}
            className="btn btn-solid btn-lg"
          >
            내 티켓 보기
          </Link>
          <Link href="/live" className="btn btn-outline btn-lg">
            다른 회차 보기
          </Link>
        </div>
      </div>
    );
  }

  const opensAtMs = Date.parse(round.opensAt);
  const enabled = round.status === 'open' || nowServer() >= opensAtMs;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled || pending}
      className="btn btn-solid btn-lg w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? '대기실 입장 중…' : '예매하기'}
    </button>
  );
}

function NicknamePrompt({
  value,
  onChange,
  onSubmit,
  onCancel,
  error,
  pending,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  error: string | null;
  pending: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-subtle p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-text">
          닉네임을 입력해 주세요
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          랭킹에 표시될 이름입니다. (한글/영문/숫자, 2~15자)
        </p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !pending) {
            e.preventDefault();
            onSubmit();
          }
        }}
        maxLength={15}
        disabled={pending}
        placeholder="예: 러쉬맨"
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary"
        aria-invalid={error !== null}
        aria-describedby={error ? 'nickname-error' : undefined}
      />
      {error && (
        <p
          id="nickname-error"
          role="alert"
          className="text-xs text-danger-text"
        >
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || value.trim().length === 0}
          className="btn btn-solid flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? '입장 중…' : '입장'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="btn btn-neutral"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function ErrorPanel({
  error,
  onRetry,
}: {
  error: ApiError | Error;
  onRetry: () => void;
}) {
  const code = error instanceof ApiError ? error.code : undefined;

  if (code === 'ROUND_NOT_FOUND') {
    return (
      <div className="card p-8 text-center space-y-3">
        <h2 className="text-lg font-bold text-text">
          존재하지 않는 회차입니다
        </h2>
        <p className="text-sm text-text-secondary">
          해당 회차 정보를 찾을 수 없습니다. 다른 회차를 확인해 보세요.
        </p>
        <Link href="/live" className="btn btn-outline mt-2 inline-flex">
          실시간 이벤트 목록으로
        </Link>
      </div>
    );
  }

  if (code === 'VALIDATION_ERROR') {
    return (
      <div className="card p-8 text-center space-y-3">
        <h2 className="text-lg font-bold text-text">
          잘못된 회차 정보입니다
        </h2>
        <p className="text-sm text-text-secondary">
          회차 주소가 올바르지 않습니다.
        </p>
        <Link href="/live" className="btn btn-outline mt-2 inline-flex">
          실시간 이벤트 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-8 text-center space-y-3">
      <h2 className="text-lg font-bold text-text">
        회차 정보를 불러오지 못했습니다
      </h2>
      <p className="text-sm text-text-secondary">{error.message}</p>
      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-solid"
        >
          다시 시도
        </button>
        <Link href="/live" className="btn btn-neutral">
          목록으로
        </Link>
      </div>
    </div>
  );
}

function SkeletonHero() {
  return (
    <section className="grid md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start animate-pulse">
      <div className="card p-6 sm:p-8 flex flex-col gap-5">
        <div className="h-4 w-24 rounded bg-bg-subtle" />
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-bg-subtle" />
          <div className="h-6 w-3/4 rounded bg-bg-subtle" />
          <div className="h-3 w-40 rounded bg-bg-subtle" />
        </div>
        <div className="h-24 rounded-xl bg-bg-subtle" />
        <div className="h-10 rounded bg-bg-subtle" />
      </div>
      <div className="hidden md:block aspect-[3/4] rounded-xl bg-bg-subtle" />
    </section>
  );
}
