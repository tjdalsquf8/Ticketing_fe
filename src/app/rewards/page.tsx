import type { Metadata } from 'next';

export const metadata: Metadata = { title: '리워드 스토어' };

/* ──────────────────────────────────────────
   리워드 스토어 — 티켓 교환 가능 상품 목록
   ────────────────────────────────────────── */

const MY_TICKETS = 0;

export default function RewardsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">리워드 스토어</h1>
          <p className="mt-1 text-sm text-text-secondary">
            모은 티켓으로 기프티콘을 교환하세요.
          </p>
        </div>
        {/* 내 티켓 수 */}
        <div className="card px-4 py-3 text-center shrink-0">
          <p className="text-xs text-text-secondary">보유 티켓</p>
          <p className="text-2xl font-bold font-mono-tabular text-text mt-0.5">
            {MY_TICKETS}<span className="text-sm font-normal text-text-secondary ml-1">매</span>
          </p>
        </div>
      </div>

      {/* 월간 교환 한도 안내 */}
      <div className="rounded-lg border border-info-border bg-info-bg px-4 py-3">
        <p className="text-sm text-info-text">
          <strong>월간 교환 한도 안내</strong> — 리워드별로 월 교환 가능 수량이 정해져 있습니다.
          소진 시 다음 달 1일 자정에 초기화됩니다.
        </p>
      </div>

      {/* 상품 목록 */}
      <section>
        <div className="card p-6 text-center text-sm text-text-secondary">
          준비 중인 리워드가 없습니다.
        </div>
      </section>

      {/* 교환 방법 안내 */}
      <section className="card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-text">교환 방법</h2>
        <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
          <li>실전 이벤트 선착순 성공 시 티켓 1매가 자동 발급됩니다.</li>
          <li>티켓 누적 매수가 교환 기준에 도달하면 교환 버튼이 활성화됩니다.</li>
          <li>교환 완료 시 티켓이 차감되고, 기프티콘 코드가 마이페이지에 등록됩니다.</li>
          <li>월간 한도 소진 시 다음 달 1일부터 다시 교환 가능합니다.</li>
        </ol>
      </section>

    </div>
  );
}
