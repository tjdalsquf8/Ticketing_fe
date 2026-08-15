import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '이벤트 관리' };

/* ──────────────────────────────────────────
   /admin/events — 관리자 개설 이벤트 목록
   ─ 매시 정각 자동 오픈되는 라이브 회차는 /admin/live 에서 관리
   ─ 이 페이지는 관리자가 수동으로 여는 유료·특별 이벤트를 다룸
   ─ 필터: 상태(전체·오픈 예정·진행 중·종료)
   ─ 액션: 수정 · 취소 · 정산
   ────────────────────────────────────────── */

type Status = 'all' | 'scheduled' | 'open' | 'closed';

const STATUS_LABEL: Record<Exclude<Status, 'all'>, { text: string; cls: string }> = {
  scheduled: { text: '오픈 예정', cls: 'badge-info'    },
  open:      { text: '진행 중',   cls: 'badge-danger'  },
  closed:    { text: '종료',      cls: 'badge-neutral' },
};

const STATUS_FILTERS: { key: Status; label: string }[] = [
  { key: 'all',       label: '전체' },
  { key: 'scheduled', label: '오픈 예정' },
  { key: 'open',      label: '진행 중' },
  { key: 'closed',    label: '종료' },
];

// 뼈대 mock — 실제로는 GET /admin/events?status=
const EVENTS = [
  { id: 'p001', title: '아이유 The Golden Hour 앙코르', opensAt: '2026.08.15 20:00', participants: 342, status: 'scheduled', prize: '스타벅스 30,000원 상품권 × 3' },
  { id: 'p002', title: '뮤지컬 하데스타운 내한공연',    opensAt: '2026.08.16 21:00', participants: 128, status: 'scheduled', prize: '올리브영 20,000원 상품권 × 3' },
  { id: 'p003', title: 'NCT DREAM 팬미팅 티켓팅',       opensAt: '2026.08.14 19:00', participants: 456, status: 'open',      prize: 'CGV 무비 커플권 × 5' },
  { id: 'p099', title: 'BLACKPINK 앙코르 서울 콘서트',  opensAt: '2026.08.05 19:00', participants: 512, status: 'closed',    prize: 'CU 10,000원 상품권 × 3' },
] as const;

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const status: Status =
    params.status === 'scheduled' ? 'scheduled'
    : params.status === 'open' ? 'open'
    : params.status === 'closed' ? 'closed'
    : 'all';

  const filtered = EVENTS.filter((ev) => status === 'all' || ev.status === status);

  return (
    <div className="space-y-8">

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">이벤트 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">
            관리자가 수동으로 여는 유료·특별 이벤트를 관리합니다.
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            매시 정각 자동 오픈되는 실시간 회차는 <Link href="/admin/live" className="text-primary hover:underline">실시간 관리</Link>에서 다룹니다.
          </p>
        </div>
        <Link href="/admin/events/new" className="btn btn-solid shrink-0">
          + 새 이벤트
        </Link>
      </div>

      {/* 필터 */}
      <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
        {STATUS_FILTERS.map(({ key, label }) => {
          const qs = key === 'all' ? '' : `?status=${key}`;
          return (
            <Link
              key={key}
              href={`/admin/events${qs}`}
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

      {/* 목록 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">이벤트</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">오픈</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">상태</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">참여</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-secondary">
                  조건에 맞는 이벤트가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((ev) => {
                const st = STATUS_LABEL[ev.status];
                return (
                  <tr key={ev.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{ev.title}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{ev.prize}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary font-mono-tabular whitespace-nowrap">
                      {ev.opensAt}
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-text">{ev.participants}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <Link href={`/admin/events/${ev.id}/edit`} className="btn btn-ghost btn-sm">수정</Link>
                        {ev.status !== 'closed' && (
                          <button type="button" className="btn btn-ghost btn-sm text-danger-text">
                            취소
                          </button>
                        )}
                        {ev.status === 'open' && (
                          <button type="button" className="btn btn-outline btn-sm">
                            정산
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
  );
}
