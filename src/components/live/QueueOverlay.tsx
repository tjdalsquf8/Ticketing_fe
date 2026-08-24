'use client';

import { useEffect } from 'react';
import type { LiveQueueState } from '@/lib/live';
import { ApiError } from '@/lib/errors';

/* ─────────────────────────────────────────────────────────
   QueueOverlay — 라이브 세션 대기열 오버레이
   ─ POST /sessions 응답을 initialState 로 받아 즉시 표시
   ─ 이후 useLiveQueue 훅이 1초 폴링으로 갱신
   ─ ready === true 로 승격되면 호출부가 언마운트
   ───────────────────────────────────────────────────────── */

interface Props {
  sessionId: string;
  roundTitle: string;
  queueState: LiveQueueState | null;
  error: ApiError | null;
  onCancel?: () => void;
}

function errorHeadline(error: ApiError): string {
  if (error.code === 'SESSION_NOT_FOUND')
    return '세션이 만료됐어요. 다시 시도해 주세요.';
  if (error.code === 'FORBIDDEN') return '본인 세션이 아닙니다.';
  return error.message;
}

export default function QueueOverlay({
  sessionId,
  roundTitle,
  queueState,
  error,
  onCancel,
}: Props) {
  // ESC 로 취소
  useEffect(() => {
    if (!onCancel) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const isError = error !== null;
  const isReady =
    !isError &&
    (queueState?.ready === true || queueState?.status === 'active');
  const queuePosition = queueState?.queuePosition ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="queue-overlay-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    >
      <div className="card w-full max-w-md p-8 text-center space-y-6">
        {/* 회차 정보 헤더 */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="badge badge-primary">대기 중</span>
            {/* sessionId 는 디버깅용으로만 노출. 프로덕션에서 표시하면
                실시간 방송·화면 공유 시 옆 사람에게 세션 흔적이 새어나감. */}
            {process.env.NODE_ENV !== 'production' && (
              <span className="text-xs text-text-tertiary font-mono-tabular">
                #{sessionId.slice(0, 8)}
              </span>
            )}
          </div>
          <h2
            id="queue-overlay-title"
            className="text-lg font-bold text-text leading-tight"
          >
            {roundTitle}
          </h2>
        </div>

        {/* 본문 */}
        {isError && error && (
          <div className="space-y-3 py-4">
            <p className="text-sm font-semibold text-danger-text">
              {errorHeadline(error)}
            </p>
            <p className="text-xs text-text-secondary">
              오류 코드: <span className="font-mono-tabular">{error.code}</span>
            </p>
          </div>
        )}

        {!isError && isReady && (
          <div className="space-y-2 py-6">
            <p className="text-2xl font-bold text-primary">입장 준비 완료</p>
            <p className="text-sm text-text-secondary">잠시만 기다려 주세요…</p>
          </div>
        )}

        {!isError && !isReady && (
          <div className="space-y-3 py-4">
            <p className="text-xs font-semibold text-text-tertiary tracking-widest uppercase">
              내 순번
            </p>
            <p className="font-mono-tabular text-6xl font-bold text-primary leading-none">
              {queuePosition !== null ? queuePosition.toLocaleString() : '—'}
              {queuePosition !== null && (
                <span className="text-2xl font-semibold text-text-secondary ml-1">
                  번째
                </span>
              )}
            </p>
            <p className="text-sm text-text-secondary pt-2">
              잠시만 기다려 주세요.
              <br />
              순번이 되면 자동으로 입장합니다.
            </p>
          </div>
        )}

        {/* 취소 / 닫기 */}
        {onCancel && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-neutral w-full"
            >
              {isError ? '닫기' : '취소'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
