'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { getEvent, type EventDetail } from '@/lib/events';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   /event/[id]/result — 이벤트 결과
   ─ book 페이지의 confirm 성공 후 이동. 쿼리:
     ?seat=<label>&rank=<n>&elapsed=<ms>
   ────────────────────────────────────────── */

function formatMs(ms: number) {
  return (ms / 1000).toFixed(3) + 's';
}

export default function EventResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const sp = useSearchParams();

  const seatLabel = sp.get('seat');
  const rankRaw = sp.get('rank');
  const elapsedRaw = sp.get('elapsed');

  const rank = rankRaw ? Number(rankRaw) : null;
  const elapsedMs = elapsedRaw ? Number(elapsedRaw) : null;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEvent(id).then(setEvent).catch((e: unknown) => {
      if (e instanceof ApiError && e.code === 'EVENT_NOT_FOUND') return;
      setError(e instanceof Error ? e.message : '이벤트를 불러올 수 없습니다.');
    });
  }, [id]);

  const hasResult = seatLabel !== null && rank !== null && elapsedMs !== null;

  // 이벤트 종료 후 URL 직접 접근 등 결과 데이터가 없는 케이스
  if (!hasResult) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <div className="card p-8 text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-text">결과가 없습니다</h1>
            <p className="text-sm text-text-secondary">
              이벤트에 참여했다면 마이페이지에서 신청 내역을 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Link href="/my" className="btn btn-outline">
              마이페이지
            </Link>
            <Link href="/event" className="btn btn-solid">
              이벤트 목록
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* 헤더 */}
      <header className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center border bg-success-bg border-success-border">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success-text"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text">예매에 성공했어요</h1>
          {event && (
            <p className="text-sm text-text-secondary">
              {event.category} · {event.title}
            </p>
          )}
        </div>
      </header>

      {/* 내 성적 */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-tertiary">내 순위</p>
            <p className="mt-1 font-mono-tabular">
              <strong className="text-3xl text-text">{rank}</strong>
              <span className="text-sm text-text-secondary ml-1">위</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">소요 시간</p>
            <p className="mt-1 font-mono-tabular font-bold text-3xl text-primary">
              {formatMs(elapsedMs!)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-text-tertiary">좌석</p>
            <p className="mt-1 font-mono-tabular font-semibold text-text">
              {seatLabel}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-text-tertiary text-center">
          이벤트 상세를 불러오지 못했습니다: {error}
        </p>
      )}

      {/* 액션 */}
      <div className="flex gap-2">
        <Link href="/ranking" className="btn btn-neutral flex-1">
          리더보드
        </Link>
        <Link href="/event" className="btn btn-solid flex-1">
          다음 이벤트
        </Link>
      </div>
    </div>
  );
}
