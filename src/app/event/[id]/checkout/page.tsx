import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '유료 이벤트 참여 확인' };

/* ──────────────────────────────────────────
   /event/[id]/checkout — 유료 이벤트 참여 확인
   ─ 참여비 500P (또는 티켓 N매) 차감 확인
   ─ 잔액 부족 시 충전 유도
   ────────────────────────────────────────── */

// 정적 mock — 실제로는 GET /events/:id
const EVENT = {
  id: 'p001',
  title: '아이유 The Golden Hour 앙코르',
  category: '콘서트',
  venue: '고척스카이돔',
  opensAt: '2026.08.15 20:00',
  entryFeePoints: 500,
  entryFeeTickets: 5, // 티켓 5매로도 참여 가능 (환산율 TBD)
};

const WALLET = {
  points: 3_000,
  tickets: 12,
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canAffordPoints = WALLET.points >= EVENT.entryFeePoints;
  const canAffordTickets = WALLET.tickets >= EVENT.entryFeeTickets;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-6">

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-text">참여 확인</h1>
        <p className="text-sm text-text-secondary">
          아래 내용으로 유료 이벤트에 참여합니다.
        </p>
      </header>

      {/* 이벤트 요약 */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="badge badge-info">{EVENT.category}</span>
          <span className="text-xs text-text-tertiary font-mono-tabular">#{id}</span>
        </div>
        <h2 className="text-lg font-bold text-text leading-tight">{EVENT.title}</h2>
        <div className="space-y-1 text-sm">
          <div className="flex gap-4">
            <span className="w-20 shrink-0 text-text-tertiary">공연장</span>
            <span className="text-text">{EVENT.venue}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-20 shrink-0 text-text-tertiary">오픈</span>
            <span className="text-text font-mono-tabular">{EVENT.opensAt}</span>
          </div>
        </div>
      </section>

      {/* 참여 방식 선택 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text">참여 방식 선택</h2>

        {/* 포인트 */}
        <label className={[
          'card p-4 flex items-start gap-3 cursor-pointer transition-colors',
          canAffordPoints ? 'hover:border-primary' : 'opacity-60 cursor-not-allowed',
        ].join(' ')}>
          <input
            type="radio"
            name="method"
            value="point"
            defaultChecked={canAffordPoints}
            disabled={!canAffordPoints}
            className="mt-1 accent-primary"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-text">포인트로 참여</span>
              <span className="font-mono-tabular font-bold text-text">−{EVENT.entryFeePoints.toLocaleString()}P</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              보유 <strong className="text-text font-mono-tabular">{WALLET.points.toLocaleString()}P</strong>
              {!canAffordPoints && <span className="text-danger-text ml-1">· 잔액 부족</span>}
            </p>
          </div>
        </label>

        {/* 티켓 */}
        <label className={[
          'card p-4 flex items-start gap-3 cursor-pointer transition-colors',
          canAffordTickets ? 'hover:border-primary' : 'opacity-60 cursor-not-allowed',
        ].join(' ')}>
          <input
            type="radio"
            name="method"
            value="ticket"
            disabled={!canAffordTickets}
            className="mt-1 accent-primary"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-text">티켓으로 참여</span>
              <span className="font-mono-tabular font-bold text-text">−{EVENT.entryFeeTickets}티켓</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              보유 <strong className="text-text font-mono-tabular">{WALLET.tickets}매</strong>
              {!canAffordTickets && <span className="text-danger-text ml-1">· 티켓 부족</span>}
            </p>
          </div>
        </label>
      </section>

      {/* 안내 */}
      <div className="rounded-lg border border-info-border bg-info-bg px-4 py-3">
        <p className="text-xs text-info-text">
          참여비는 이벤트 오픈 전까지 <strong>취소 시 전액 환불</strong>됩니다.
          오픈 후에는 환불되지 않습니다.
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Link href={`/event/${id}`} className="btn btn-neutral flex-1">
          취소
        </Link>
        <button
          type="button"
          disabled={!canAffordPoints && !canAffordTickets}
          className="btn btn-solid flex-1"
        >
          참여 확정
        </button>
      </div>

      {!canAffordPoints && !canAffordTickets && (
        <div className="card p-4 text-center space-y-2">
          <p className="text-sm text-text-secondary">참여할 재화가 부족합니다.</p>
          <Link href="/my/points" className="btn btn-outline btn-sm">
            포인트 충전하기
          </Link>
        </div>
      )}

    </div>
  );
}
