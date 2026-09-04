'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  adminCancelEvent,
  adminCleanupEvents,
  listAdminEvents,
  type AdminEvent,
  type EventStatus,
} from '@/lib/events';
import { formatKstDateTime } from '@/lib/kst';
import { ApiError } from '@/lib/errors';
import EventCancelModal from '@/components/admin/EventCancelModal';

/* ──────────────────────────────────────────
   /admin/events — 관리자 이벤트 목록 (실 API)
   ─ GET /api/admin/events (status 필터, cancelled 포함)
   ─ 취소 → POST /api/admin/events/:id/cancel (reason 필수)
   ────────────────────────────────────────── */

type FilterStatus = 'all' | EventStatus;

const STATUS_LABEL: Record<EventStatus, { text: string; cls: string }> = {
  scheduled: { text: '오픈 예정', cls: 'badge-info' },
  open: { text: '진행 중', cls: 'badge-danger' },
  closed: { text: '종료', cls: 'badge-neutral' },
  cancelled: { text: '취소', cls: 'badge-neutral' },
};

const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'scheduled', label: '오픈 예정' },
  { key: 'open', label: '진행 중' },
  { key: 'closed', label: '종료' },
  { key: 'cancelled', label: '취소' },
];

export default function AdminEventsClient() {
  const [status, setStatus] = useState<FilterStatus>('all');
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<AdminEvent | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [cleanupPending, setCleanupPending] = useState(false);
  const [cleanupNotice, setCleanupNotice] = useState<
    { kind: 'ok'; hiddenCount: number; durationMs: number }
    | { kind: 'error'; message: string }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listAdminEvents({
        status: status === 'all' ? undefined : status,
        limit: 100,
      });
      setEvents(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '이벤트 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const openCancelModal = (ev: AdminEvent) => {
    setCancelError(null);
    setCancelTarget(ev);
  };

  const closeCancelModal = () => {
    if (cancelPending) return;
    setCancelTarget(null);
    setCancelError(null);
  };

  const handleCleanup = async () => {
    if (cleanupPending) return;
    setCleanupPending(true);
    setCleanupNotice(null);
    try {
      const res = await adminCleanupEvents();
      setCleanupNotice({
        kind: 'ok',
        hiddenCount: res.hiddenCount,
        durationMs: res.durationMs,
      });
      await load();
    } catch (e) {
      setCleanupNotice({
        kind: 'error',
        message:
          e instanceof ApiError ? e.message : '숨김 정리 중 오류가 발생했습니다.',
      });
    } finally {
      setCleanupPending(false);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelPending(true);
    setCancelError(null);
    try {
      await adminCancelEvent(cancelTarget.eventId, reason);
      setCancelTarget(null);
      await load();
    } catch (e) {
      setCancelError(e instanceof ApiError ? e.message : '이벤트 취소 중 오류가 발생했습니다.');
    } finally {
      setCancelPending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">이벤트 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">
            관리자가 수동으로 여는 유료·특별 이벤트를 관리합니다.
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            매시 정각 자동 오픈되는 실시간 회차는{' '}
            <Link href="/admin/live" className="text-primary hover:underline">
              실시간 관리
            </Link>
            에서 다룹니다.
          </p>
        </div>
        <Link href="/admin/events/new" className="btn btn-solid shrink-0">
          + 새 이벤트
        </Link>
      </div>

      {/* 필터 + 숨김 정리 */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="inline-flex flex-wrap rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={[
                'shrink-0 whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                key === status
                  ? 'bg-bg-surface text-text shadow-xs border border-border'
                  : 'text-text-secondary hover:text-text',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleCleanup}
            disabled={cleanupPending}
            className="btn btn-outline btn-sm"
            title="종료·취소 이벤트를 사용자 목록에서 즉시 숨깁니다. 매일 자정 자동 실행."
          >
            {cleanupPending ? '정리 중…' : '숨김 정리'}
          </button>
          {cleanupNotice && (
            <p
              className={
                cleanupNotice.kind === 'ok'
                  ? 'text-xs text-text-tertiary'
                  : 'text-xs text-danger-text'
              }
              role={cleanupNotice.kind === 'error' ? 'alert' : undefined}
            >
              {cleanupNotice.kind === 'ok'
                ? `${cleanupNotice.hiddenCount}건 숨김 · ${cleanupNotice.durationMs}ms`
                : cleanupNotice.message}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 flex items-center justify-between gap-3"
        >
          <p className="text-sm text-danger-text">{error}</p>
          <button type="button" onClick={load} className="btn btn-outline btn-sm">
            다시 시도
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">이벤트</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">오픈</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">상태</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">신청</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-text-secondary">
                  불러오는 중…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-base font-bold text-text">
                        조건에 맞는 이벤트가 없어요
                      </p>
                      <p className="text-sm text-text-secondary">
                        새 이벤트를 만들거나 다른 상태를 선택해 보세요.
                      </p>
                    </div>
                    <Link href="/admin/events/new" className="btn btn-solid btn-sm inline-flex">
                      + 새 이벤트
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              events.map((ev) => {
                const st = STATUS_LABEL[ev.status];
                return (
                  <tr key={ev.eventId} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{ev.title}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{ev.prize}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary font-mono-tabular whitespace-nowrap">
                      {formatKstDateTime(ev.opensAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${st.cls}`}>{st.text}</span>
                    </td>
                    <td className="px-4 py-3 text-left font-mono-tabular text-text">
                      {ev.registeredCount}
                    </td>
                    <td className="px-4 py-3 text-left whitespace-nowrap">
                      <div className="inline-flex gap-1.5 -ml-3">
                        <Link
                          href={`/admin/events/${ev.eventId}/edit`}
                          className="btn btn-ghost btn-sm"
                        >
                          수정
                        </Link>
                        {ev.status !== 'closed' && ev.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(ev)}
                            className="btn btn-ghost btn-sm text-danger-text"
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <EventCancelModal
        open={!!cancelTarget}
        eventTitle={cancelTarget?.title ?? ''}
        registeredCount={cancelTarget?.registeredCount ?? 0}
        entryFeePoints={cancelTarget?.entryFeePoints ?? 0}
        pending={cancelPending}
        errorMessage={cancelError}
        onConfirm={handleConfirmCancel}
        onClose={closeCancelModal}
      />
    </div>
  );
}
