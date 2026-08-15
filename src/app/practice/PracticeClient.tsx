'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import BookingFlow from '@/components/booking/BookingFlow';
import { apiFetch, ROUTES } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PRACTICE_EVENTS, type PracticeEvent } from '@/data/practice';
import { parseLiveSeatLabel } from '@/data/live/seatLabels';

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
   연습 모드 — 이벤트 선택 + 인터파크 스타일 공연 상세 페이지
   ────────────────────────────────────────────────────────── */

/* 2026년 8월 달력 데이터
   8월 1일 = 토요일(인덱스 6) → 앞에 빈 칸 6개 */
const AUGUST_2026_OFFSET = 6;
const AUGUST_2026_DAYS = 31;

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

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

export default function PracticeClient() {
  const { user, guestNickname, syncGuestNickname } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<PracticeEvent | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [showWaiting, setShowWaiting] = useState<boolean>(false);
  const [waitingProgress, setWaitingProgress] = useState<number>(0);
  const [, setWaitingSecondsLeft] = useState<number>(5);
  const [queueNumber, setQueueNumber] = useState<number>(0);
  const snapshotsRef = useRef<{ time: number; value: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState<number>(1);
  const [selectedSession, setSelectedSession] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // 서버가 기록한 세션 시작 시각 (ISO). 예매하기 클릭 직후 발급되며 랭킹 타이머의 기준점.
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [bookingPending, setBookingPending] = useState<boolean>(false);
  const bookingLockRef = useRef<boolean>(false);
  // 대기 화면에서 새로고침을 감지해 자동으로 예매 진입을 재개하기 위한 플래그
  const [pendingResume, setPendingResume] = useState<boolean>(false);

  /* 달력 셀 배열 생성: offset 만큼 null, 이후 1~31 */
  const calendarCells: (number | null)[] = [
    ...Array(AUGUST_2026_OFFSET).fill(null),
    ...Array.from({ length: AUGUST_2026_DAYS }, (_, i) => i + 1),
  ];
  const remainder = calendarCells.length % 7;
  if (remainder !== 0) {
    calendarCells.push(...Array(7 - remainder).fill(null));
  }
  const calendarWeeks: (number | null)[][] = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    calendarWeeks.push(calendarCells.slice(i, i + 7));
  }

  // 마운트 시 sessionStorage 확인 — 대기 화면에서 새로고침한 경우 이벤트/날짜/회차 + 세션 정보 복원 후 재개 플래그 세팅
  useEffect(() => {
    const raw = sessionStorage.getItem(WAITING_STORAGE_KEY);
    if (!raw) return;
    // setState는 마이크로태스크로 defer해 React 19의 set-state-in-effect 규칙을 준수
    queueMicrotask(() => {
      try {
        const snap = JSON.parse(raw) as WaitingSnapshot;
        const event = PRACTICE_EVENTS.find(e => e.eventId === snap.eventId);
        if (!event) {
          sessionStorage.removeItem(WAITING_STORAGE_KEY);
          return;
        }
        setSelectedEvent(event);
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
    if (!showWaiting || !selectedEvent) {
      sessionStorage.removeItem(WAITING_STORAGE_KEY);
      return;
    }
    const snap: WaitingSnapshot = {
      eventId: selectedEvent.eventId,
      selectedDate,
      selectedSession,
      sessionId,
      startedAt: sessionStartedAt,
    };
    sessionStorage.setItem(WAITING_STORAGE_KEY, JSON.stringify(snap));
  }, [showWaiting, selectedEvent, selectedDate, selectedSession, sessionId, sessionStartedAt]);

  async function handleBooking() {
    if (!selectedEvent) return;
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
        { method: 'POST', body: { mode: 'practice', nickname, eventId: selectedEvent.eventId } },
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

  // 새로고침으로 복원된 상태에서 selectedEvent가 세팅되면 예매 자동 재개
  // - 세션 정보(sessionId + startedAt)가 복원됐으면 API 재호출하지 않고 대기 화면만 다시 표시
  //   → 서버 startedAt이 유지되어 총 경과 시간이 이어짐 (새로고침 페널티)
  // - 세션 정보가 없으면(API 최초 실패 등) handleBooking으로 신규 발급 시도
  useEffect(() => {
    if (!pendingResume || !selectedEvent) return;
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
  }, [pendingResume, selectedEvent]);

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

  /* ── 이벤트 선택 화면 ── */
  if (selectedEvent === null) {
    return (
      <div className="bg-bg-page min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* 헤더 */}
          <div className="mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] text-text-secondary uppercase mb-3">
              연습 모드 · 무료 체험
            </p>
            <h1 className="text-3xl font-bold text-text tracking-tight">이벤트를 선택하세요</h1>
            <p className="mt-2 text-sm text-text-secondary">
              원하는 공연을 선택하고 실전과 동일한 티켓팅을 연습해보세요.
            </p>
          </div>

          {/* 이벤트 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PRACTICE_EVENTS.map(event => (
              <div
                key={event.id}
                className="group cursor-pointer"
                onClick={() => {
                  const { startDay, endDay } = parseEventPeriod(event.period);
                  setSelectedDate(firstWeekendInPeriod(startDay, endDay));
                  setSelectedEvent(event);
                  setSelectedSession(0);
                }}
              >
                {/* 포스터 */}
                <div
                  className="relative w-full rounded-xl overflow-hidden mb-3"
                  style={{ aspectRatio: '3/4', background: event.posterBg }}
                >
                  <Image
                    src={event.posterImage}
                    alt={event.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  {/* 하단 페이드 */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-2/3 z-10"
                    style={{ background: `linear-gradient(to top, rgba(0,0,0,0.85) 20%, transparent)` }}
                  />
                  {/* 텍스트 */}
                  <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between">
                    <p
                      className="text-[9px] font-bold tracking-[0.3em] uppercase"
                      style={{ color: event.posterAccent }}
                    >
                      Ticket Rush · Practice
                    </p>
                    <div>
                      <p className="text-white font-black text-lg leading-tight drop-shadow">
                        {event.title.replace('[연습] ', '')}
                      </p>
                      <p className="text-white/60 text-xs mt-2">{event.venueName}</p>
                      <p className="text-white/40 text-[11px] mt-0.5">{event.period}</p>
                    </div>
                  </div>
                </div>

                {/* 카드 하단 */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text leading-snug">
                      {event.title.replace('[연습] ', '')}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">{event.venueName}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{event.period}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary shrink-0 group-hover:underline mt-0.5">
                    선택 →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── 이벤트 상세 화면 ── */
  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: '장소', value: selectedEvent.venueName },
    { label: '공연기간', value: selectedEvent.period },
    { label: '관람연령', value: '전체 이용가' },
    { label: '혜택', value: '연습 완료 시 랭킹 포인트 적립' },
    { label: '배송', value: '해당 없음 (모바일 티켓)' },
  ];

  return (
    <>
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* 뒤로가기 버튼 */}
        <button
          type="button"
          onClick={() => setSelectedEvent(null)}
          className="btn btn-neutral btn-sm mb-4"
        >
          ← 다른 이벤트 선택
        </button>

        {/* 제목 영역 */}
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-text-secondary uppercase">
            연습 모드 · 무료 체험
          </p>
          <h1 className="text-2xl font-bold text-text leading-tight">
            {selectedEvent.title}
          </h1>
        </div>

        {/* 메인 그리드: 좌측(이미지) + 중앙(정보) + 우측(사이드바) */}
        <div className="grid grid-cols-[280px_1fr_320px] gap-8 mt-6 items-start">

          {/* ── 1. 좌측: 포스터 + 소셜 버튼 ── */}
          <div className="flex flex-col gap-4">
            {/* 포스터 */}
            <div
              className="relative w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: '3/4', background: selectedEvent.posterBg }}
              aria-label="공연 포스터"
            >
              <Image
                src={selectedEvent.posterImage}
                alt={selectedEvent.title}
                fill
                className="object-cover"
                sizes="280px"
                priority
              />
              <div
                className="absolute inset-x-0 bottom-0 h-2/3 z-10"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 20%, transparent)' }}
              />
              <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between">
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: selectedEvent.posterAccent }}>
                  Ticket Rush · Practice
                </p>
                <div>
                  <p className="text-white font-black text-base leading-tight drop-shadow">
                    {selectedEvent.title.replace('[연습] ', '')}
                  </p>
                  <p className="text-white/50 text-xs mt-2">{selectedEvent.venueName}</p>
                  <p className="text-white/30 text-[11px] mt-0.5">{selectedEvent.period}</p>
                </div>
              </div>
            </div>

            {/* 소셜 버튼 */}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm flex-1 gap-1.5"
                aria-label="찜하기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                찜하기
              </button>
              <button
                type="button"
                className="btn btn-neutral btn-sm flex-1 gap-1.5"
                aria-label="공유하기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                공유하기
              </button>
            </div>
          </div>

          {/* ── 2. 중앙: 공연 정보 테이블 ── */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {infoRows.map((row) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className="px-5 py-4 text-left align-top w-24 text-xs font-semibold text-text-secondary bg-bg-subtle whitespace-nowrap"
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-4 text-text leading-relaxed">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 3. 우측: sticky 사이드바 ── */}
          <div className="sticky top-6 space-y-4">

            {/* 캘린더 카드 */}
            <div className="card p-4">
              {/* 캘린더 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text transition-colors rounded"
                  aria-label="이전 달"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-text">2026.08</span>
                <button
                  type="button"
                  className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text transition-colors rounded"
                  aria-label="다음 달"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* 관람일 레이블 */}
              <p className="text-xs font-semibold text-text-secondary mb-2">관람일</p>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAY_LABELS.map((day, idx) => (
                  <div
                    key={day}
                    className={[
                      'text-center text-xs font-semibold py-1',
                      idx === 0 ? 'text-red-500' : 'text-text-secondary',
                    ].join(' ')}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="space-y-0.5">
                {calendarWeeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((day, di) => {
                      const isSelected = day === selectedDate;
                      const isSunday = di === 0;
                      const isSaturday = di === 6;
                      const isWeekend = isSunday || isSaturday;
                      const { startDay, endDay } = parseEventPeriod(selectedEvent.period);
                      const inPeriod = day !== null && day >= startDay && day <= endDay;
                      const isDisabled = !isWeekend || !inPeriod;
                      return (
                        <div key={di} className="flex items-center justify-center py-0.5">
                          {day !== null ? (
                            <button
                              type="button"
                              onClick={() => !isDisabled && setSelectedDate(day)}
                              disabled={isDisabled}
                              aria-label={`8월 ${day}일`}
                              aria-pressed={isSelected}
                              className={[
                                'w-7 h-7 text-xs font-medium rounded-full transition-colors flex items-center justify-center',
                                isDisabled
                                  ? 'text-text-tertiary cursor-not-allowed opacity-30'
                                  : isSelected
                                  ? 'bg-blue-600 text-white font-semibold'
                                  : isSunday
                                  ? 'text-red-500 hover:bg-bg-subtle'
                                  : 'text-text hover:bg-bg-subtle',
                              ].join(' ')}
                            >
                              {day}
                            </button>
                          ) : (
                            <span className="w-7 h-7" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 회차 선택 카드 */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-text-secondary">회차</p>
              <div className="flex gap-2">
                {selectedEvent.sessions.map((session, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSession(idx)}
                    aria-pressed={selectedSession === idx}
                    className={[
                      'btn btn-sm flex-1 transition-colors',
                      selectedSession === idx
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                        : 'btn-neutral',
                    ].join(' ')}
                  >
                    {session.label}
                  </button>
                ))}
              </div>

              {/* 좌석 현황 */}
              <div className="pt-1 border-t border-border">
                <p className="text-xs text-text-tertiary mb-1.5">좌석 현황</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                  {Object.entries(selectedEvent.venue.tiers).map(([tierId, tier], idx, arr) => (
                    <span key={tierId} className="flex items-center gap-x-3">
                      <span>
                        {tier.label}{' '}
                        <span className="font-semibold text-text">
                          {countSelectableSeatsByTier(selectedEvent, tierId)}
                        </span>
                      </span>
                      {idx < arr.length - 1 && (
                        <span className="text-border-strong">|</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 예매하기 + 시뮬레이션 버튼 */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBooking}
                disabled={bookingPending}
                className="w-full py-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {bookingPending ? '진입 중...' : '예매하기'}
              </button>
              <button
                type="button"
                onClick={handleBooking}
                disabled={bookingPending}
                className="w-full py-3 rounded-lg border border-blue-700 text-blue-700 hover:bg-blue-50 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {bookingPending ? '진입 중...' : 'BOOKING 시뮬레이션'}
              </button>
            </div>

          </div>
          {/* ── 우측 사이드바 끝 ── */}

        </div>
        {/* ── 메인 그리드 끝 ── */}

      </div>
    </div>

    {/* 대기 화면 오버레이 */}
    {showWaiting && selectedEvent && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-sm bg-bg-page rounded-2xl shadow-2xl p-8">

          {/* 상단 텍스트 */}
          <div className="mb-7">
            <p className="text-lg font-bold text-text">접속 인원이 많아 대기 중입니다.</p>
            <p className="text-xl font-bold text-primary mt-0.5">조금만 기다려주세요.</p>
            <p className="text-xs text-text-secondary mt-2">{selectedEvent.title}</p>
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
        {/* 팝업 창 */}
        <div
          className="flex flex-col rounded-xl overflow-hidden shadow-2xl border border-gray-300"
          style={{ width: '900px', height: '680px', background: '#fff' }}
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
              {selectedEvent.title} | NOL 티켓
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
              venue={selectedEvent.venue}
              meta={{
                eventTitle: selectedEvent.title,
                venueName: selectedEvent.venueName,
                date: `2026년 08월 ${String(selectedDate).padStart(2, '0')}일(토)`,
                time: selectedEvent.sessions[selectedSession].time,
              }}
              mode="practice"
              sessionId={sessionId ?? undefined}
              startedAt={sessionStartedAt ?? undefined}
              skipCaptcha={false}
              onBack={() => setShowPopup(false)}
              liveSeatLabels={selectedEvent.liveSeatLabels}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
