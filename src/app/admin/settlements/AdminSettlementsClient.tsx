'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listGifticons, type Gifticon, type GifticonCategory } from '@/lib/gifticons';
import {
  issueGifticonSettlement,
  listGifticonSettlements,
  type GifticonSettlement,
  type GifticonSettlementStatus,
} from '@/lib/settlements';
import { ApiError } from '@/lib/errors';
import { formatKstDateTime } from '@/lib/kst';

/* ──────────────────────────────────────────
   /admin/settlements — 기프티콘 정산 이력 (실 API)
   ─ 이벤트 TOP 3 당첨자별 지급 상태만 추적 (티켓 정산은 드롭)
   ─ GET /admin/settlements/gifticons — TOP3는 BE가 tickets 테이블에서 즉석 계산,
     pending row는 DB에 없고 조회 시점에 합쳐서 내려옴
   ─ POST /admin/settlements/gifticons/:id/issue — 재고 1건 배정 = 지급 완료
     (전달확인 등 별도 단계 없음)
   ────────────────────────────────────────── */

const CATEGORY_LABEL: Record<GifticonCategory, string> = {
  coffee: '커피',
  food: '음식',
  convenience: '편의점',
  beauty: '뷰티',
  etc: '기타',
};

type StatusFilter = 'all' | GifticonSettlementStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'issued', label: '완료' },
];

const STATUS_LABEL: Record<GifticonSettlementStatus, { text: string; cls: string }> = {
  pending: { text: '대기', cls: 'badge-warning' },
  issued: { text: '지급 완료', cls: 'badge-success' },
};

const PAGE_SIZE = 200;

export default function AdminSettlementsClient() {
  const [settlements, setSettlements] = useState<GifticonSettlement[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [issueTarget, setIssueTarget] = useState<GifticonSettlement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listGifticonSettlements({ size: PAGE_SIZE });
      setSettlements(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '정산 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? settlements : settlements.filter((s) => s.status === statusFilter)),
    [settlements, statusFilter],
  );

  const groups = useMemo(() => {
    const map = new Map<number, GifticonSettlement[]>();
    for (const s of filtered) {
      const list = map.get(s.eventId) ?? [];
      list.push(s);
      map.set(s.eventId, list);
    }
    return Array.from(map.values())
      .map((list) => list.sort((a, b) => a.rank - b.rank))
      .sort((a, b) => b[0].endedAt.localeCompare(a[0].endedAt));
  }, [filtered]);

  const totalCount = settlements.length;
  const issuedCount = settlements.filter((s) => s.status === 'issued').length;
  const pendingCount = totalCount - issuedCount;

  const handleIssued = (updated: GifticonSettlement) => {
    setSettlements((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setIssueTarget(null);
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-text">정산 이력</h1>
        <p className="mt-1 text-sm text-text-secondary">
          이벤트 TOP 3 당첨자별 기프티콘 지급 현황입니다.
        </p>
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

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="정산 대상" value={totalCount} unit="명" />
        <StatCard label="지급 완료" value={issuedCount} unit="명" tone="success" />
        <StatCard label="대기" value={pendingCount} unit="명" tone={pendingCount > 0 ? 'warning' : undefined} />
      </div>

      {/* 상태 필터 */}
      <div className="inline-flex flex-wrap rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={[
              'shrink-0 whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              key === statusFilter
                ? 'bg-bg-surface text-text shadow-xs border border-border'
                : 'text-text-secondary hover:text-text',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 이벤트별 그룹 */}
      {isLoading ? (
        <div className="card px-4 py-16 text-center">
          <p className="text-sm text-text-secondary">불러오는 중…</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="card px-4 py-16 text-center">
          <p className="text-sm text-text-secondary">조건에 맞는 정산 대상이 없어요.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((rows) => {
            const first = rows[0];
            const done = rows.filter((r) => r.status === 'issued').length;
            return (
              <div key={first.eventId} className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-bg-subtle flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-text">{first.eventTitle}</p>
                    <p className="text-xs text-text-tertiary font-mono-tabular mt-0.5">
                      종료 {formatKstDateTime(first.endedAt)}
                    </p>
                  </div>
                  <span className="text-xs font-mono-tabular text-text-secondary">
                    {done} / {rows.length} 완료
                  </span>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary w-14 whitespace-nowrap">순위</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary">닉네임</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary">상태</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary">지급 내역</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-secondary whitespace-nowrap">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((s) => {
                      const st = STATUS_LABEL[s.status];
                      return (
                        <tr key={s.id} className="hover:bg-bg-subtle transition-colors">
                          <td className="px-4 py-3 font-mono-tabular text-text-secondary">{s.rank}</td>
                          <td className="px-4 py-3 font-medium text-text">{s.nickname}</td>
                          <td className="px-4 py-3"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                          <td className="px-4 py-3 text-xs text-text-secondary">
                            {s.status === 'issued' ? (
                              <>
                                <span className="text-text">{s.productName}</span>
                                <span className="text-text-tertiary"> · {s.faceValue?.toLocaleString()}원</span>
                                <p className="text-text-tertiary font-mono-tabular mt-0.5">
                                  {s.issuedAt && formatKstDateTime(s.issuedAt)}
                                </p>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {s.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => setIssueTarget(s)}
                                className="btn btn-outline btn-sm"
                              >
                                지급하기
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <IssueGifticonModal
        key={issueTarget?.id ?? 'closed'}
        target={issueTarget}
        onClose={() => setIssueTarget(null)}
        onIssued={handleIssued}
      />
    </div>
  );
}

function StatCard({
  label, value, unit, tone,
}: {
  label: string; value: number; unit: string; tone?: 'success' | 'warning';
}) {
  const toneCls = tone === 'success' ? 'text-success-text' : tone === 'warning' ? 'text-warning-text' : 'text-text';
  return (
    <div className="card p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-2 font-mono-tabular">
        <strong className={['text-2xl', toneCls].join(' ')}>{value.toLocaleString()}</strong>
        <span className="text-sm text-text-secondary ml-1">{unit}</span>
      </p>
    </div>
  );
}

/* ── 재고 배정 모달 ─────────────────────────────────────
   available 재고 목록 조회 + 지급 확정(POST .../issue) 전부 실 API. */

function IssueGifticonModal({
  target,
  onClose,
  onIssued,
}: {
  target: GifticonSettlement | null;
  onClose: () => void;
  onIssued: (updated: GifticonSettlement) => void;
}) {
  const open = target !== null;

  const [items, setItems] = useState<Gifticon[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await listGifticons({ status: 'available', limit: 50 });
      setItems(data);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : '재고 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmPending) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, confirmPending, onClose]);

  if (!open || !target) return null;

  async function handleConfirm() {
    if (!target || !pickedId || confirmPending) return;
    setConfirmPending(true);
    setConfirmError(null);
    try {
      const updated = await issueGifticonSettlement(target.id, Number(pickedId));
      onIssued(updated);
    } catch (e) {
      setConfirmError(e instanceof ApiError ? e.message : '지급 처리 중 오류가 발생했습니다.');
    } finally {
      setConfirmPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={confirmPending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="기프티콘 지급"
    >
      <div
        className="w-full max-w-lg bg-bg-surface rounded-2xl border border-border shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold text-primary tracking-wider uppercase">기프티콘 지급</p>
          <h3 className="mt-1 text-lg font-bold text-text">
            {target.eventTitle} · {target.rank}위 · {target.nickname}
          </h3>
        </div>

        <div className="p-5 space-y-3 text-sm">
          {isLoading && (
            <p className="text-sm text-text-secondary py-8 text-center">불러오는 중…</p>
          )}

          {loadError && (
            <p role="alert" className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-md px-3 py-2">
              {loadError}
            </p>
          )}

          {!isLoading && !loadError && items.length === 0 && (
            <p className="text-sm text-text-secondary py-8 text-center">
              사용 가능한 재고가 없습니다. 기프티콘 재고 페이지에서 먼저 등록해 주세요.
            </p>
          )}

          {!isLoading && items.length > 0 && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {items.map((g) => (
                <label
                  key={g.id}
                  className={[
                    'flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors',
                    pickedId === g.id ? 'border-primary bg-primary-subtle' : 'border-border hover:bg-bg-subtle',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="issue-gifticon"
                    checked={pickedId === g.id}
                    onChange={() => setPickedId(g.id)}
                    disabled={confirmPending}
                    className="shrink-0"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-text">{CATEGORY_LABEL[g.category]} · {g.productName}</span>
                    <span className="block text-xs text-text-tertiary font-mono-tabular">{g.codeMasked}</span>
                  </span>
                  <span className="text-sm font-mono-tabular text-text shrink-0">
                    {g.faceValue.toLocaleString()}원
                  </span>
                </label>
              ))}
            </div>
          )}

          {confirmError && (
            <p role="alert" className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-md px-3 py-2">
              {confirmError}
            </p>
          )}
        </div>

        <div className="p-5 pt-0 flex items-center gap-2">
          <button type="button" onClick={onClose} disabled={confirmPending} className="btn btn-neutral flex-1 disabled:opacity-50">
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!pickedId || confirmPending}
            className="btn btn-solid flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmPending ? '처리 중…' : '이 재고로 지급'}
          </button>
        </div>
      </div>
    </div>
  );
}
