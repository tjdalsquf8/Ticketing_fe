import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '결제 완료' };

/* ──────────────────────────────────────────
   /checkout/success — PG 결제 성공 콜백 페이지
   ─ 뼈대: 실제로는 쿼리스트링 pg_tx_id 등을 받아 백엔드 확인
   ────────────────────────────────────────── */

const CHARGED = 10_000;
const NEW_BALANCE = 13_000;

export default function CheckoutSuccessPage() {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center space-y-8">

      <div className="mx-auto w-16 h-16 rounded-full bg-success-bg border border-success-border flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success-text" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text">결제가 완료되었습니다</h1>
        <p className="text-sm text-text-secondary">포인트가 즉시 반영되었습니다.</p>
      </div>

      <div className="card p-6 space-y-3 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">충전 금액</span>
          <span className="font-mono-tabular font-semibold text-text">+{CHARGED.toLocaleString()}P</span>
        </div>
        <div className="flex justify-between text-sm pt-3 border-t border-border">
          <span className="text-text-secondary">현재 잔액</span>
          <span className="font-mono-tabular font-bold text-text text-lg">{NEW_BALANCE.toLocaleString()}P</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link href="/my/points" className="btn btn-neutral flex-1">
          충전 내역
        </Link>
        <Link href="/event" className="btn btn-solid flex-1">
          이벤트 보러가기
        </Link>
      </div>
    </div>
  );
}
