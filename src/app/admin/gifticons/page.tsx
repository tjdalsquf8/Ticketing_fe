import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '기프티콘 재고' };

/* ──────────────────────────────────────────
   /admin/gifticons — 기프티콘 재고 조회 · 업로드 · 재발급
   ─ 뼈대: 실제로는 GET /admin/gifticons?status=&product=
   ─ CSV 업로드는 POST /admin/gifticons/bulk
   ────────────────────────────────────────── */

type Status = 'all' | 'available' | 'issued' | 'redeemed' | 'expired';

const STATUS_LABEL: Record<Exclude<Status, 'all'>, { text: string; cls: string }> = {
  available: { text: '사용 가능', cls: 'badge-success' },
  issued:    { text: '지급 완료', cls: 'badge-info'    },
  redeemed:  { text: '사용 완료', cls: 'badge-neutral' },
  expired:   { text: '만료',      cls: 'badge-danger'  },
};

const STATUS_FILTERS: { key: Status; label: string }[] = [
  { key: 'all',       label: '전체' },
  { key: 'available', label: '사용 가능' },
  { key: 'issued',    label: '지급 완료' },
  { key: 'redeemed',  label: '사용 완료' },
  { key: 'expired',   label: '만료' },
];

// 재고 요약
const SUMMARY = [
  { label: '총 재고',    value: 128 },
  { label: '사용 가능',  value:  84 },
  { label: '지급 완료',  value:  32 },
  { label: '사용 완료',  value:  12 },
];

// 뼈대 mock — 실제로는 GET /admin/gifticons
// issuedTo는 실 사용자 이름으로 오해되지 않도록 명백히 데모임을 드러내는 라벨만 사용.
// 실 API 연동 시엔 백엔드 응답을 그대로 노출하지 말고 maskName()으로 마스킹할 것.
const GIFTICONS = [
  { id: 'g001', brand: '스타벅스', product: '아메리카노 T',      faceValue:  4_500, status: 'available' as const, issuedTo: null,             issuedAt: null },
  { id: 'g002', brand: '스타벅스', product: '카페라떼 T',       faceValue:  5_500, status: 'available' as const, issuedTo: null,             issuedAt: null },
  { id: 'g003', brand: '스타벅스', product: '30,000원 상품권',   faceValue: 30_000, status: 'issued' as const,    issuedTo: '데모유저-001', issuedAt: '2026.08.09 20:14' },
  { id: 'g004', brand: 'CU',       product: '5,000원 상품권',    faceValue:  5_000, status: 'redeemed' as const,  issuedTo: '데모유저-002', issuedAt: '2026.08.05 18:30' },
  { id: 'g005', brand: '올리브영', product: '10,000원 상품권',    faceValue: 10_000, status: 'available' as const, issuedTo: null,             issuedAt: null },
  { id: 'g006', brand: 'BBQ',      product: '황금올리브 치킨',   faceValue: 23_000, status: 'issued' as const,    issuedTo: '데모유저-003', issuedAt: '2026.08.10 21:05' },
  { id: 'g007', brand: '교촌치킨', product: '허니콤보',          faceValue: 23_000, status: 'expired' as const,   issuedTo: null,             issuedAt: null },
];

/**
 * 실 사용자명 노출을 최소화하는 마스킹 유틸.
 * "홍길동" → "홍*동", 2자 이하는 마지막 글자만 마스킹.
 * 백엔드 연동 후 issuedTo를 렌더할 때 반드시 통과시킬 것.
 */
function maskName(name: string | null): string {
  if (!name) return '—';
  const trimmed = name.trim();
  if (trimmed.length <= 1) return '*';
  if (trimmed.length === 2) return trimmed[0] + '*';
  return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
}

export default async function AdminGifticonsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; brand?: string | string[] }>;
}) {
  const params = await searchParams;
  const status: Status =
    params.status === 'available' ? 'available'
    : params.status === 'issued' ? 'issued'
    : params.status === 'redeemed' ? 'redeemed'
    : params.status === 'expired' ? 'expired'
    : 'all';

  const brandFilter = typeof params.brand === 'string' ? params.brand : '';

  const filtered = GIFTICONS.filter((g) => {
    if (status !== 'all' && g.status !== status) return false;
    if (brandFilter && g.brand !== brandFilter) return false;
    return true;
  });

  const brands = Array.from(new Set(GIFTICONS.map((g) => g.brand)));

  return (
    <div className="space-y-8">

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">기프티콘 재고</h1>
          <p className="mt-1 text-sm text-text-secondary">유료 이벤트 상품 재고를 관리합니다.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" className="btn btn-neutral">
            CSV 다운로드
          </button>
          <button type="button" className="btn btn-solid">
            + CSV 업로드
          </button>
        </div>
      </div>

      {/* 요약 스탯 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-text-secondary">{s.label}</p>
            <p className="mt-2 font-mono-tabular">
              <strong className="text-2xl text-text">{s.value.toLocaleString()}</strong>
              <span className="text-sm text-text-secondary ml-1">장</span>
            </p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
          {STATUS_FILTERS.map(({ key, label }) => {
            const qs = new URLSearchParams();
            if (key !== 'all') qs.set('status', key);
            if (brandFilter) qs.set('brand', brandFilter);
            return (
              <Link
                key={key}
                href={`/admin/gifticons${qs.toString() ? `?${qs}` : ''}`}
                className={[
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  key === status
                    ? 'bg-bg-surface text-text shadow-xs border border-border'
                    : 'text-text-secondary hover:text-text',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5 flex-wrap">
          <Link
            href={`/admin/gifticons${status !== 'all' ? `?status=${status}` : ''}`}
            className={[
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              !brandFilter
                ? 'bg-bg-surface text-text shadow-xs border border-border'
                : 'text-text-secondary hover:text-text',
            ].join(' ')}
          >
            전체 브랜드
          </Link>
          {brands.map((b) => {
            const qs = new URLSearchParams();
            if (status !== 'all') qs.set('status', status);
            qs.set('brand', b);
            return (
              <Link
                key={b}
                href={`/admin/gifticons?${qs.toString()}`}
                className={[
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  b === brandFilter
                    ? 'bg-bg-surface text-text shadow-xs border border-border'
                    : 'text-text-secondary hover:text-text',
                ].join(' ')}
              >
                {b}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 목록 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">브랜드 / 상품</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액면가</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">상태</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">지급 대상</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-secondary">
                  조건에 맞는 기프티콘이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((g) => {
                const st = STATUS_LABEL[g.status];
                return (
                  <tr key={g.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3 text-xs text-text-tertiary font-mono-tabular">{g.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{g.brand}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{g.product}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-text">
                      {g.faceValue.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                    <td className="px-4 py-3 text-xs">
                      {g.issuedTo ? (
                        <>
                          <p className="text-text font-medium">{maskName(g.issuedTo)}</p>
                          <p className="text-text-tertiary mt-0.5 font-mono-tabular">{g.issuedAt}</p>
                        </>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {g.status === 'issued' && (
                        <button type="button" className="btn btn-ghost btn-sm">재발급</button>
                      )}
                      {g.status === 'expired' && (
                        <button type="button" className="btn btn-ghost btn-sm text-danger-text">삭제</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
