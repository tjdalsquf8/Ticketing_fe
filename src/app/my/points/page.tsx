import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '포인트 충전' };

/* ──────────────────────────────────────────
   /my/points — 포인트 충전 · 잔액 · 사용 내역
   ─ 충전 단위 1,000원 (프리셋 + 직접 입력)
   ─ PG 연동 전까지 뼈대만
   ────────────────────────────────────────── */

const BALANCE = 3_000;

const PRESETS = [5_000, 10_000, 30_000, 50_000];

type TxnReason = 'charge' | 'event_entry' | 'refund';

const REASON_LABEL: Record<TxnReason, string> = {
  charge: '충전',
  event_entry: '이벤트 참여',
  refund: '환불',
};

const TRANSACTIONS: {
  id: string;
  date: string;
  reason: TxnReason;
  delta: number;
  memo?: string;
}[] = [
  { id: 't003', date: '2026.08.09 20:14', reason: 'charge',       delta:  5_000, memo: '토스페이 충전' },
  { id: 't002', date: '2026.08.08 21:00', reason: 'event_entry',  delta:   -500, memo: '아이유 앙코르 참여' },
  { id: 't001', date: '2026.08.05 18:30', reason: 'charge',       delta:  5_000, memo: '토스페이 충전' },
];

export default function PointsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-text">포인트 충전</h1>
        <p className="text-sm text-text-secondary">유료 이벤트 참여비로 사용됩니다.</p>
      </header>

      {/* 잔액 카드 */}
      <div className="card p-6 sm:p-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-text-secondary">보유 포인트</p>
          <p className="mt-1 font-mono-tabular">
            <strong className="text-3xl sm:text-4xl text-text">{BALANCE.toLocaleString()}</strong>
            <span className="text-lg text-text-secondary ml-1">P</span>
          </p>
        </div>
        <Link href="#recharge" className="btn btn-solid btn-lg shrink-0">
          충전하기
        </Link>
      </div>

      {/* 충전 프리셋 */}
      <section id="recharge" className="space-y-4">
        <h2 className="text-sm font-semibold text-text">충전 금액 선택</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESETS.map((amt) => (
            <button
              key={amt}
              type="button"
              className="card p-4 text-center hover:border-primary transition-colors"
            >
              <p className="text-lg font-bold text-text font-mono-tabular">
                {amt.toLocaleString()}
                <span className="text-xs text-text-secondary ml-0.5">원</span>
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5 font-mono-tabular">
                +{amt.toLocaleString()}P
              </p>
            </button>
          ))}
        </div>

        {/* 직접 입력 */}
        <div className="card p-5 space-y-3">
          <label className="text-xs font-semibold text-text-secondary">직접 입력 (1,000원 단위)</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 20,000"
              className="flex-1 px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="button" className="btn btn-solid shrink-0">
              결제하기
            </button>
          </div>
          <p className="text-[11px] text-text-tertiary">
            최소 1,000원부터 1,000원 단위로 충전 가능합니다.
          </p>
        </div>
      </section>

      {/* 사용 내역 */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">최근 내역</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">일시</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">구분</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">메모</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">변동</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TRANSACTIONS.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-secondary">
                    아직 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                TRANSACTIONS.map((t) => {
                  const positive = t.delta > 0;
                  return (
                    <tr key={t.id} className="hover:bg-bg-subtle transition-colors">
                      <td className="px-4 py-3 text-xs text-text-secondary font-mono-tabular whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-3 text-sm text-text">{REASON_LABEL[t.reason]}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary truncate">{t.memo}</td>
                      <td className={[
                        'px-4 py-3 text-right font-mono-tabular font-bold whitespace-nowrap',
                        positive ? 'text-success-text' : 'text-text',
                      ].join(' ')}>
                        {positive ? '+' : ''}{t.delta.toLocaleString()}P
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
