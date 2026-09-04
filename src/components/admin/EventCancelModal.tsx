'use client';

import { useEffect, useRef, useState } from 'react';

/* ──────────────────────────────────────────
   EventCancelModal
   ─ 관리자 이벤트 취소·환불 확인 모달
   ─ 사유 필수 입력 (BE POST /admin/events/:id/cancel body.reason)
   ─ pending 신청자 전원 자동 환불 안내
   ────────────────────────────────────────── */

interface Props {
  open: boolean;
  eventTitle: string;
  registeredCount: number;
  entryFeePoints: number;
  pending?: boolean;
  errorMessage?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// BE 스펙: reason 최대 500자.
const REASON_MIN = 2;
const REASON_MAX = 500;

export default function EventCancelModal({
  open,
  eventTitle,
  registeredCount,
  entryFeePoints,
  pending = false,
  errorMessage = null,
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < REASON_MIN;
  const refundTotal = registeredCount * entryFeePoints;

  useEffect(() => {
    if (!open) {
      setReason('');
      return;
    }
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
    textareaRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function handleSubmit() {
    if (tooShort || pending) return;
    onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 ecm-backdrop"
      onClick={pending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="이벤트 취소 확인"
    >
      <style>{`
        @keyframes ecmBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ecmCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ecm-backdrop { animation: ecmBackdropIn 150ms ease-out both; }
        .ecm-card { animation: ecmCardIn 200ms ease-out both; }
      `}</style>
      <div
        className="w-full max-w-md bg-bg-surface rounded-2xl border border-border shadow-lg ecm-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold text-danger-text tracking-wider uppercase">
            취소·전원 환불
          </p>
          <h3 className="mt-1 text-lg font-bold text-text">이벤트 취소 확인</h3>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4 text-sm">
          <div>
            <p className="text-xs text-text-tertiary">이벤트</p>
            <p className="mt-1 text-base font-bold text-text leading-snug">
              {eventTitle}
            </p>
          </div>

          {/* 환불 요약 */}
          <div className="rounded-xl border border-danger-border bg-danger-bg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-danger-text">
                환불 대상 신청자
              </span>
              <span className="font-mono-tabular font-bold text-danger-text">
                {registeredCount.toLocaleString()}명
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-danger-text/80">
                자동 환불 합계
              </span>
              <span className="font-mono-tabular text-danger-text">
                {refundTotal.toLocaleString()}P
              </span>
            </div>
            {registeredCount > 0 && (
              <p className="text-[11px] text-danger-text/80 pt-1 border-t border-danger-border">
                확인 즉시 pending 신청자 전원 포인트 자동 환불됩니다.
              </p>
            )}
          </div>

          {/* 사유 입력 */}
          <div className="space-y-1.5">
            <label htmlFor="cancel-reason" className="block">
              <span className="flex items-baseline gap-2 text-xs font-semibold text-text-secondary">
                <span>
                  취소 사유 <span className="text-danger-text">*</span>
                </span>
                <span className="text-[11px] font-normal text-text-tertiary">
                  — 신청자 통보·감사 로그에 기록
                </span>
              </span>
            </label>
            <textarea
              id="cancel-reason"
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 공연 취소로 인한 이벤트 중단"
              rows={3}
              maxLength={REASON_MAX}
              disabled={pending}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-50"
            />
            <div className="flex justify-between text-[11px] text-text-tertiary font-mono-tabular">
              <span>
                {tooShort ? `최소 ${REASON_MIN}자 이상` : '\u00A0'}
              </span>
              <span>
                {trimmed.length} / {REASON_MAX}
              </span>
            </div>
          </div>

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
            돌아가기
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={tooShort || pending}
            className="btn btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
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
              '이벤트 취소·환불'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
