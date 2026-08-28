'use client';

import { useEffect, useState } from 'react';
import type { AdminStats, AdminStatsStatus } from '@/lib/stats';
import { successRate, noShowRate } from '@/lib/stats';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   StatsSummaryCard — 관리자 결과 통계 요약 카드
   ─ 이벤트 stats / 라이브 라운드 stats 는 shape 동일 → 하나의 카드로 렌더.
   ─ netRevenue 표시 여부는 props 토글 (라이브는 항상 0이라 숨김 권장).
   ─ open 상태에서도 호출은 가능하나 noShow 는 종료 후에만 의미가 있어
     상단 안내 문구로 사용자에게 명시.
   ────────────────────────────────────────── */

const STATUS_META: Record<AdminStatsStatus, { text: string; cls: string }> = {
  scheduled: { text: '오픈 예정', cls: 'badge-info' },
  open:      { text: '진행 중',   cls: 'badge-danger' },
  closed:    { text: '종료',     cls: 'badge-neutral' },
  cancelled: { text: '취소',     cls: 'badge-neutral' },
};

interface StatsSummaryCardProps {
  /** 카드 상단 좌측 제목 (예: 이벤트 제목, 회차명). */
  title: string;
  /** 통계를 불러오는 함수. props 로 주입 → 이벤트/라운드 재사용. */
  loader: () => Promise<AdminStats>;
  /** 매출 필드 렌더 여부. 라이브 라운드는 false 권장 (항상 0). */
  showRevenue?: boolean;
  /** 리로드 트리거 (부모에서 refresh 필요할 때 값 변경). */
  reloadKey?: number;
}

export default function StatsSummaryCard({
  title,
  loader,
  showRevenue = true,
  reloadKey = 0,
}: StatsSummaryCardProps) {
  // reloadKey 가 바뀌면 fetch 상태를 리셋해서 skeleton 부터 다시 보여야 하므로
  // 상태 초기값을 reloadKey 로 파생. (effect 안에서 setState 직접 호출 방지)
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(reloadKey);
  if (reloadTick !== reloadKey) {
    setReloadTick(reloadKey);
    setStats(null);
    setError(null);
    setLoading(true);
  }

  useEffect(() => {
    let alive = true;
    loader()
      .then((data) => { if (alive) setStats(data); })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : '통계를 불러오지 못했습니다.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // loader 는 부모에서 매 렌더 새로 생성될 수 있으므로 reloadTick 으로만 재실행.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTick]);

  if (loading) return <SkeletonCard title={title} />;

  if (error) {
    return (
      <section className="card p-5 space-y-2">
        <SummaryHeader title={title} status={null} />
        <p className="text-sm text-danger-text" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!stats) return null;

  const success = successRate(stats);
  const noShow = noShowRate(stats);
  const isPending = stats.status !== 'closed';

  return (
    <section className="card p-5 space-y-4">
      <SummaryHeader title={title} status={stats.status} />

      {isPending && (
        <p className="text-[11px] text-text-tertiary">
          진행/예정 상태의 통계는 잠정치입니다. 미참여·성공률은 종료 후 확정됩니다.
        </p>
      )}

      <div className={`grid gap-2 ${showRevenue ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        <StatCell label="신청"    value={fmtCount(stats.registered)} suffix="명" tone="text" />
        <StatCell label="성공"    value={fmtCount(stats.ticketed)}   suffix="명" tone="primary" />
        <StatCell label="미참여"  value={fmtCount(stats.noShow)}     suffix="명" tone="secondary" />
        {showRevenue && (
          <StatCell label="매출"   value={fmtCount(stats.netRevenue)} suffix="P" tone="text" />
        )}
      </div>

      <div className="pt-3 border-t border-border flex flex-wrap gap-4 text-xs text-text-secondary">
        <span>
          성공률{' '}
          <strong className="text-text font-mono-tabular font-semibold">
            {success === null ? '—' : `${success.toFixed(1)}%`}
          </strong>
        </span>
        <span>
          미참여율{' '}
          <strong className="text-text font-mono-tabular font-semibold">
            {noShow === null ? '—' : `${noShow.toFixed(1)}%`}
          </strong>
        </span>
      </div>
    </section>
  );
}

function SummaryHeader({
  title,
  status,
}: {
  title: string;
  status: AdminStatsStatus | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase">
          결과 통계
        </p>
        <p className="mt-0.5 text-sm font-bold text-text truncate">{title}</p>
      </div>
      {status && (
        <span className={`badge ${STATUS_META[status].cls} shrink-0`}>
          {STATUS_META[status].text}
        </span>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  tone: 'text' | 'primary' | 'secondary';
}) {
  const toneCls =
    tone === 'primary'   ? 'text-primary'
    : tone === 'secondary' ? 'text-text-secondary'
    : 'text-text';
  return (
    <div className="rounded-lg border border-border bg-bg-subtle px-3 py-2.5">
      <p className="text-[11px] font-semibold text-text-tertiary">{label}</p>
      <p className="mt-0.5 font-mono-tabular">
        <span className={`text-xl font-bold ${toneCls}`}>{value}</span>
        <span className="text-xs font-semibold text-text-tertiary ml-0.5">{suffix}</span>
      </p>
    </div>
  );
}

function SkeletonCard({ title }: { title: string }) {
  return (
    <section className="card p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase">
            결과 통계
          </p>
          <p className="mt-0.5 text-sm font-bold text-text truncate">{title}</p>
        </div>
        <div className="h-5 w-12 rounded bg-bg-subtle" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-bg-subtle h-16" />
        ))}
      </div>
    </section>
  );
}

function fmtCount(n: number): string {
  return (n ?? 0).toLocaleString();
}
