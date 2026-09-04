'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

/* ──────────────────────────────────────────
   EventRegistrationModal
   ─ 유료 이벤트 참여 신청 확인 (보유 티켓 사용)
   ────────────────────────────────────────── */

interface Props {
  open: boolean;
  eventTitle: string;
  entryFeeTickets: number;
  currentTickets: number;
  pending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function EventRegistrationModal({
  open,
  eventTitle,
  entryFeeTickets,
  currentTickets,
  pending = false,
  errorMessage = null,
  onConfirm,
  onClose,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const chargeRef = useRef<HTMLAnchorElement>(null);

  const insufficient = currentTickets < entryFeeTickets;
  const remaining = currentTickets - entryFeeTickets;

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

  // 첫 렌더 시 focus — 잔액 부족이면 충전 버튼, 아니면 확인 버튼
  useEffect(() => {
    if (!open) return;
    if (insufficient) {
      chargeRef.current?.focus();
    } else {
      confirmRef.current?.focus();
    }
  }, [open, insufficient]);

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
            티켓 사용
          </p>
          <h3 className="mt-1 text-lg font-bold text-text">참여 신청 확인</h3>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4 text-sm">
          {/* 이벤트 정보 */}
          <div>
            <p className="text-xs text-text-tertiary">이벤트</p>
            <p className="mt-1 text-base font-bold text-text leading-snug">
              {eventTitle}
            </p>
          </div>

          {/* 참여비 하이라이트 */}
          <div className="rounded-xl border border-primary-border bg-primary-subtle p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-text">참여비</span>
            <span className="text-2xl font-black font-mono-tabular text-primary">
              -{entryFeeTickets.toLocaleString()}매
            </span>
          </div>

          {/* 잔여 티켓 변동 */}
          <div className="rounded-lg border border-border bg-bg-subtle p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-tertiary text-xs">보유 티켓</span>
              <span className="font-mono-tabular text-text">
                {currentTickets.toLocaleString()}매
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-tertiary text-xs">신청 후 잔여 티켓</span>
              <span
                className={[
                  'font-mono-tabular font-semibold',
                  insufficient ? 'text-danger-text' : 'text-text',
                ].join(' ')}
              >
                {remaining.toLocaleString()}매
              </span>
            </div>
          </div>

          {/* 잔여 티켓 부족 경고 */}
          {insufficient && (
            <div
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-bg p-3 space-y-2"
            >
              <p className="text-sm font-semibold text-danger-text">
                보유 티켓이 부족합니다
              </p>
              <p className="text-xs text-danger-text/80">
                참여비 {entryFeeTickets.toLocaleString()}매를 내려면 실시간 티켓팅에 참여해 티켓을 모아주세요.
              </p>
              <Link
                ref={chargeRef}
                href="/live"
                className="btn btn-outline btn-sm w-full mt-1"
                onClick={onClose}
              >
                실시간 티켓팅 참여하러 가기
              </Link>
            </div>
          )}

          {/* 인라인 에러 */}
          {errorMessage && !insufficient && (
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
            disabled={insufficient || pending}
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
              `${entryFeeTickets.toLocaleString()}매 사용하고 신청`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
