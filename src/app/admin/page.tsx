'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listAdminEvents, type AdminEvent, type EventStatus } from '@/lib/events';
import { formatKstDateTime, getKstToday, toKstDate } from '@/lib/kst';

/* ──────────────────────────────────────────
   /admin — 관리자 대시보드
   ─ 오늘 KST 기준 이벤트 요약 + 최근 이벤트 5건
   ─ GET /api/admin/events?limit=100 (cancelled 포함)
   ────────────────────────────────────────── */

const STATUS_LABEL: Record<EventStatus, { text: string; cls: string }> = {
  scheduled: { text: '오픈 예정', cls: 'badge-info' },
  open:      { text: '진행 중',   cls: 'badge-danger' },
  closed:    { text: '종료',      cls: 'badge-neutral' },
  cancelled: { text: '취소',      cls: 'badge-neutral' },
};

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listAdminEvents({ limit: 100 });
      setEvents(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '대시보드를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = getKstToday();
  const todayEvents = useMemo(
    () => events.filter((ev) => toKstDate(ev.opensAt) === today),
    [events, today],
  );
  const recentEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => new Date(b.opensAt).getTime() - new Date(a.opensAt).getTime())
        .slice(0, 5),
    [events],
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text">대시보드</h1>
        <p className="mt-1 text-sm text-text-secondary">오늘의 서비스 지표 요약</p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 flex items-center justify-between gap-3"
        >
          <p className="text-sm text-danger-text">{error}</p>
          <button type="button" onClick={load} className="btn btn-outline btn-sm shrink-0">
            다시 시도
          </button>
        </div>
      )}

      {/* 스탯 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="오늘 오픈 이벤트"
          value={isLoading ? null : todayEvents.length}
          unit="건"
          href={todayEvents.length > 0 ? '/admin/events' : undefined}
          emptyHref="/admin/events/new"
          emptyLabel="새 이벤트 만들기 →"
        />
        <StatCard
          label="전체 등록 이벤트"
          value={isLoading ? null : events.length}
          unit="건"
          href="/admin/events"
        />
        <StatCard label="오늘 지급된 기프티콘" value={null} unit="장" emptyHref="/admin/gifticons" emptyLabel="재고 관리 →" />
        <StatCard label="오늘 충전 매출" value={null} unit="원" />
      </div>

      {/* 최근 이벤트 */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-text">최근 이벤트</h2>
          <Link href="/admin/events" className="text-sm font-semibold text-primary hover:underline">
            전체 보기 →
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">이벤트</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">오픈 (KST)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">상태</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">신청자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-4">
                      <div className="h-4 w-full bg-bg-subtle rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-text">최근 이벤트가 없어요</p>
                      <p className="text-xs text-text-secondary">
                        <Link href="/admin/events/new" className="text-primary font-semibold hover:underline">
                          첫 이벤트 만들기 →
                        </Link>
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentEvents.map((ev) => {
                  const st = STATUS_LABEL[ev.status];
                  return (
                    <tr key={ev.eventId} className="hover:bg-bg-subtle transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/events/${ev.eventId}/edit`}
                          className="text-text font-medium hover:text-primary"
                        >
                          {ev.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono-tabular text-text-secondary">
                        {formatKstDateTime(ev.opensAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${st.cls}`}>{st.text}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular text-text">
                        {ev.registeredCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* 빠른 액션 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text">빠른 액션</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/admin/events/new" className="card p-4 hover:border-primary transition-colors">
            <p className="text-sm font-semibold text-text">+ 새 이벤트</p>
            <p className="mt-1 text-xs text-text-secondary">이벤트 생성</p>
          </Link>
          <Link href="/admin/gifticons" className="card p-4 hover:border-primary transition-colors">
            <p className="text-sm font-semibold text-text">+ 기프티콘 재고 업로드</p>
            <p className="mt-1 text-xs text-text-secondary">CSV로 대량 등록</p>
          </Link>
          <Link href="/admin/settlements" className="card p-4 hover:border-primary transition-colors">
            <p className="text-sm font-semibold text-text">최근 정산 확인</p>
            <p className="mt-1 text-xs text-text-secondary">지급 결과·미지급 재확인</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label, value, unit, href, emptyHref, emptyLabel,
}: {
  label: string;
  value: number | null;
  unit: string;
  href?: string;
  emptyHref?: string;
  emptyLabel?: string;
}) {
  const inner = (
    <div className="card p-4 h-full hover:border-border-strong transition-colors">
      <p className="text-xs text-text-secondary">{label}</p>
      {value === null ? (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-text-tertiary">데이터 없음</p>
          {emptyHref && (
            <Link
              href={emptyHref}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {emptyLabel ?? '만들기 →'}
            </Link>
          )}
        </div>
      ) : (
        <p className="mt-2 font-mono-tabular">
          <strong className="text-2xl text-text">{value.toLocaleString()}</strong>
          <span className="text-sm text-text-secondary ml-1">{unit}</span>
        </p>
      )}
    </div>
  );
  return href && value !== null ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

