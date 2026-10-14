'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { VenueConfig, SelectedSeat } from '@/types/ticketing';
import CaptchaModal  from './CaptchaModal';
import PracticeResultModal from './PracticeResultModal';
import ZoneMap       from './ZoneMap';
import StadiumMap    from './StadiumMap';
import ArenaRingMap  from './ArenaRingMap';
import BaseballDiamondMap from './BaseballDiamondMap';
import StadiumOvalMap from './StadiumOvalMap';
import ProsceniumMap from './ProsceniumMap';
import FestivalMap   from './FestivalMap';
import SeatGrid      from './SeatGrid';
import SelectionPanel from './SelectionPanel';
import { apiFetch, ROUTES } from '@/lib/api';
import { useSeatsStream } from '@/hooks/useSeatsStream';
import { useServerTime } from '@/hooks/useServerTime';
import {
  holdSeat as apiHoldSeat,
  confirmSeat as apiConfirmSeat,
  type LiveConfirmResult,
  type LiveHold,
} from '@/lib/live';
import { ApiError } from '@/lib/errors';

/* ─────────────────────────────────────────────────────────
   BookingFlow — 인터파크 스타일 예매 플로우
   CAPTCHA → 구역 선택 → 좌석 선택 → 완료
   ───────────────────────────────────────────────────────── */

type Step = 'captcha' | 'zone' | 'seats' | 'done';

type SessionResult = {
  elapsedMs: number;
  /** false: 다른 게스트가 먼저 쓴 닉네임이라 랭킹 미반영. 이 경우 rank 필드는 모두 null. */
  ranked: boolean;
  /** 이번 시도가 누적 세션 중 몇 번째로 빠른지. 개인 최고기록 기준 리더보드와는 별개 지표. */
  sessionRank: number | null;
  rankPercentile: number | null;
  /** 이 이벤트의 누적 완료 세션 수(동일인 반복 참여도 각각 카운트). */
  totalSessions: number | null;
};

interface BookingMeta {
  eventTitle: string;
  venueName:  string;
  date:       string;   // "2026년 08월 01일(토)"
  time:       string;   // "18시 00분"
}

/**
 * hold/confirm 호출 대상. 기본값은 실시간 티켓팅(`@/lib/live`)이며,
 * 이벤트 티켓팅처럼 다른 API(`@/lib/events`)를 써야 하면 주입한다.
 * 응답 shape는 LiveHold/LiveConfirmResult와 동일해야 한다.
 * (좌석맵은 REST 가 아니라 SSE 라 `seatsStreamUrl` 로 따로 받는다.)
 */
interface LiveApi {
  holdSeat: (sessionId: string, seatLabel: string) => Promise<LiveHold>;
  confirmSeat: (sessionId: string, seatLabel: string) => Promise<LiveConfirmResult>;
}

const DEFAULT_LIVE_API: LiveApi = {
  holdSeat: apiHoldSeat,
  confirmSeat: apiConfirmSeat,
};

interface LiveModeConfig {
  /** POST /sessions 로 발급된 활성 세션 ID */
  sessionId: string;
  /** 회차 ID (완료 시 sessionStorage 정리 및 결과 매핑용) */
  roundId: number;
  /** 좌석맵 SSE URL (`liveSeatsStreamUrl` / `eventSeatsStreamUrl` 로 생성). */
  seatsStreamUrl: string;
  /** confirm 성공 시 상위(RoundDetailClient)로 결과 전달 */
  onConfirmed?: (result: LiveConfirmResult, seatLabel: string) => void;
  /** hold/confirm API. 미지정 시 실시간 티켓팅(`@/lib/live`) 기본값 사용. */
  api?: LiveApi;
}

interface Props {
  venue:       VenueConfig;
  meta:        BookingMeta;
  mode:        'practice' | 'live';
  sessionId?:  string;
  /**
   * 서버가 발급한 세션 시작 시각(ISO). 주어지면 타이머가 이 시점부터 계산되어
   * 대기 화면·CAPTCHA를 포함한 서버 랭킹 시간과 정확히 일치한다.
   * 없으면 컴포넌트 마운트 시점부터 카운트하는 폴백 동작.
   */
  startedAt?:  string;
  skipCaptcha?: boolean;
  resultPath?: string;
  onBack?:     () => void;
  /** 연습 완료 팝업의 [랭킹 보러가기] 클릭 훅. 미지정 시 버튼 숨김. */
  onViewRanking?: () => void;
  /**
   * 라이브 미리보기 모드. 지정 시:
   * - 이 배열에 속한 좌석만 선택 가능
   * - 나머지 좌석은 "미오픈"으로 표시 (라이브 회차에 열리지 않은 좌석)
   * - 랜덤 예매완료 시뮬레이션 비활성화 (실 라이브 회차 UX 그대로 재현)
   */
  liveSeatLabels?: string[];
  /**
   * 실전 라이브 모드. 지정 시:
   * - 랜덤 taken 시뮬레이션 스킵 (CAPTCHA는 그대로 노출, skipCaptcha prop으로 별도 제어)
   * - useSeatsStream 으로 좌석 상태 구독 (SSE push)
   * - 좌석 클릭 → holdSeat, 완료 → confirmSeat 실제 호출
   * - MAX_SEATS=1 강제 (백엔드는 세션당 hold 1좌석만 허용)
   */
  liveMode?:   LiveModeConfig;
}

export default function BookingFlow({
  venue, meta, mode, sessionId, startedAt, skipCaptcha = false, resultPath, onBack,
  onViewRanking, liveSeatLabels, liveMode,
}: Props) {
  const isLive = !!liveMode;
  const liveApi = liveMode?.api ?? DEFAULT_LIVE_API;
  // 라이브: 세션당 hold 1좌석만 허용 (백엔드 정책). 나머지 모드는 4좌석까지.
  const MAX_SEATS = isLive ? 1 : 4;
  const liveSeatSet = useMemo(
    () => (liveSeatLabels && liveSeatLabels.length > 0 ? new Set(liveSeatLabels) : null),
    [liveSeatLabels],
  );
  const router = useRouter();
  // 라이브 모드도 CAPTCHA는 그대로 노출 (부정예매 방지). skipCaptcha prop으로만 제어.
  const initialStep: Step = skipCaptcha ? 'zone' : 'captcha';
  const [step,         setStep]         = useState<Step>(initialStep);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selected,     setSelected]     = useState<SelectedSeat[]>([]);
  const [elapsedMs,      setElapsedMs]      = useState(0);
  const [sessionResult,  setSessionResult]  = useState<SessionResult | null>(null);
  const [bookedSeats,    setBookedSeats]    = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // ── 라이브 모드 상태 ─────────────────────────
  const {
    seatMap,
    myHold,
    error: seatsError,
    refetch: refetchSeats,
    onHoldSuccess,
    onConfirmSuccess,
  } = useSeatsStream(isLive ? liveMode!.seatsStreamUrl : null);
  const { nowServer } = useServerTime();
  const [liveInlineError, setLiveInlineError] = useState<string | null>(null);
  const [holdPending, setHoldPending] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmed, setConfirmed] = useState<LiveConfirmResult | null>(null);
  // hold TTL 카운트다운 tick trigger
  const [, setHoldTick] = useState(0);
  useEffect(() => {
    if (!isLive || !myHold) return;
    const id = setInterval(() => setHoldTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isLive, myHold]);

  const holdRemainingMs = useMemo(() => {
    if (!isLive || !myHold) return null;
    const exp = Date.parse(myHold.expiresAt);
    if (!Number.isFinite(exp)) return null;
    return Math.max(0, exp - nowServer());
  }, [isLive, myHold, nowServer]);

  // hold TTL 만료 → 로컬 선택 해제 + 안내
  const holdExpiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLive || !myHold) return;
    if (holdRemainingMs === null || holdRemainingMs > 0) return;
    if (holdExpiredRef.current === myHold.seatLabel) return;
    holdExpiredRef.current = myHold.seatLabel;
    setSelected([]);
    setLiveInlineError('선점 시간이 만료됐어요. 좌석을 다시 선택해 주세요.');
    refetchSeats();
  }, [isLive, myHold, holdRemainingMs, refetchSeats]);

  // myHold 변경 시 selected 를 동기화 (외부 서버 상태 → 로컬 UI 상태 반영).
  // set-state-in-effect 룰 예외: myHold 는 순수한 서버 파생 값이지만
  // selected 는 practice/mock 흐름에서 사용자 클릭으로도 수정되므로 useMemo 통합 불가.
  useEffect(() => {
    if (!isLive) return;
    if (!myHold) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected([]);
      return;
    }
    holdExpiredRef.current = null;
    const zone = venue.zones.find((z) => myHold.seatLabel.startsWith(`${z.id}-`));
    if (!zone) return;
    // seatLabel = `${zoneId}-${row}-${col}` → 라벨 파싱
    const rest = myHold.seatLabel.slice(zone.id.length + 1);
    const lastDash = rest.lastIndexOf('-');
    if (lastDash < 0) return;
    const rowLabel = rest.slice(0, lastDash);
    const col = Number(rest.slice(lastDash + 1));
    if (!Number.isFinite(col)) return;
    setSelected([{
      id: myHold.seatLabel,
      zoneId: zone.id,
      zoneName: zone.name,
      tier: zone.tier,
      label: `${rowLabel}열 ${col}번`,
    }]);
  }, [isLive, myHold, venue.zones]);

  /* 타이머
   * - startedAt(서버 발급 세션 시작 시각) 주어지면: 마운트~완료까지 그 시점 기준으로 실시간 계산.
   *   → 대기 화면·CAPTCHA·좌석 선택 시간이 모두 포함되어 서버 랭킹 시간과 일치.
   * - startedAt 없으면(폴백): 기존 방식대로 zone/seats 단계에서만 로컬 카운트.
   */
  useEffect(() => {
    if (step === 'done') {
      clearInterval(timerRef.current);
      return;
    }
    if (startedAt) {
      const startMs = Date.parse(startedAt);
      if (Number.isFinite(startMs)) {
        const tick = () => setElapsedMs(Math.max(0, Date.now() - startMs));
        tick();
        timerRef.current = setInterval(tick, 10);
        return () => clearInterval(timerRef.current);
      }
    }
    if (step === 'zone' || step === 'seats') {
      timerRef.current = setInterval(() => setElapsedMs(e => e + 10), 10);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [step, startedAt]);

  const handleCaptchaConfirm = () => setStep('zone');
  const handleCaptchaCancel  = () => onBack?.();

  const handleSelectZone = useCallback((zoneId: string) => {
    const zone = venue.zones.find(z => z.id === zoneId);
    if (!zone) return;

    // 구역 지정 예매 모드: 좌석 그리드 스킵, 구역 자체를 예매 단위로 selected에 추가
    if (zone.entryMode === 'zone') {
      const seatId = `${zoneId}-ZONE`;
      setSelected(prev => {
        if (prev.some(s => s.id === seatId)) return prev;
        if (prev.length >= MAX_SEATS) return prev;
        return [
          ...prev,
          {
            id: seatId,
            zoneId: zone.id,
            zoneName: zone.name,
            tier: zone.tier,
            label: `${zone.name} 구역`,
          },
        ];
      });
      return;
    }

    // 좌석 상태 계산.
    //  - 실전 라이브(isLive=true): useSeatsStream.seatMap 이 SeatGrid 로 직접 주입. bookedSeats 미사용.
    //  - 라이브 미리보기(liveSeatSet 있음): live에 포함 안 된 좌석 = "미오픈" (선택 불가)
    //  - 연습 모드: 랜덤 ~35% 예매완료 시뮬레이션
    const taken = new Set<string>();
    if (!isLive && zone.type === 'seated' && zone.seatRows) {
      if (liveSeatSet) {
        zone.seatRows.forEach(row => {
          for (let col = 1; col <= row.seatCount; col++) {
            const id = `${zoneId}-${row.label}-${col}`;
            if (!liveSeatSet.has(id)) taken.add(id);
          }
        });
      } else {
        zone.seatRows.forEach(row => {
          for (let col = 1; col <= row.seatCount; col++) {
            if (Math.random() < 0.35) taken.add(`${zoneId}-${row.label}-${col}`);
          }
        });
      }
    }
    setBookedSeats(taken);
    setActiveZoneId(zoneId);
    setStep('seats');
  }, [venue.zones, liveSeatSet, isLive, MAX_SEATS]);

  const handleViewAll = () => {
    setActiveZoneId(null);
    setStep('zone');
  };

  const handleToggleSeat = useCallback((seat: SelectedSeat) => {
    if (isLive && liveMode) {
      // 라이브: 같은 좌석 재클릭은 무시(백엔드에 unhold 스펙 없음).
      if (myHold?.seatLabel === seat.id) return;
      setLiveInlineError(null);
      setHoldPending(true);
      liveApi.holdSeat(liveMode.sessionId, seat.id)
        .then((hold) => {
          onHoldSuccess(hold);
        })
        .catch((err) => {
          if (err instanceof ApiError) {
            if (err.code === 'SEAT_UNAVAILABLE') {
              setLiveInlineError('이미 다른 사람이 선점한 좌석이에요. 다른 좌석을 골라 주세요.');
              refetchSeats();
              return;
            }
            if (err.code === 'HOLD_EXPIRED') {
              setLiveInlineError('선점 시간이 만료됐어요. 다시 선택해 주세요.');
              refetchSeats();
              return;
            }
            if (err.code === 'ROUND_NOT_OPEN' || err.code === 'ROUND_ALREADY_CLOSED') {
              setLiveInlineError(err.message);
              return;
            }
            setLiveInlineError(err.message);
            return;
          }
          setLiveInlineError('좌석 선점 중 오류가 발생했습니다.');
        })
        .finally(() => setHoldPending(false));
      return;
    }
    setSelected(prev => {
      const idx = prev.findIndex(s => s.id === seat.id);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= MAX_SEATS) return prev;
      return [...prev, seat];
    });
  }, [isLive, liveMode, liveApi, myHold, onHoldSuccess, refetchSeats, MAX_SEATS]);

  const handleRemoveSeat = (id: string) =>
    setSelected(prev => prev.filter(s => s.id !== id));

  const handleReset = () => setSelected([]);

  const handleComplete = async () => {
    if (selected.length === 0) return;
    clearInterval(timerRef.current);

    // ── 라이브 모드: confirmSeat 호출 → 결과 상위 전달 ──
    if (isLive && liveMode) {
      const target = myHold?.seatLabel ?? selected[0]?.id;
      if (!target) return;
      setLiveInlineError(null);
      setConfirmPending(true);
      try {
        const res = await liveApi.confirmSeat(liveMode.sessionId, target);
        onConfirmSuccess(target);
        setConfirmed(res);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[live] confirm', res);
        }
        liveMode.onConfirmed?.(res, target);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'HOLD_EXPIRED') {
            setLiveInlineError('선점이 만료됐어요. 다시 선택해 주세요.');
            refetchSeats();
          } else if (err.code === 'SEAT_UNAVAILABLE') {
            setLiveInlineError('이미 다른 사람이 예매한 좌석이에요.');
            refetchSeats();
          } else {
            setLiveInlineError(err.message);
          }
        } else {
          setLiveInlineError('좌석 확정 중 오류가 발생했습니다.');
        }
      } finally {
        setConfirmPending(false);
      }
      return;
    }

    let result: SessionResult | null = null;
    if (sessionId) {
      try {
        // 게스트 식별은 HttpOnly `guest_uuid` 쿠키로 자동 전송됨. X-Guest-UUID 헤더 조립 불필요.
        result = await apiFetch<SessionResult>(
          ROUTES.practice.completeSession(sessionId),
          { method: 'POST', body: { clientElapsedMs: elapsedMs } },
        );
        setSessionResult(result);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('세션 완료 처리 실패:', e);
        }
      }
    }

    setStep('done');

    if (mode === 'live') {
      setStep('done');
      if (resultPath) router.push(resultPath);
    }
  };

  const activeZone = activeZoneId
    ? venue.zones.find(z => z.id === activeZoneId) ?? null
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ── 인터파크식 상단 헤더 바 ── */}
      <div className="border-b border-border bg-bg-surface">
        <div className="flex items-center gap-0 text-sm">
          {/* 단계 표시 */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 font-bold shrink-0" style={{ backgroundColor: '#C82028' }}>
            <span className="text-xs font-bold" style={{ color: '#F5C842' }}>02</span>
            <span className="text-white text-sm">좌석 선택</span>
          </div>
          <div className="hidden sm:flex items-center divide-x divide-[#E5E7EB] text-[#6B7280] text-xs">
            <span className="px-3 py-2.5 font-medium text-[#111827]">{meta.eventTitle}</span>
            <span className="px-3 py-2.5">{meta.venueName}</span>
            <div className="flex items-center gap-1 px-3 py-2.5">
              <span>▶ 다른 관람일자 선택 :</span>
              <span className="ml-1">일자</span>
              <select
                defaultValue={meta.date}
                className="ml-1 text-xs border border-[#D1D5DB] rounded px-1 py-0.5 bg-white text-[#111827]"
              >
                <option>{meta.date}</option>
              </select>
            </div>
            <div className="flex items-center gap-1 px-3 py-2.5">
              <span>시간</span>
              <select
                defaultValue={meta.time}
                className="ml-1 text-xs border border-[#D1D5DB] rounded px-1 py-0.5 bg-white text-[#111827]"
              >
                <option>{meta.time}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── 본문: 좌석 영역 + 우측 패널 ── */}
      <div className="flex flex-col sm:flex-row flex-1 gap-4 p-4 min-h-0 sm:items-start">

        {/* 좌석 영역 */}
        <div className="flex-1 min-w-0">
          {(step === 'zone' || step === 'done') && !activeZoneId && !(isLive && confirmed) && (
            venue.layout === 'auditorium'    ? <StadiumMap         venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'arena-ring'  ? <ArenaRingMap       venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'baseball'    ? <BaseballDiamondMap venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'stadium-oval' ? <StadiumOvalMap    venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'proscenium'  ? <ProsceniumMap     venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'festival'    ? <FestivalMap        venue={venue} onSelectZone={handleSelectZone} />
            :                                   <ZoneMap           venue={venue} onSelectZone={handleSelectZone} />
          )}

          {step === 'seats' && activeZone && !confirmed && (
            <div className="space-y-3">
              {isLive && (
                <LiveHoldBar
                  myHold={myHold}
                  remainingMs={holdRemainingMs}
                  seatsError={seatsError}
                  inlineError={liveInlineError}
                  holdPending={holdPending}
                  confirmPending={confirmPending}
                />
              )}
              <SeatGrid
                zone={activeZone}
                tier={venue.tiers[activeZone.tier]}
                selected={new Set(selected.map(s => s.id))}
                bookedSeats={bookedSeats}
                onToggle={handleToggleSeat}
                layout={venue.layout}
                unavailableLabel={liveSeatSet ? '미오픈' : undefined}
                seatStatusMap={isLive ? seatMap : undefined}
                myHoldSeatLabel={isLive ? myHold?.seatLabel ?? null : undefined}
              />
            </div>
          )}
        </div>

        {/* 우측 패널 */}
        <SelectionPanel
          venue={venue}
          selected={selected}
          activeZoneId={activeZoneId}
          onViewAll={handleViewAll}
          onRemove={handleRemoveSeat}
          onReset={handleReset}
          onComplete={handleComplete}
          onBack={onBack ?? (() => router.back())}
          mode={mode}
          elapsedMs={elapsedMs}
        />
      </div>

      {/* ── CAPTCHA 모달 ── */}
      {step === 'captcha' && (
        <CaptchaModal
          onConfirm={handleCaptchaConfirm}
          onCancel={handleCaptchaCancel}
          cancelLabel={isLive ? '나가기' : undefined}
        />
      )}

      {/* ── 연습 완료 팝업 ── */}
      {step === 'done' && mode === 'practice' && (
        <PracticeResultModal
          seat={selected.map(s => s.label).join(', ')}
          elapsedMs={sessionResult?.elapsedMs ?? elapsedMs}
          ranked={sessionResult?.ranked ?? false}
          sessionRank={sessionResult?.sessionRank ?? null}
          totalSessions={sessionResult?.totalSessions ?? null}
          rankPercentile={sessionResult?.rankPercentile ?? null}
          onRetry={() => onBack?.()}
          onViewRanking={onViewRanking}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LiveHoldBar — 라이브 좌석 선택 화면 상단 알림 바
   ─ 좌석 선점 카운트다운(30초 TTL) + hold/confirm 진행 배지 + 인라인 오류
   ───────────────────────────────────────────────────────── */

function LiveHoldBar({
  myHold,
  remainingMs,
  seatsError,
  inlineError,
  holdPending,
  confirmPending,
}: {
  myHold: { seatLabel: string; expiresAt: string } | null;
  remainingMs: number | null;
  seatsError: ApiError | null;
  inlineError: string | null;
  holdPending: boolean;
  confirmPending: boolean;
}) {
  const secLeft = remainingMs === null ? null : Math.ceil(remainingMs / 1000);
  const urgent = secLeft !== null && secLeft <= 5 && secLeft > 0;

  if (seatsError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text"
      >
        좌석 정보를 불러올 수 없습니다: {seatsError.message}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-sm">
      {myHold ? (
        <div className="flex items-center gap-2">
          <span className="badge badge-primary">선점 중</span>
          <span className="text-text-secondary">
            좌석{' '}
            <span className="font-mono-tabular font-semibold text-text">
              {myHold.seatLabel}
            </span>
          </span>
          {secLeft !== null && (
            <span
              className={[
                'font-mono-tabular font-bold',
                urgent ? 'text-danger-text' : 'text-primary',
              ].join(' ')}
            >
              {secLeft}s
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="badge badge-neutral">대기</span>
          <span>좌석을 클릭하면 30초 동안 자리가 임시 예약됩니다.</span>
        </div>
      )}

      {holdPending && (
        <span className="text-xs text-text-tertiary">선점 요청 중…</span>
      )}
      {confirmPending && (
        <span className="text-xs text-text-tertiary">확정 요청 중…</span>
      )}
      {inlineError && !confirmPending && !holdPending && (
        <span className="ml-auto text-xs text-danger-text" role="alert">
          {inlineError}
        </span>
      )}
    </div>
  );
}
