'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import BookingFlow from '@/components/booking/BookingFlow';
import { CONCERT_HALL } from '@/data/practice/concertHall';
import { getLiveEvent } from '@/data/live';
import {
  getMockEvent,
  getEventStatus,
  getEventClosesAt,
} from '@/data/mockEvents';

/* ──────────────────────────────────────────
   /event/[id]/book — 좌석 선택 · 예매 실전
   ─ 5분 종료 타이머 오버레이 (30초 이내 강조)
   ─ scheduled → wait 리다이렉트, closed → result 리다이렉트
   ────────────────────────────────────────── */

export default function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // 라이브 이벤트 카탈로그에 있으면 실제 공연장 배치(venue) 사용, 없으면 mockEvents fallback.
  const liveEvent = getLiveEvent(id);
  const mockEvent = getMockEvent(id);
  const eventTitle = liveEvent?.title ?? mockEvent.title;
  const eventVenueName = liveEvent?.venueName ?? mockEvent.venue;
  const venue = liveEvent?.venue ?? CONCERT_HALL;
  const opensAtFn = liveEvent?.opensAtFn ?? mockEvent.opensAtFn;

  const opensAt = useMemo(() => opensAtFn(), [opensAtFn]);
  const closesAt = useMemo(() => getEventClosesAt(opensAt), [opensAt]);

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // 라이프사이클 가드 (오픈 전이면 wait, 종료 후면 result)
  useEffect(() => {
    const status = getEventStatus(opensAt, new Date(now));
    if (status === 'scheduled') {
      router.replace(`/event/${id}/wait`);
    } else if (status === 'closed') {
      router.replace(`/event/${id}/result`);
    }
  }, [now, opensAt, id, router]);

  // 종료까지 남은 시간
  const remainMs = Math.max(0, closesAt.getTime() - now);
  const totalSec = Math.ceil(remainMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const isUrgent = remainMs > 0 && remainMs <= 30_000;

  // 오픈 날짜/시각 표시용 포맷
  const dateStr = opensAt.toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const timeStr = opensAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return (
    <div className="flex flex-col relative" style={{ minHeight: 'calc(100vh - 56px)' }}>

      {/* 종료까지 타이머 (오른쪽 상단 고정) */}
      <div
        className={[
          'fixed top-16 right-4 z-40 card px-4 py-2.5 shadow-md flex items-baseline gap-2',
          isUrgent ? 'border-danger-border bg-danger-bg' : '',
        ].join(' ')}
      >
        <p className={[
          'text-[10px] font-semibold tracking-wide',
          isUrgent ? 'text-danger-text' : 'text-text-tertiary',
        ].join(' ')}>
          종료까지
        </p>
        <p className={[
          'font-mono-tabular text-lg font-bold tracking-tight',
          isUrgent ? 'text-danger-text' : 'text-text',
        ].join(' ')}>
          {mm}:{ss}
        </p>
      </div>

      <BookingFlow
        venue={venue}
        meta={{
          eventTitle,
          venueName:  eventVenueName,
          date:       dateStr,
          time:       timeStr,
        }}
        mode="live"
        skipCaptcha
        resultPath={`/event/${id}/result`}
      />
    </div>
  );
}
