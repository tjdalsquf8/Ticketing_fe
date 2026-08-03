'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const INITIAL_QUEUE = 84_800;
const DRAIN_PER_TICK = 400;   // 매 초마다 줄어드는 대기 수

function WaitPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const date   = params.get('date') ?? '';
  const time   = params.get('time') ?? '';

  const [queuePos, setQueuePos] = useState(INITIAL_QUEUE);
  const [, setElapsed] = useState(0); // seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setQueuePos(prev => {
        const next = prev - DRAIN_PER_TICK;
        if (next <= 0) {
          clearInterval(timer);
          router.push(`/event/e001/book?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`);
          return 0;
        }
        return next;
      });
      setElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [date, time, router]);

  const progress = Math.max(0, Math.min(100, ((INITIAL_QUEUE - queuePos) / INITIAL_QUEUE) * 100));
  const estSec   = queuePos > 0 ? Math.ceil(queuePos / DRAIN_PER_TICK) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#F3F4F6' }}>
      {/* 상단 텍스트 */}
      <div className="mb-6 text-center">
        <p className="text-lg font-bold text-[#111827]">접속 인원이 많아 대기 중입니다.</p>
        <p className="text-2xl font-bold mt-1" style={{ color: '#2563EB' }}>조금만 기다려주세요.</p>
        <p className="text-sm text-[#9CA3AF] mt-2">싸이홈빽쇼 SUMMERSWAG2026 - 수원</p>
      </div>

      {/* 대기 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] w-full max-w-md px-8 py-8">
        <p className="text-sm text-[#6B7280] text-center mb-3">나의 대기순서</p>
        <p className="text-5xl font-black text-center text-[#111827] tracking-tight mb-6">
          {queuePos.toLocaleString('ko-KR')}
        </p>

        {/* 프로그레스 바 */}
        <div className="w-full h-3 bg-[#E5E7EB] rounded-full overflow-hidden mb-6">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress}%`, backgroundColor: '#2563EB' }}
          />
        </div>

        {/* 하단 통계 */}
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-[#6B7280]">예상 대기시간</p>
            <p className="font-bold mt-0.5" style={{ color: '#2563EB' }}>
              {estSec}초
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#6B7280]">상태</p>
            <p className="font-bold mt-0.5" style={{ color: '#2563EB' }}>대기 중</p>
          </div>
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="mt-6 space-y-1 text-sm text-[#6B7280]">
        <p>· 잠시만 기다려주시면, 예매하기 페이지로 연결됩니다.</p>
        <p>· 새로고침 하거나 재접속 하시면 대기순서가 초기화 되어 대기시간이 더 길어집니다.</p>
      </div>
    </div>
  );
}

export default function WaitPage() {
  return (
    <Suspense>
      <WaitPageInner />
    </Suspense>
  );
}
