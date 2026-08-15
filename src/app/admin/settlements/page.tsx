import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '정산 이력' };

/* ──────────────────────────────────────────
   /admin/settlements — 이벤트 종료 후 지급 결과 이력
   ─ 뼈대: 실제로는 GET /admin/settlements?page=&size=&status=
   ────────────────────────────────────────── */

type SettleStatus = 'success' | 'partial' | 'failed';

const STATUS_LABEL: Record<SettleStatus, { text: string; cls: string }> = {
  success: { text: '정상',    cls: 'badge-success' },
  partial: { text: '부분 지급', cls: 'badge-warning' },
  failed:  { text: '실패',    cls: 'badge-danger'  },
};

const SETTLEMENTS = [
  { id: 's201', eventId: 'live-2100', eventTitle: '2100 정시 이벤트',                   type: 'live', settledAt: '2026.08.11 21:05', rewarded: 10, total: 10, status: 'success' as const },
  { id: 's200', eventId: 'live-2000', eventTitle: '2000 정시 이벤트',                   type: 'live', settledAt: '2026.08.11 20:05', rewarded: 10, total: 10, status: 'success' as const },
  { id: 's199', eventId: 'live-1900', eventTitle: '1900 정시 이벤트',                   type: 'live', settledAt: '2026.08.11 19:05', rewarded:  8, total: 10, status: 'partial' as const },
  { id: 's198', eventId: 'p099',      eventTitle: 'BLACKPINK 앙코르 서울 콘서트',        type: 'paid', settledAt: '2026.08.05 19:05', rewarded:  3, total:  3, status: 'success' as const },
  { id: 's197', eventId: 'live-1800', eventTitle: '1800 정시 이벤트',                   type: 'live', settledAt: '2026.08.11 18:05', rewarded:  0, total: 10, status: 'failed' as const },
];

const TYPE_LABEL: Record<string, { text: string; cls: string }> = {
  live: { text: '라이브', cls: 'badge-danger'  },
  paid: { text: '유료',   cls: 'badge-primary' },
};

export default function AdminSettlementsPage() {
  return (
    <div className="space-y-8">

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-text">정산 이력</h1>
        <p className="mt-1 text-sm text-text-secondary">이벤트 종료 후 지급 결과를 조회합니다.</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="오늘 정산" value={4} unit="건" />
        <StatCard label="지급된 티켓" value={38} unit="매" tone="success" />
        <StatCard label="지급된 기프티콘" value={3} unit="장" tone="success" />
      </div>

      {/* 목록 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">타입</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">이벤트</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">정산 시각</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">지급 / 예정</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">상태</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {SETTLEMENTS.map((s) => {
              const tp = TYPE_LABEL[s.type];
              const st = STATUS_LABEL[s.status];
              return (
                <tr key={s.id} className="hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3"><span className={`badge ${tp.cls}`}>{tp.text}</span></td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/events/${s.eventId}/edit`} className="font-medium text-text hover:text-primary">
                      {s.eventTitle}
                    </Link>
                    <p className="text-xs text-text-tertiary mt-0.5 font-mono-tabular">#{s.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary font-mono-tabular whitespace-nowrap">{s.settledAt}</td>
                  <td className="px-4 py-3 text-right font-mono-tabular">
                    <strong className="text-text">{s.rewarded}</strong>
                    <span className="text-text-tertiary"> / {s.total}</span>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {s.status !== 'success' && (
                      <button type="button" className="btn btn-outline btn-sm">재정산</button>
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
}

function StatCard({
  label, value, unit, tone,
}: {
  label: string; value: number; unit: string; tone?: 'success';
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-2 font-mono-tabular">
        <strong className={['text-2xl', tone === 'success' ? 'text-success-text' : 'text-text'].join(' ')}>
          {value.toLocaleString()}
        </strong>
        <span className="text-sm text-text-secondary ml-1">{unit}</span>
      </p>
    </div>
  );
}
