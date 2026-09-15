'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BookingFlow from '@/components/booking/BookingFlow';
import TicketingDetailLayout, {
  type TicketingSession,
} from '@/components/booking/TicketingDetailLayout';
import { apiFetch, ROUTES } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { PracticeEvent } from '@/data/practice';
import { parseLiveSeatLabel } from '@/data/live/seatLabels';
import {
  getRankings,
  getMyRankings,
  type RankEntry,
  type MyRankEntry,
  type RankingPeriod,
} from '@/lib/rankings';
import RankingTable from '@/components/ranking/RankingTable';

/**
 * 해당 tier에 속한 "실제 선택 가능한 좌석 수"를 계산.
 * - 라이브 미리보기 이벤트(liveSeatLabels 있음): 그 라벨 중 tier의 zone에 속한 것만 카운트
 * - 일반 연습 이벤트: venue 정의(seatRows)의 seatCount 합
 */
function countSelectableSeatsByTier(event: PracticeEvent, tierId: string): number {
  if (event.liveSeatLabels && event.liveSeatLabels.length > 0) {
    const zoneIdsInTier = new Set(
      event.venue.zones.filter((z) => z.tier === tierId).map((z) => z.id),
    );
    return event.liveSeatLabels.filter((label) => {
      const parsed = parseLiveSeatLabel(label);
      return parsed !== null && zoneIdsInTier.has(parsed.zoneId);
    }).length;
  }
  return event.venue.zones
    .filter((z) => z.tier === tierId)
    .reduce(
      (acc, z) => acc + (z.seatRows?.reduce((s, r) => s + r.seatCount, 0) ?? 0),
      0,
    );
}

/* ──────────────────────────────────────────────────────────
   연습 모드 상세 — 인터파크 스타일 공연 상세 페이지 + 예매 플로우
   ────────────────────────────────────────────────────────── */

/* 2026년 8월 달력 데이터
   8월 1일 = 토요일(인덱스 6) → 앞에 빈 칸 6개 */
const AUGUST_2026_OFFSET = 6;

/** '2026.08.05 ~ 2026.08.10' → { startDay: 5, endDay: 10 } */
function parseEventPeriod(period: string): { startDay: number; endDay: number } {
  const parts = period.split(' ~ ');
  const parse = (s: string) => parseInt(s.split('.')[2], 10);
  return { startDay: parse(parts[0]), endDay: parse(parts[1] ?? parts[0]) };
}

/** 이벤트 기간 내 첫 번째 주말 날짜 반환 */
function firstWeekendInPeriod(startDay: number, endDay: number): number {
  for (let d = startDay; d <= endDay; d++) {
    const dow = (AUGUST_2026_OFFSET + d - 1) % 7; // 0=일, 6=토
    if (dow === 0 || dow === 6) return d;
  }
  return startDay; // 주말 없으면 startDay 반환
}

const WAITING_STORAGE_KEY = 'practice_waiting';

type WaitingSnapshot = {
  eventId: number;
  selectedDate: number;
  selectedSession: number;
  /** 이미 발급된 세션 정보. 새로고침 시 재사용해 서버 타이머 연속성 유지 (새로고침 페널티). */
  sessionId: string | null;
  startedAt: string | null;
};

export default function PracticeDetailClient({ event }: { event: PracticeEvent }) {
  const router = useRouter();
  const { user, guestNickname, syncGuestNickname } = useAuth();
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [showWaiting, setShowWaiting] = useState<boolean>(false);
  const [waitingProgress, setWaitingProgress] = useState<number>(0);
  const [, setWaitingSecondsLeft] = useState<number>(5);
  const [queueNumber, setQueueNumber] = useState<number>(0);
  const snapshotsRef = useRef<{ time: number; value: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState<number>(() => {
    const { startDay, endDay } = parseEventPeriod(event.period);
    return firstWeekendInPeriod(startDay, endDay);
  });
  const [selectedSession, setSelectedSession] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // 서버가 기록한 세션 시작 시각 (ISO). 예매하기 클릭 직후 발급되며 랭킹 타이머의 기준점.
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [bookingPending, setBookingPending] = useState<boolean>(false);
  const bookingLockRef = useRef<boolean>(false);
  // 대기 화면에서 새로고침을 감지해 자동으로 예매 진입을 재개하기 위한 플래그
  const [pendingResume, setPendingResume] = useState<boolean>(false);

  // 연습 랭킹 섹션 — 전체/내기록 탭 + 기간 필터 (선택된 이벤트로 스코프)
  const [rankTab, setRankTab] = useState<'all' | 'mine'>('all');
  const [rankPeriod, setRankPeriod] = useState<RankingPeriod>('monthly');
  const [rankings, setRankings] = useState<(RankEntry | MyRankEntry)[]>([]);
  const [rankLoading, setRankLoading] = useState(true);

  const loadRankings = useCallback(async () => {
    setRankLoading(true);
    const fetcher = rankTab === 'mine' ? getMyRankings : getRankings;
    try {
      const rows = await fetcher({ mode: 'practice', period: rankPeriod, eventId: event.eventId });
      setRankings(rows);
    } catch {
      setRankings([]);
    } finally {
      setRankLoading(false);
    }
  }, [event.eventId, rankTab, rankPeriod]);

  useEffect(() => {
    void loadRankings();
  }, [loadRankings]);

  // 마운트 시 sessionStorage 확인 — 대기 화면에서 새로고침한 경우 날짜/회차 + 세션 정보 복원 후 재개 플래그 세팅.
  // 스냅샷의 eventId가 현재 라우트 이벤트와 다르면(다른 연습 이벤트의 잔재) 정리만 하고 무시.
  useEffect(() => {
    const raw = sessionStorage.getItem(WAITING_STORAGE_KEY);
    if (!raw) return;
    // setState는 마이크로태스크로 defer해 React 19의 set-state-in-effect 규칙을 준수
    queueMicrotask(() => {
      try {
        const snap = JSON.parse(raw) as WaitingSnapshot;
        if (snap.eventId !== event.eventId) {
          sessionStorage.removeItem(WAITING_STORAGE_KEY);
          return;
        }
        setSelectedDate(snap.selectedDate);
        setSelectedSession(snap.selectedSession);
        // 세션 정보가 이미 있으면 재사용 — 재발급하지 않아 서버 startedAt이 유지됨
        if (snap.sessionId && snap.startedAt) {
          setSessionId(snap.sessionId);
          setSessionStartedAt(snap.startedAt);
        }
        setPendingResume(true);
      } catch {
        sessionStorage.removeItem(WAITING_STORAGE_KEY);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 모달(대기/예매 팝업) 열려있을 때 배경 body 스크롤 방지
  useEffect(() => {
    if (!showWaiting && !showPopup) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showWaiting, showPopup]);

  // 대기 중일 때만 sessionStorage에 스냅샷 저장 (새로고침 대비). 대기 종료·이탈 시 자동 삭제.
  useEffect(() => {
    if (!showWaiting) {
      sessionStorage.removeItem(WAITING_STORAGE_KEY);
      return;
    }
    const snap: WaitingSnapshot = {
      eventId: event.eventId,
      selectedDate,
      selectedSession,
      sessionId,
      startedAt: sessionStartedAt,
    };
    sessionStorage.setItem(WAITING_STORAGE_KEY, JSON.stringify(snap));
  }, [showWaiting, event.eventId, selectedDate, selectedSession, sessionId, sessionStartedAt]);

  async function handleBooking() {
    if (bookingLockRef.current) return;
    bookingLockRef.current = true;
    setBookingPending(true);

    try {
      // 게스트 식별은 백엔드가 HttpOnly `guest_uuid` 쿠키로 관리 — 첫 세션 시 발급, 이후 자동 전송.
      // 프론트는 UUID를 조립/전달하지 않는다. (credentials: "include"는 apiFetch가 기본 세팅)
      const nickname = user
        ? user.name
        : guestNickname || `게스트${Math.floor(Math.random() * 9000 + 1000)}`;

      const { sessionId: newSessionId, startedAt, nickname: serverNickname } = await apiFetch<{
        sessionId: string;
        startedAt: string;
        nickname: string;
      }>(
        ROUTES.practice.sessions,
        { method: 'POST', body: { mode: 'practice', nickname, eventId: event.eventId } },
      );
      setSessionId(newSessionId);
      setSessionStartedAt(startedAt);
      // 서버가 게스트 UUID의 최초 닉네임을 강제한 경우 로컬 상태와 동기화
      // (로그인 유저는 server nickname == user.name이므로 갱신 불필요)
      if (!user && serverNickname) syncGuestNickname(serverNickname);
    } catch (e) {
      // API 실패는 무시하고 대기 화면으로 진입 (연습 모드이므로 sessionId 없어도 진행)
      void e;
      setSessionId(null);
      setSessionStartedAt(null);
    }

    startWaiting();
    // lock 해제는 대기 화면 종료 시점(useEffect duration 도달)에서 수행
  }

  // 대기 화면 진입 (큐 넘버·프로그레스 초기화 후 showWaiting=true).
  // handleBooking과 재개 로직에서 공용.
  function startWaiting() {
    const qn = Math.floor(Math.random() * 50000 + 30000); // 3만~8만명
    setQueueNumber(qn);
    setWaitingProgress(0);
    setWaitingSecondsLeft(5);
    setShowWaiting(true);
  }

  // 새로고침으로 복원된 상태면 예매 자동 재개
  // - 세션 정보(sessionId + startedAt)가 복원됐으면 API 재호출하지 않고 대기 화면만 다시 표시
  //   → 서버 startedAt이 유지되어 총 경과 시간이 이어짐 (새로고침 페널티)
  // - 세션 정보가 없으면(API 최초 실패 등) handleBooking으로 신규 발급 시도
  useEffect(() => {
    if (!pendingResume) return;
    queueMicrotask(() => {
      setPendingResume(false);
      if (sessionId && sessionStartedAt) {
        startWaiting();
      } else {
        void handleBooking();
      }
    });
    // handleBooking/startWaiting은 최신 클로저 사용 — deps에서 제외해 무한 루프 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingResume]);

  useEffect(() => {
    if (!showWaiting) return;

    const duration = 5000;
    const chunkPhaseEnd = Math.floor(duration * 0.85); // 청크 감소 구간 종료 (4250ms)
    const tailStart = Math.floor(duration * 0.9);      // 소량만 남기는 시점 (4500ms)
    const initialQueue = queueNumber;

    // 청크 스냅샷 생성
    // 규칙: t=0~chunkPhaseEnd 구간에서 랜덤 큰 감소, 단 remaining이 초기값의 3% 아래로 내려가지 않음
    //       t=tailStart에서 소량만 남기고 t=duration에서 0 → progress와 동기화
    const snapshots: { time: number; value: number }[] = [{ time: 0, value: initialQueue }];
    let remaining = initialQueue;
    let t = 0;
    const floor = Math.floor(initialQueue * 0.03);

    while (t < chunkPhaseEnd) {
      const gap = Math.floor(Math.random() * 280 + 130); // 5초 구간에 맞춘 자연스러운 간격
      t += gap;
      if (t >= chunkPhaseEnd) break;
      const minChunk = Math.floor(initialQueue * 0.05);
      const maxChunk = Math.floor(initialQueue * 0.14);
      const decrement = Math.floor(Math.random() * (maxChunk - minChunk) + minChunk);
      remaining = Math.max(floor, remaining - decrement);
      snapshots.push({ time: t, value: remaining });
      if (remaining <= floor) break;
    }
    // tailStart: 아주 조금만 남기기
    snapshots.push({ time: tailStart, value: Math.floor(initialQueue * 0.01) });
    // duration: 0 (progress 100%와 동기화)
    snapshots.push({ time: duration, value: 0 });
    snapshotsRef.current = snapshots;

    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      setWaitingProgress(ratio * 100);
      setWaitingSecondsLeft(Math.max(0, Math.ceil((duration - elapsed) / 1000)));

      // 현재 시간에 해당하는 스냅샷 값 찾기
      const snaps = snapshotsRef.current;
      let qVal = initialQueue;
      for (let i = snaps.length - 1; i >= 0; i--) {
        if (elapsed >= snaps[i].time) { qVal = snaps[i].value; break; }
      }
      setQueueNumber(qVal);

      if (elapsed >= duration) {
        clearInterval(interval);
        setShowWaiting(false);
        setShowPopup(true);
        bookingLockRef.current = false;
        setBookingPending(false);
      }
    }, 50);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWaiting]);

  /* ── 이벤트 상세 화면 ── */
  const { startDay, endDay } = parseEventPeriod(event.period);
  // 관람일: 이벤트 기간 내 모든 주말 날짜(YYYY-MM-DD) 리스트
  const availableDates: string[] = [];
  for (let d = startDay; d <= endDay; d++) {
    const dow = (AUGUST_2026_OFFSET + d - 1) % 7;
    if (dow === 0 || dow === 6) {
      availableDates.push(`2026-08-${String(d).padStart(2, '0')}`);
    }
  }

  const seatLoad = Object.entries(event.venue.tiers)
    .map(
      ([tierId, tier]) =>
        `${tier.label} ${countSelectableSeatsByTier(event, tierId)}`,
    )
    .join(' · ');

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: '장소', value: event.venueName },
    { label: '공연기간', value: event.period },
    { label: '관람연령', value: '전체 이용가' },
    { label: '혜택', value: '연습 완료 시 랭킹 포인트 적립' },
    { label: '배송', value: '해당 없음 (모바일 티켓)' },
    { label: '좌석 현황', value: seatLoad },
  ];

  const layoutSessions: TicketingSession[] = event.sessions.map(
    (s, idx) => ({
      id: String(idx),
      label: s.label,
      // 연습은 opensAt 개념이 없음 — 표시용 임시값
      opensAt: new Date().toISOString(),
      totalSeats: 0,
    }),
  );

  return (
    <>
      <TicketingDetailLayout
        mode="practice"
        title={event.title}
        venueName={event.venueName}
        posterImage={event.posterImage}
        posterColor={event.posterBg}
        infoRows={infoRows}
        availableDates={availableDates}
        sessions={layoutSessions}
        selectedSessionId={String(selectedSession)}
        onSelectSession={(id) => setSelectedSession(Number(id))}
        canBook={!bookingPending}
        pending={bookingPending}
        onBook={handleBooking}
        onBack={() => router.push('/practice')}
        backLabel="← 다른 이벤트 선택"
        rules={[
          '연습 모드는 무료로 실전과 동일한 티켓팅을 체험할 수 있습니다.',
          '완료 시 소요 시간에 따라 랭킹 포인트가 적립됩니다.',
          '새로고침 시 대기순서와 경과 시간은 유지되며 페널티가 부여됩니다.',
        ]}
      />
      {/* 하단 선택된 날짜/좌석 요약 (연습 페이지 고유 헬퍼) */}
      <div className="max-w-6xl mx-auto px-4 -mt-4 pb-6 text-xs text-text-tertiary">
        선택 관람일: 8월 {String(selectedDate).padStart(2, '0')}일 · 현재 회차:{' '}
        {event.sessions[selectedSession].label}
      </div>

      {/* 연습 랭킹 */}
      <div id="practice-ranking" className="max-w-6xl mx-auto px-4 pb-10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text">연습 랭킹</h2>
            <p className="text-sm text-text-secondary mt-1">소요 시간이 빠른 순으로 정렬됩니다.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="inline-flex flex-wrap rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
              {([{ key: 'all', label: '전체 랭킹' }, { key: 'mine', label: '내 기록' }] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRankTab(key)}
                  className={[
                    'shrink-0 whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                    key === rankTab
                      ? 'bg-bg-surface text-text shadow-xs border border-border'
                      : 'text-text-secondary hover:text-text',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="inline-flex flex-wrap rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
              {([{ key: 'daily', label: '일간' }, { key: 'weekly', label: '주간' }, { key: 'monthly', label: '월간' }] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRankPeriod(key)}
                  className={[
                    'shrink-0 whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                    key === rankPeriod
                      ? 'bg-bg-surface text-text shadow-xs border border-border'
                      : 'text-text-secondary hover:text-text',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                {rankTab === 'mine' && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">날짜</th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary w-12 whitespace-nowrap">순위</th>
                {rankTab === 'all' && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">닉네임</th>
                )}
                {/* 남는 폭을 흡수하는 열이 하나는 있어야 나머지 열이 왼쪽에 붙는다.
                    전체 랭킹은 닉네임이, "내 기록"은 닉네임이 없으니 소요 시간이 맡는다. */}
                <th className={`text-right px-4 py-3 text-xs font-semibold text-text-secondary${rankTab === 'mine' ? ' w-full' : ''}`}>소요 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-sm text-text-tertiary">불러오는 중…</td>
                </tr>
              ) : (
                <RankingTable
                  key={`${rankTab}-${rankPeriod}`}
                  mode="practice"
                  period={rankPeriod}
                  eventId={event.eventId}
                  myRankings={rankTab === 'mine'}
                  initialRows={rankings}
                  showNickname={rankTab === 'all'}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>

    {/* 대기 화면 오버레이 */}
    {showWaiting && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-sm bg-bg-page rounded-2xl shadow-2xl p-8">

          {/* 상단 텍스트 */}
          <div className="mb-7">
            <p className="text-lg font-bold text-text">접속 인원이 많아 대기 중입니다.</p>
            <p className="text-xl font-bold text-primary mt-0.5">조금만 기다려주세요.</p>
            <p className="text-xs text-text-secondary mt-2">{event.title}</p>
          </div>

          {/* 카드 */}
          <div className="bg-white rounded-xl border border-border p-6">
            <p className="text-xs text-text-secondary text-center font-medium">나의 대기순서</p>
            <p className="text-5xl font-black text-text text-center font-mono-tabular mt-2 tracking-tight">
              {queueNumber.toLocaleString()}
            </p>

            {/* 프로그레스바 */}
            <div className="flex items-center gap-2 mt-6 mb-5">
              <div
                className="w-4 h-4 rounded-full bg-primary shrink-0"
                style={{ boxShadow: '0 0 0 3px rgba(232,93,0,0.15)' }}
              />
              <div className="flex-1 relative h-3.5 rounded-full bg-bg-subtle overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: `${waitingProgress}%` }}
                />
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary shrink-0">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-sm text-text-secondary">현재 대기인원</p>
              <p className="text-sm font-semibold text-text font-mono-tabular">
                {(queueNumber + 127).toLocaleString()}명
              </p>
            </div>
          </div>

          {/* 안내 */}
          <div className="mt-5 space-y-1 text-xs text-text-secondary">
            <p>· 잠시만 기다려주시면, 예매하기 페이지로 연결됩니다.</p>
            <p>· 새로고침하면 대기순서가 초기화됩니다.</p>
          </div>
        </div>
      </div>
    )}

    {/* macOS 스타일 브라우저 팝업 오버레이 */}
    {showPopup && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
        onClick={(e) => { e.stopPropagation(); }}
      >
        {/* 팝업 창 — 900x680 PC 디자인 기준, 뷰포트가 좁으면(태블릿 등 sm: 구간 포함) 항상 뷰포트에 맞춰 축소 */}
        <div
          className="flex flex-col rounded-xl overflow-hidden shadow-2xl border border-gray-300 w-[94vw] sm:w-[min(900px,94vw)] h-[88vh] sm:h-[min(680px,88vh)]"
          style={{ maxWidth: 900, maxHeight: 680, background: '#fff' }}
        >
          {/* macOS 창 상단 바 */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#ECECEC] border-b border-[#D0D0D0] shrink-0">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all"
                aria-label="닫기"
              />
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
            </div>
            {/* 제목 */}
            <span className="flex-1 text-center text-xs text-[#444] font-medium truncate">
              {event.title} | NOL 티켓
            </span>
          </div>

          {/* URL 바 */}
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[#F4F4F4] border-b border-[#D0D0D0] shrink-0">
            <div className="flex-1 bg-white border border-[#CDCDCD] rounded px-3 py-1 text-xs text-[#555] font-mono flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>poticket.interpark.com/Book/BookMain.asp</span>
            </div>
          </div>

          {/* BookingFlow 본문 — 세로 오버플로우 시 모달 내부에서 스크롤 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <BookingFlow
              venue={event.venue}
              meta={{
                eventTitle: event.title,
                venueName: event.venueName,
                date: `2026년 08월 ${String(selectedDate).padStart(2, '0')}일(토)`,
                time: event.sessions[selectedSession].time,
              }}
              mode="practice"
              sessionId={sessionId ?? undefined}
              startedAt={sessionStartedAt ?? undefined}
              skipCaptcha={false}
              onBack={() => setShowPopup(false)}
              onViewRanking={() => {
                setShowPopup(false);
                void loadRankings();
                requestAnimationFrame(() => {
                  document.getElementById('practice-ranking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              liveSeatLabels={event.liveSeatLabels}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
