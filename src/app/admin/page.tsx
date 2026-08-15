import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '관리자 대시보드' };

/* ──────────────────────────────────────────
   /admin — 관리자 대시보드
   ─ 오늘의 이벤트/기프티콘 지급/충전 요약
   ────────────────────────────────────────── */

const STATS = [
  { label: '오늘 진행된 이벤트', value: 12,     unit: '건',   href: '/admin/events'      },
  { label: '오늘 지급된 기프티콘', value:  9,    unit: '장',   href: '/admin/gifticons'  },
  { label: '오늘 발급된 티켓',    value: 84,     unit: '매',   href: null                 },
  { label: '오늘 충전 매출',      value: 128_000, unit: '원', href: null                 },
];

const RECENT_EVENTS = [
  { id: 'live-2100', type: 'live', title: '2100 정시 이벤트', status: 'closed',   participants: 234, rewarded: '티켓 10매' },
  { id: 'live-2000', type: 'live', title: '2000 정시 이벤트', status: 'closed',   participants: 198, rewarded: '티켓 10매' },
  { id: 'p001',      type: 'paid', title: '아이유 앙코르 티켓팅', status: 'scheduled', participants: 342, rewarded: '—' },
  { id: 'live-1900', type: 'live', title: '1900 정시 이벤트', status: 'closed',   participants: 180, rewarded: '티켓 10매' },
];

const TYPE_LABEL: Record<string, { text: string; cls: string }> = {
  live: { text: '라이브', cls: 'badge-danger'  },
  paid: { text: '유료',   cls: 'badge-primary' },
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  scheduled: { text: '오픈 예정', cls: 'badge-info'    },
  open:      { text: '진행 중',   cls: 'badge-danger'  },
  closed:    { text: '종료',      cls: 'badge-neutral' },
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">

      <header>
        <h1 className="text-2xl font-bold text-text">대시보드</h1>
        <p className="mt-1 text-sm text-text-secondary">오늘의 서비스 지표 요약</p>
      </header>

      {/* 스탯 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => {
          const Inner = (
            <div className="card p-4 h-full hover:border-border-strong transition-colors">
              <p className="text-xs text-text-secondary">{s.label}</p>
              <p className="mt-2 font-mono-tabular">
                <strong className="text-2xl text-text">{s.value.toLocaleString()}</strong>
                <span className="text-sm text-text-secondary ml-1">{s.unit}</span>
              </p>
            </div>
          );
          return s.href
            ? <Link key={s.label} href={s.href}>{Inner}</Link>
            : <div key={s.label}>{Inner}</div>;
        })}
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">타입</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">이벤트</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">상태</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">참여자</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">지급</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_EVENTS.map((ev) => {
                const tp = TYPE_LABEL[ev.type];
                const st = STATUS_LABEL[ev.status];
                return (
                  <tr key={ev.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3"><span className={`badge ${tp.cls}`}>{tp.text}</span></td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/events/${ev.id}/edit`} className="text-text font-medium hover:text-primary">
                        {ev.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-text">{ev.participants}</td>
                    <td className="px-4 py-3 text-right text-xs text-text-secondary">{ev.rewarded}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 빠른 액션 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text">빠른 액션</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/admin/events/new" className="card p-4 hover:border-primary transition-colors">
            <p className="text-sm font-semibold text-text">+ 새 이벤트</p>
            <p className="mt-1 text-xs text-text-secondary">라이브·유료 이벤트 생성</p>
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
