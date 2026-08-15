'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { VenueConfig, SelectedSeat } from '@/types/ticketing';
import CaptchaModal  from './CaptchaModal';
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
import { useAuth } from '@/contexts/AuthContext';
import TicketModal, { type TicketData } from './TicketModal';

/* ─────────────────────────────────────────────────────────
   BookingFlow — 인터파크 스타일 예매 플로우
   CAPTCHA → 구역 선택 → 좌석 선택 → 완료
   ───────────────────────────────────────────────────────── */

type Step = 'captcha' | 'zone' | 'seats' | 'done';

type SessionResult = {
  elapsedMs: number;
  /** false: 다른 게스트가 먼저 쓴 닉네임이라 랭킹 미반영. 이 경우 rank 필드는 모두 null. */
  ranked: boolean;
  rankNumber: number | null;
  rankPercentile: number | null;
  totalCount: number | null;
};

interface BookingMeta {
  eventTitle: string;
  venueName:  string;
  date:       string;   // "2026년 08월 01일(토)"
  time:       string;   // "18시 00분"
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
  /**
   * 라이브 미리보기 모드. 지정 시:
   * - 이 배열에 속한 좌석만 선택 가능
   * - 나머지 좌석은 "미오픈"으로 표시 (라이브 회차에 열리지 않은 좌석)
   * - 랜덤 예매완료 시뮬레이션 비활성화 (실 라이브 회차 UX 그대로 재현)
   */
  liveSeatLabels?: string[];
}

export default function BookingFlow({
  venue, meta, mode, sessionId, startedAt, skipCaptcha = false, resultPath, onBack,
  liveSeatLabels,
}: Props) {
  const liveSeatSet = useMemo(
    () => (liveSeatLabels && liveSeatLabels.length > 0 ? new Set(liveSeatLabels) : null),
    [liveSeatLabels],
  );
  const router = useRouter();
  const [step,         setStep]         = useState<Step>(skipCaptcha ? 'zone' : 'captcha');
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selected,     setSelected]     = useState<SelectedSeat[]>([]);
  const { user, guestNickname } = useAuth();
  const [elapsedMs,      setElapsedMs]      = useState(0);
  const [sessionResult,  setSessionResult]  = useState<SessionResult | null>(null);
  const [ticket,         setTicket]         = useState<TicketData | null>(null);
  const [bookedSeats,    setBookedSeats]    = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
    //  - 라이브 미리보기(liveSeatSet 있음): live에 포함 안 된 좌석 = "미오픈" (선택 불가)
    //  - 연습 모드: 랜덤 ~35% 예매완료 시뮬레이션
    const taken = new Set<string>();
    if (zone.type === 'seated' && zone.seatRows) {
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
  }, [venue.zones, liveSeatSet]);

  const handleViewAll = () => {
    setActiveZoneId(null);
    setStep('zone');
  };

  const MAX_SEATS = 4;

  const handleToggleSeat = useCallback((seat: SelectedSeat) => {
    setSelected(prev => {
      const idx = prev.findIndex(s => s.id === seat.id);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= MAX_SEATS) return prev;
      return [...prev, seat];
    });
  }, []);

  const handleRemoveSeat = (id: string) =>
    setSelected(prev => prev.filter(s => s.id !== id));

  const handleReset = () => setSelected([]);

  const handleComplete = async () => {
    if (selected.length === 0) return;
    clearInterval(timerRef.current);

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

    /* 티켓 데이터 생성 */
    const issuedAt = new Date();
    const dateStr = `${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, '0')}${String(issuedAt.getDate()).padStart(2, '0')}`;
    const stubBuf = new Uint32Array(1);
    crypto.getRandomValues(stubBuf);
    const stubNum = String(stubBuf[0] % 100000).padStart(5, '0');
    const nickname = user?.name || guestNickname || '게스트';
    setTicket({
      eventTitle:     meta.eventTitle,
      seat:           selected.map(s => s.label).join(', '),
      nickname,
      isGuest:        !user,
      elapsedMs:      result?.elapsedMs ?? elapsedMs,
      // ranked === false면 rank 필드는 모두 null이므로 그대로 전달 (TicketModal에서 방어)
      // API 실패로 result === null인 경우도 ranked=false로 취급해 UI 방어
      ranked:         result?.ranked ?? false,
      rankNumber:     result?.rankNumber ?? null,
      totalCount:     result?.totalCount ?? null,
      rankPercentile: result?.rankPercentile ?? null,
      serial:         `TR-${dateStr}-${stubNum}`,
      issuedAt,
    });

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
      <div className="flex flex-1 gap-4 p-4 min-h-0 items-start">

        {/* 좌석 영역 */}
        <div className="flex-1 min-w-0">
          {(step === 'zone' || step === 'done') && !activeZoneId && (
            venue.layout === 'auditorium'    ? <StadiumMap         venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'arena-ring'  ? <ArenaRingMap       venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'baseball'    ? <BaseballDiamondMap venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'stadium-oval' ? <StadiumOvalMap    venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'proscenium'  ? <ProsceniumMap     venue={venue} onSelectZone={handleSelectZone} />
            : venue.layout === 'festival'    ? <FestivalMap        venue={venue} onSelectZone={handleSelectZone} />
            :                                   <ZoneMap           venue={venue} onSelectZone={handleSelectZone} />
          )}
          {step === 'seats' && activeZone && (
            <SeatGrid
              zone={activeZone}
              tier={venue.tiers[activeZone.tier]}
              selected={new Set(selected.map(s => s.id))}
              bookedSeats={bookedSeats}
              onToggle={handleToggleSeat}
              layout={venue.layout}
              unavailableLabel={liveSeatSet ? '미오픈' : undefined}
            />
          )}
          {step === 'done' && mode === 'practice' && (
            <div className="card p-8 text-center space-y-4">
              <span className="badge badge-success text-sm px-4 py-1.5">연습 완료</span>
              <p className="text-2xl font-bold text-text">
                소요 시간:{' '}
                <span className="text-primary font-mono-tabular">
                  {((sessionResult?.elapsedMs ?? elapsedMs) / 1000).toFixed(3)}s
                </span>
              </p>

              {sessionResult?.ranked && sessionResult.rankNumber !== null && sessionResult.totalCount !== null && sessionResult.rankPercentile !== null && (
                <div className="flex justify-center gap-6 py-3 border-y border-border">
                  <div>
                    <p className="text-xs text-text-secondary mb-0.5">내 순위</p>
                    <p className="text-lg font-bold text-text font-mono-tabular">
                      {sessionResult.rankNumber}
                      <span className="text-sm font-normal text-text-secondary ml-0.5">
                        / {sessionResult.totalCount}
                      </span>
                    </p>
                  </div>
                  <div className="w-px bg-border" />
                  <div>
                    <p className="text-xs text-text-secondary mb-0.5">상위</p>
                    <p className="text-lg font-bold text-primary font-mono-tabular">
                      {sessionResult.rankPercentile.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {sessionResult && !sessionResult.ranked && (
                <div className="mx-auto max-w-sm rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning-text">
                  다른 게스트가 먼저 사용한 닉네임이라 랭킹에 반영되지 않았습니다.
                </div>
              )}

              <p className="text-sm text-text-secondary">
                선택 좌석: {selected.map(s => s.label).join(', ')}
              </p>
              <button
                className="btn btn-neutral btn-sm"
                onClick={() => {
                  setStep('zone');
                  setActiveZoneId(null);
                  setSelected([]);
                  setElapsedMs(0);
                  setSessionResult(null);
                  setTicket(null);
                }}
              >
                다시 연습하기
              </button>
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
        />
      )}

      {/* ── 티켓 모달 ── */}
      {ticket && (
        <TicketModal
          {...ticket}
          onClose={() => setTicket(null)}
          onRetry={() => { setTicket(null); onBack?.(); }}
        />
      )}
    </div>
  );
}
