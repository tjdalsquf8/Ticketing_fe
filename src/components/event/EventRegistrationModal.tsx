'use client';

import { useEffect, useRef } from 'react';

/* ──────────────────────────────────────────
   EventRegistrationModal
   ─ 이벤트 참여 신청 확인 (로그인 필수, 무료)
   ────────────────────────────────────────── */

interface Props {
  open: boolean;
  eventTitle: string;
  pending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function EventRegistrationModal({
  open,
  eventTitle,
  pending = false,
  errorMessage = null,
  onConfirm,
  onClose,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // ESC 닫기 + body 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending, onClose]);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 erm-backdrop"
      onClick={pending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="참여 신청 확인"
    >
      <style>{`
        @keyframes ermBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ermCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .erm-backdrop { animation: ermBackdropIn 150ms ease-out both; }
        .erm-card     { animation: ermCardIn 200ms ease-out both; }
      `}</style>
      <div
        className="w-full max-w-md bg-bg-surface rounded-2xl border border-border shadow-lg erm-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold text-primary tracking-wider uppercase">
            참여 신청
          </p>
          <h3 className="mt-1 text-lg font-bold text-text">참여 신청 확인</h3>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4 text-sm">
          <div>
            <p className="text-xs text-text-tertiary">이벤트</p>
            <p className="mt-1 text-base font-bold text-text leading-snug">
              {eventTitle}
            </p>
          </div>

          <p className="text-sm text-text-secondary">
            무료로 신청됩니다. 신청 후에는 오픈 시각에 맞춰 티켓팅에 참여할 수 있어요.
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-md px-3 py-2"
            >
              {errorMessage}
            </p>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-5 pt-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-neutral flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="btn btn-solid flex-1 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {pending ? (
              <svg
                role="status"
                aria-label="처리 중"
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 animate-spin"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="4"
                />
                <path
                  d="M22 12a10 10 0 0 0-10-10"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              '참여 신청'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
