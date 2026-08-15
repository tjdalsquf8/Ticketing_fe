'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMockEvent, getEventClosesAt, EVENT_DURATION_MS } from '@/data/mockEvents';

/* ──────────────────────────────────────────
   /event/[id]/wait — 대기실
   ─ opens_at 도달 → book 자동 이동
   ─ opens_at + 5min 도달 → result 자동 이동
   ─ (이미 open 상태로 진입 시: book으로 즉시 이동)
   ─ (이미 closed 상태로 진입 시: result로 즉시 이동)
   ────────────────────────────────────────── */

const INITIAL_WAITING = 87;

export default function WaitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const event = getMockEvent(id);

  // opens_at은 최초 마운트 시점에 한번만 계산 (렌더링마다 재계산되면 카운트다운이 리셋됨)
  const opensAt = useMemo(() => event.opensAtFn(), [event]);
  const closesAt = useMemo(() => getEventClosesAt(opensAt), [opensAt]);

  const [now, setNow] = useState<number>(() => Date.now());
  const [waitingCount, setWaitingCount] = useState<number>(INITIAL_WAITING);

  // 실시간 시각 갱신 (1초 tick)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 대기 인원 mock: 오픈 전까지 부드럽게 증가
  useEffect(() => {
    const id = setInterval(() => {
      setWaitingCount((c) => c + Math.floor(Math.random() * 3));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // 라이프사이클 전이 감지
  const opensAtMs = opensAt.getTime();
  const closesAtMs = closesAt.getTime();

  useEffect(() => {
    if (now >= closesAtMs) {
      router.replace(`/event/${id}/result`);
      return;
    }
    if (now >= opensAtMs) {
      router.replace(`/event/${id}/book`);
    }
  }, [now, opensAtMs, closesAtMs, id, router]);

  // 카운트다운 계산
  const remainMs = Math.max(0, opensAtMs - now);
  const totalSec = Math.ceil(remainMs / 1000);
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');

  const isImminent = remainMs > 0 && remainMs <= 5 * 60 * 1000;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-bg-subtle flex flex-col items-center justify-center px-4 py-10">

      <div className="max-w-md w-full space-y-6">

        {/* 이벤트 요약 */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-primary tracking-wide">{event.category}</p>
          <h1 className="text-lg font-bold text-text">{event.title}</h1>
          <p className="text-xs text-text-secondary">{event.venue}</p>
        </div>

        {/* 카운트다운 카드 */}
        <div className="card p-8 space-y-6">
          <div className="text-center">
            <p className="text-xs text-text-secondary mb-1">오픈까지</p>
            {isImminent && (
              <p className="text-[11px] font-bold text-danger-text tracking-wide">
                곧 오픈됩니다
              </p>
            )}
          </div>

          {/* 시:분:초 */}
          <div className="flex items-end gap-1 justify-center">
            {[
              { val: hh, unit: '시간' },
              { val: mm, unit: '분'   },
              { val: ss, unit: '초'   },
            ].map(({ val, unit }, i) => (
              <div key={i} className="flex items-end gap-1">
                {i > 0 && <span className="text-3xl font-light text-text-tertiary mb-1">:</span>}
                <div className="text-center min-w-[3.5rem]">
                  <span className={[
                    'font-mono-tabular text-5xl font-bold tracking-tight',
                    isImminent ? 'text-primary' : 'text-text',
                  ].join(' ')}>{val}</span>
                  <p className="text-xs text-text-tertiary mt-1">{unit}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 대기 인원 */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">대기 중</span>
              <span className="font-mono-tabular">
                <strong className="text-text">{waitingCount.toLocaleString()}</strong>
                <span className="text-text-tertiary text-xs ml-1">명</span>
              </span>
            </div>
          </div>
        </div>

        {/* 안내 */}
        <div className="rounded-lg border border-info-border bg-info-bg px-4 py-3 space-y-1">
          <p className="text-xs text-info-text">
            · 오픈 시각이 되면 자동으로 좌석 선택 화면으로 이동합니다.
          </p>
          <p className="text-xs text-info-text">
            · 새로고침·재접속해도 대기 순서는 영향받지 않습니다 (선착순은 좌석 클릭 시각 기준).
          </p>
          <p className="text-xs text-info-text">
            · 이벤트는 오픈 후 <strong>5분간</strong> 진행 후 자동 종료됩니다.
          </p>
        </div>

        {/* 취소 */}
        <div className="text-center">
          <Link href={`/event/${id}`} className="text-xs text-text-tertiary hover:text-text-secondary underline underline-offset-2">
            이벤트 상세로 돌아가기
          </Link>
        </div>

      </div>
    </div>
  );
}
