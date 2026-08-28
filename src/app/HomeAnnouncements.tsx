import Link from 'next/link';

/* ──────────────────────────────────────────
   HomeAnnouncements — 공지·업데이트 리스트 카드
   ─ 공지 API 미구현. 현재는 하드코드 mock.
   ─ 향후 GET /api/notices 나오면 이 상수를 fetch 로 교체.
   ────────────────────────────────────────── */

type Kind = 'notice' | 'update' | 'fix';

interface Announcement {
  id: string;
  kind: Kind;
  title: string;
  date: string; // "MM.DD" 표기
  href?: string;
}

const KIND_LABEL: Record<Kind, { text: string; cls: string }> = {
  notice: { text: '공지', cls: 'bg-primary-subtle text-primary' },
  update: { text: '업데이트', cls: 'bg-info-bg text-info-text' },
  fix: { text: '수정', cls: 'bg-bg-subtle text-text-secondary' },
};

// TODO: BE 공지 API 구현 시 fetch 교체
const ITEMS: Announcement[] = [
  { id: 'n5', kind: 'notice', title: '홈 화면 개편 — 서비스 소개·공지 섹션 신설', date: '08.27' },
  { id: 'n4', kind: 'update', title: '유료 이벤트 신청 상태 배지 매트릭스 확장', date: '08.26' },
  { id: 'n3', kind: 'fix',    title: '마이페이지 포인트 사용 내역 정상 표시', date: '08.26' },
  { id: 'n2', kind: 'update', title: '내 티켓 목록에 유료 이벤트 티켓 인식', date: '08.25' },
  { id: 'n1', kind: 'notice', title: 'TicketRush 오픈 — 실시간 무료 매치 시작', date: '08.20' },
];

export default function HomeAnnouncements() {
  return (
    <section className="space-y-3">
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">공지 · 업데이트</h2>
          <Link
            href="/"
            aria-disabled
            className="text-xs text-text-tertiary hover:text-text-secondary"
            title="공지 페이지 준비 중"
          >
            전체보기
          </Link>
        </div>

        <ul className="divide-y divide-border-subtle">
          {ITEMS.map((n) => {
            const badge = KIND_LABEL[n.kind];
            const row = (
              <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-bg-subtle transition-colors">
                <span
                  className={[
                    'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded',
                    badge.cls,
                  ].join(' ')}
                >
                  {badge.text}
                </span>
                <p className="flex-1 text-sm text-text truncate">{n.title}</p>
                <span className="shrink-0 text-xs text-text-tertiary font-mono-tabular">
                  {n.date}
                </span>
              </div>
            );
            return (
              <li key={n.id}>
                {n.href ? <Link href={n.href}>{row}</Link> : row}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
