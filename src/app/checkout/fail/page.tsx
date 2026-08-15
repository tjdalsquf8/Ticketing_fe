import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '결제 실패' };

/* ──────────────────────────────────────────
   /checkout/fail — PG 결제 실패 콜백 페이지
   ─ 뼈대: 실제로는 쿼리스트링 error_code, error_message 등을 표시
   ────────────────────────────────────────── */

const ERROR_MESSAGE = '결제가 취소되었거나 승인이 거절되었습니다.';

export default function CheckoutFailPage() {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center space-y-8">

      <div className="mx-auto w-16 h-16 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-danger-text" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text">결제에 실패했습니다</h1>
        <p className="text-sm text-text-secondary">{ERROR_MESSAGE}</p>
      </div>

      <div className="rounded-lg border border-info-border bg-info-bg px-4 py-3 text-left">
        <p className="text-xs text-info-text">
          카드사·결제 앱 문제일 수 있습니다. 잠시 후 다시 시도하거나 다른 결제수단을 이용해 주세요.
        </p>
      </div>

      <div className="flex gap-2">
        <Link href="/" className="btn btn-neutral flex-1">
          홈으로
        </Link>
        <Link href="/my/points" className="btn btn-solid flex-1">
          다시 시도
        </Link>
      </div>
    </div>
  );
}
