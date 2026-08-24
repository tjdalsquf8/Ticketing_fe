import Link from 'next/link';
import HomeLiveHero from './HomeLiveHero';

/* ──────────────────────────────────────────
   홈 — 실시간 티켓팅 허브 + 리워드 쇼케이스
   ─ Hero: 진행 중·예정 라이브 회차 (실 API)
   ─ 나머지 섹션(오픈 예정 카탈로그·리더보드): 아직 mock
   ────────────────────────────────────────── */

// 오픈 예정 이벤트
const UPCOMING = [
  { id: 'e002', category: '콘서트',    title: '아이유 The Golden Hour 앙코르',    venue: '고척스카이돔',          openAt: '오늘 20:00',   countdown: '05:23:11', seats: 8000, posterColor: '#DB2777', posterInitial: 'IU'  },
  { id: 'e003', category: '페스티벌',  title: '펜타포트 락 페스티벌 2026',        venue: '인천 송도달빛축제공원', openAt: '내일 12:00',   countdown: '23:00:00', seats: 12000, posterColor: '#0F766E', posterInitial: 'PENTA' },
  { id: 'e004', category: '뮤지컬',    title: '뮤지컬 하데스타운 내한공연',       venue: '블루스퀘어 신한카드홀', openAt: '금요일 15:00', countdown: '3일 09:00', seats: 1500, posterColor: '#9A3412', posterInitial: 'HDS' },
  { id: 'e005', category: '스포츠',    title: '두산 vs LG 정규리그',              venue: '잠실야구장',            openAt: '토요일 12:00', countdown: '4일 05:00', seats: 25000, posterColor: '#B91C1C', posterInitial: 'LG' },
  { id: 'e006', category: '콘서트',    title: 'NewJeans Bunnies Camp',           venue: 'KSPO DOME',             openAt: '다음주 월요일', countdown: '6일 04:12', seats: 15000, posterColor: '#7C3AED', posterInitial: 'NJ' },
  { id: 'e007', category: '연극',      title: '연극 라이어 3',                     venue: '대학로 아트홀',         openAt: '다음주 수요일', countdown: '8일 04:12', seats: 400, posterColor: '#166534', posterInitial: 'LIAR' },
];

// 누적 티켓 리더보드 TOP 5 (로그인 유저 대상)
const TICKET_LEADERBOARD = [
  { rank: 1, nickname: '조성민', tickets: 47 },
  { rank: 2, nickname: '낭낭',   tickets: 42 },
  { rank: 3, nickname: '시골쥐', tickets: 38 },
  { rank: 4, nickname: '빅뱅',   tickets: 31 },
  { rank: 5, nickname: '구구',   tickets: 28 },
];

const RANK_BADGE: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-14">

      {/* ── Hero: 실시간 티켓팅 (실 API) ──────────────────── */}
      <HomeLiveHero />

      {/* ── 오픈 예정 이벤트 (가로 스크롤) ─────────────────── */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-text">곧 오픈되는 티켓팅</h2>
            <p className="text-sm text-text-secondary mt-1">오픈 시간에 맞춰 실전 도전하세요</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-primary hover:underline shrink-0">
            전체 보기 →
          </Link>
        </div>

        <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <ul className="flex gap-4 pb-1" style={{ width: 'max-content' }}>
            {UPCOMING.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/event/${ev.id}`}
                  className="card overflow-hidden w-64 shrink-0 block hover:border-border-strong transition-colors group"
                >
                  <div
                    className="aspect-[3/4] flex items-center justify-center relative"
                    style={{ backgroundColor: ev.posterColor }}
                  >
                    <span className="text-4xl font-black text-white/90 leading-none select-none tracking-tight text-center px-4">
                      {ev.posterInitial}
                    </span>
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm text-[10px] font-semibold text-white tracking-wide">
                      {ev.category}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-md bg-black/55 backdrop-blur-sm">
                      <span className="text-[10px] text-white/70 font-medium">오픈까지</span>
                      <span className="text-xs font-mono-tabular font-bold text-white">
                        {ev.countdown}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-1">
                    <p className="text-sm font-bold text-text truncate group-hover:text-primary transition-colors">
                      {ev.title}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{ev.venue}</p>
                    <p className="text-xs text-text-tertiary pt-1">
                      {ev.openAt} · {ev.seats.toLocaleString()}석
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 티켓 누적 리더보드 (TOP 5) ─────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-text">티켓 리더보드</h2>
            <p className="text-sm text-text-secondary mt-1">지금까지 가장 많은 티켓을 모은 도전자</p>
          </div>
          <Link href="/ranking" className="text-sm font-semibold text-primary hover:underline shrink-0">
            전체 보기 →
          </Link>
        </div>

        <ol className="card divide-y divide-border overflow-hidden">
          {TICKET_LEADERBOARD.map((row) => (
            <li key={row.rank} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-8 text-center font-mono-tabular font-semibold text-text-secondary">
                {RANK_BADGE[row.rank] ?? row.rank}
              </span>
              <span className="flex-1 text-sm font-medium text-text truncate">
                {row.nickname}
              </span>
              <span className="font-mono-tabular">
                <strong className="text-base text-text">{row.tickets}</strong>
                <span className="text-xs text-text-tertiary ml-1">티켓</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 서비스 안내 (축약) ─────────────────────────────── */}
      <section className="card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 space-y-1.5">
            <h2 className="text-lg font-bold text-text">티켓 러시가 처음이신가요?</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              연습 모드로 손 풀기 → 실전 티켓팅 TOP 3에게 기프티콘, TOP 10에게 티켓 → 티켓 리더보드에서 순위 경쟁
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/practice" className="btn btn-outline">연습 모드</Link>
            <Link href="/ranking" className="btn btn-neutral">리더보드</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
