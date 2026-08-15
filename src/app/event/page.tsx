import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '유료 이벤트' };

/* ──────────────────────────────────────────
   /event — 유료 이벤트 목록
   ─ 관리자가 수동 개설한 이벤트만 노출
   ─ 참여비 500P (또는 티켓) · 성공 TOP 3 → 기프티콘 즉시 지급
   ────────────────────────────────────────── */

type Status = 'upcoming' | 'open' | 'closed';

const STATUS_LABEL: Record<Status, { text: string; cls: string }> = {
  upcoming: { text: '오픈 예정', cls: 'badge-info'    },
  open:     { text: '진행 중',   cls: 'badge-danger'  },
  closed:   { text: '종료',      cls: 'badge-neutral' },
};

// 정적 mock
const EVENTS = [
  {
    id: 'p001',
    title: '아이유 The Golden Hour 앙코르',
    category: '콘서트',
    venue: '고척스카이돔',
    opensAt: '2026.08.15 20:00',
    countdown: '5일 09:12',
    entryFee: 500,
    seats: 8000,
    registered: 342,
    prize: '스타벅스 30,000원 상품권 × TOP 3',
    posterColor: '#DB2777',
    posterInitial: 'IU',
    status: 'upcoming' as Status,
  },
  {
    id: 'p002',
    title: '뮤지컬 하데스타운 내한공연',
    category: '뮤지컬',
    venue: '블루스퀘어 신한카드홀',
    opensAt: '오늘 21:00',
    countdown: '01:24:12',
    entryFee: 500,
    seats: 1500,
    registered: 128,
    prize: '올리브영 20,000원 상품권 × TOP 3',
    posterColor: '#9A3412',
    posterInitial: 'HDS',
    status: 'upcoming' as Status,
  },
  {
    id: 'p099',
    title: 'BLACKPINK 앙코르 서울 콘서트',
    category: '콘서트',
    venue: '올림픽공원 KSPO돔',
    opensAt: '2026.08.05 19:00',
    countdown: '—',
    entryFee: 500,
    seats: 12000,
    registered: 512,
    prize: '지급 완료',
    posterColor: '#EC4899',
    posterInitial: 'BP',
    status: 'closed' as Status,
  },
];

export default function EventListPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">

      {/* 헤더 */}
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">유료 이벤트</h1>
        <p className="text-sm text-text-secondary">
          참여비 500P로 도전하고, 소요 시간 TOP 3에게 기프티콘이 즉시 지급됩니다.
        </p>
      </header>

      {/* 필터 (뼈대) */}
      <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
        {['전체', '오픈 예정', '진행 중', '종료'].map((label, i) => (
          <button
            key={label}
            type="button"
            className={[
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              i === 0
                ? 'bg-bg-surface text-text shadow-xs border border-border'
                : 'text-text-secondary hover:text-text',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 카드 리스트 */}
      <ul className="space-y-4">
        {EVENTS.map((ev) => {
          const st = STATUS_LABEL[ev.status];
          const isClosed = ev.status === 'closed';
          return (
            <li key={ev.id}>
              <Link
                href={`/event/${ev.id}`}
                className="card overflow-hidden flex flex-col sm:flex-row hover:border-border-strong transition-colors group"
              >
                {/* 포스터 */}
                <div
                  className="sm:w-48 aspect-[4/3] sm:aspect-auto flex items-center justify-center relative shrink-0"
                  style={{ backgroundColor: ev.posterColor }}
                >
                  <span className="text-5xl font-black text-white/90 tracking-tight select-none">
                    {ev.posterInitial}
                  </span>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm text-[10px] font-semibold text-white tracking-wide">
                    {ev.category}
                  </div>
                </div>

                {/* 정보 */}
                <div className="flex-1 p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-text truncate group-hover:text-primary transition-colors">
                        {ev.title}
                      </h2>
                      <p className="text-sm text-text-secondary mt-0.5 truncate">{ev.venue}</p>
                    </div>
                    <span className={`badge ${st.cls} shrink-0`}>{st.text}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-text-tertiary">오픈</p>
                      <p className="mt-0.5 font-mono-tabular font-semibold text-text">{ev.opensAt}</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">카운트다운</p>
                      <p className="mt-0.5 font-mono-tabular font-semibold text-text">{ev.countdown}</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">참여비</p>
                      <p className="mt-0.5 font-mono-tabular font-semibold text-text">{ev.entryFee}P</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">참여자 / 좌석</p>
                      <p className="mt-0.5 font-mono-tabular font-semibold text-text">
                        {ev.registered.toLocaleString()} / {ev.seats.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-2 flex items-center justify-between gap-3 border-t border-border-subtle">
                    <p className="text-xs text-text-secondary truncate">
                      🏆 <strong className="text-text">{ev.prize}</strong>
                    </p>
                    {!isClosed && (
                      <span className="text-sm font-semibold text-primary shrink-0">
                        참여하기 →
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Empty state (참고) */}
      {EVENTS.length === 0 && (
        <div className="card p-8 text-center text-sm text-text-secondary">
          진행 중인 유료 이벤트가 없습니다.
        </div>
      )}

    </div>
  );
}
