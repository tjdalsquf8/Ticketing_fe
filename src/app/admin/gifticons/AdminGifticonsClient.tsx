'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteGifticon,
  getGifticonsSummary,
  listGifticons,
  type Gifticon,
  type GifticonCategory,
  type GifticonStatus,
  type GifticonsSummary,
} from '@/lib/gifticons';
import type { ListMeta } from '@/lib/events';
import { formatKstDateTime } from '@/lib/kst';
import { ApiError } from '@/lib/errors';
import GifticonCreateModal from '@/components/admin/GifticonCreateModal';
import GifticonDetailModal from '@/components/admin/GifticonDetailModal';

/* ──────────────────────────────────────────
   /admin/gifticons — 기프티콘 재고 관리 (실 API)
   ─ GET /api/admin/gifticons (category/status/q 필터, page/limit)
   ─ 등록 · 상세(코드 확인) · 삭제
   ────────────────────────────────────────── */

type FilterStatus = 'all' | GifticonStatus;
type FilterCategory = 'all' | GifticonCategory;

const STATUS_LABEL: Record<GifticonStatus, { text: string; cls: string }> = {
  available: { text: '사용 가능', cls: 'badge-success' },
  issued: { text: '지급 완료', cls: 'badge-info' },
  redeemed: { text: '사용 완료', cls: 'badge-neutral' },
  expired: { text: '만료', cls: 'badge-danger' },
};

const CATEGORY_LABEL: Record<GifticonCategory, string> = {
  coffee: '커피',
  food: '음식',
  convenience: '편의점',
  beauty: '뷰티',
  etc: '기타',
};

const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'available', label: '사용 가능' },
  { key: 'issued', label: '지급 완료' },
  { key: 'redeemed', label: '사용 완료' },
  { key: 'expired', label: '만료' },
];

const CATEGORY_FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'coffee', label: '커피' },
  { key: 'food', label: '음식' },
  { key: 'convenience', label: '편의점' },
  { key: 'beauty', label: '뷰티' },
  { key: 'etc', label: '기타' },
];

const PAGE_LIMIT = 20;

export default function AdminGifticonsClient() {
  const [status, setStatus] = useState<FilterStatus>('all');
  const [category, setCategory] = useState<FilterCategory>('all');

  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');

  const [page, setPage] = useState(1);

  const [gifticons, setGifticons] = useState<Gifticon[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<GifticonsSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 검색어 300ms 디바운스
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [queryInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await listGifticons({
        status: status === 'all' ? undefined : status,
        category: category === 'all' ? undefined : category,
        q: query || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setGifticons(data);
      setMeta(m ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '기프티콘 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [status, category, query, page]);

  const loadSummary = useCallback(async () => {
    setSummaryError(null);
    try {
      const s = await getGifticonsSummary();
      setSummary(s);
    } catch (e: unknown) {
      setSummaryError(e instanceof Error ? e.message : '요약 정보를 불러올 수 없습니다.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const refreshAll = useCallback(() => {
    load();
    loadSummary();
  }, [load, loadSummary]);

  const handleStatusChange = (key: FilterStatus) => {
    setStatus(key);
    setPage(1);
  };

  const handleCategoryChange = (key: FilterCategory) => {
    setCategory(key);
    setPage(1);
  };

  const handleDelete = async (g: Gifticon) => {
    if (!confirm(`[${CATEGORY_LABEL[g.category]}] ${g.productName} 재고를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletingId(g.id);
    try {
      await deleteGifticon(g.id);
      await load();
      await loadSummary();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = meta ? Math.max(1, Math.ceil(meta.totalCount / meta.limit)) : 1;

  const SUMMARY_ITEMS: { label: string; value: number | null }[] = [
    { label: '총 재고', value: summary?.total ?? null },
    { label: '사용 가능', value: summary?.available ?? null },
    { label: '지급 완료', value: summary?.issued ?? null },
    { label: '사용 완료', value: summary?.redeemed ?? null },
  ];

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">기프티콘 재고</h1>
          <p className="mt-1 text-sm text-text-secondary">유료 이벤트 상품 재고를 관리합니다.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-solid">
            + 재고 등록
          </button>
        </div>
      </div>

      {/* 요약 스탯 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY_ITEMS.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-text-secondary">{s.label}</p>
            <p className="mt-2 font-mono-tabular">
              <strong className="text-2xl text-text">
                {s.value === null ? '—' : s.value.toLocaleString()}
              </strong>
              {s.value !== null && <span className="text-sm text-text-secondary ml-1">장</span>}
            </p>
          </div>
        ))}
      </div>
      {summaryError && (
        <p role="alert" className="text-xs text-danger-text">
          {summaryError}
        </p>
      )}

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleStatusChange(key)}
                className={[
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  key === status
                    ? 'bg-bg-surface text-text shadow-xs border border-border'
                    : 'text-text-secondary hover:text-text',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5 flex-wrap">
            {CATEGORY_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleCategoryChange(key)}
                className={[
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  key === category
                    ? 'bg-bg-surface text-text shadow-xs border border-border'
                    : 'text-text-secondary hover:text-text',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <input
          type="search"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="상품명 / 코드 뒷자리 검색"
          className="w-full sm:w-64 px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
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

      {/* 목록 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">카테고리 / 상품</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액면가</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">코드</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">상태</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">등록일</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-text-secondary">
                  불러오는 중…
                </td>
              </tr>
            ) : gifticons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="space-y-1">
                    <p className="text-base font-bold text-text">조건에 맞는 기프티콘이 없어요</p>
                    <p className="text-sm text-text-secondary">
                      새 재고를 등록하거나 다른 조건을 선택해 보세요.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              gifticons.map((g) => {
                const st = STATUS_LABEL[g.status];
                const canDelete = g.status === 'available';
                return (
                  <tr key={g.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3 text-left text-xs text-text-tertiary font-mono-tabular">{g.id}</td>
                    <td className="px-4 py-3 text-left">
                      <p className="font-medium text-text">{CATEGORY_LABEL[g.category]}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{g.productName}</p>
                    </td>
                    <td className="px-4 py-3 text-left font-mono-tabular text-text whitespace-nowrap">
                      {g.faceValue.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-left text-xs text-text-secondary font-mono-tabular">{g.codeMasked}</td>
                    <td className="px-4 py-3 text-left whitespace-nowrap">
                      <span className={`badge ${st.cls}`}>{st.text}</span>
                    </td>
                    <td className="px-4 py-3 text-left text-xs text-text-secondary font-mono-tabular whitespace-nowrap">
                      {formatKstDateTime(g.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-left whitespace-nowrap">
                      <div className="inline-flex gap-1.5 -ml-3">
                        <button
                          type="button"
                          onClick={() => setDetailId(g.id)}
                          className="btn btn-ghost btn-sm"
                        >
                          상세
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(g)}
                            disabled={deletingId === g.id}
                            className="btn btn-ghost btn-sm text-danger-text disabled:opacity-50"
                          >
                            {deletingId === g.id ? '삭제 중…' : '삭제'}
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

      {/* 페이지네이션 */}
      {meta && meta.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <p>
            총 <span className="font-mono-tabular text-text">{meta.totalCount.toLocaleString()}</span>건
          </p>
          <div className="inline-flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              이전
            </button>
            <span className="px-2 py-1.5 font-mono-tabular text-text-secondary">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}

      <GifticonCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          refreshAll();
        }}
      />

      <GifticonDetailModal
        gifticonId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={refreshAll}
      />
    </div>
  );
}
