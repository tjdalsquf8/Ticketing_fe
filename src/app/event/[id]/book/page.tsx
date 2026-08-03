'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import BookingFlow from '@/components/booking/BookingFlow';
import { CONCERT_HALL } from '@/data/concertHall';

/* ──────────────────────────────────────────
   실전 예매 — 좌석 선택 플로우
   ?date=…&time=… 쿼리 파라미터로 메타 수신
   ────────────────────────────────────────── */

function BookPageInner() {
  const params = useSearchParams();
  const date   = params.get('date') ?? '2026년 08월 01일(토)';
  const time   = params.get('time') ?? '18시 00분';

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <BookingFlow
        venue={CONCERT_HALL}
        meta={{
          eventTitle: '스타벅스 아메리카노 이벤트',
          venueName:  CONCERT_HALL.name,
          date,
          time,
        }}
        mode="live"
        skipCaptcha          // 이미 event detail 에서 CAPTCHA 완료
        resultPath="/event/e001/result"
      />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <BookPageInner />
    </Suspense>
  );
}
