import Link from 'next/link';

/* ──────────────────────────────────────────
   홈 — 실시간 티켓팅 허브 + 리워드 쇼케이스
   ─ 실전 이벤트: 콘서트/공연 선착순 티켓팅 (성공 시 티켓 1매 획득)
   ─ 리워드 스토어: 모은 티켓으로 기프티콘 교환
   현재는 정적 mock. 실시간 좌석/접속자 수는 추후 SSE·폴링으로 대체.
   ────────────────────────────────────────── */

// 진행 중인 실시간 티켓팅 이벤트 (LIVE hero)
const LIVE_EVENT = {
  id: 'e001',
  category: '콘서트',
  title: '싸이 홈빽쇼 SUMMERSWAG 2026 - 서울',
  venue: '잠실종합운동장 주경기장',
  totalSeats: 3000,
  remainingSeats: 842,
  viewers: 1284,
  posterColor: '#1E3A8A',
  posterInitial: 'PSY',
};

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

const seatPercent = Math.round(
  (LIVE_EVENT.remainingSeats / LIVE_EVENT.totalSeats) * 100,
);

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-14">

      {/* ── Hero: 실시간 티켓팅 진행 중 ──────────────────── */}
      <section className="card overflow-hidden">
        <div className="grid md:grid-cols-[1.35fr_1fr]">
          {/* 좌: 이벤트 정보 */}
          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-bg border border-danger-border">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-text opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger-text" />
                </span>
                <span className="text-[11px] font-bold text-danger-text tracking-wider">LIVE</span>
              </span>
              <span className="text-xs text-text-secondary">
                지금 <strong className="text-text font-mono-tabular">{LIVE_EVENT.viewers.toLocaleString()}</strong>명 티켓팅 중
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-primary tracking-wide">{LIVE_EVENT.category}</p>
              <h1 className="text-2xl sm:text-[28px] font-bold text-text leading-tight">
                {LIVE_EVENT.title}
              </h1>
              <p className="text-sm text-text-secondary">{LIVE_EVENT.venue}</p>
            </div>

            {/* 좌석 progress */}
            <div className="space-y-2 mt-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-text-secondary">남은 좌석</span>
                <span className="font-mono-tabular">
                  <strong className="text-lg text-text">{LIVE_EVENT.remainingSeats.toLocaleString()}</strong>
                  <span className="text-text-tertiary"> / {LIVE_EVENT.totalSeats.toLocaleString()}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-bg-subtle overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${seatPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-2 mt-auto space-y-2.5">
              <Link href={`/event/${LIVE_EVENT.id}`} className="btn btn-solid btn-lg w-full sm:w-auto">
                지금 티켓팅 참여
              </Link>
              <p className="text-[11px] text-text-tertiary">
                성공 순위 <strong className="text-text-secondary">TOP 10</strong>에게 티켓, <strong className="text-text-secondary">TOP 3</strong>에게 기프티콘이 즉시 지급됩니다.
              </p>
            </div>
          </div>

          {/* 우: 포스터 자리 (실제 포스터 이미지로 교체 예정) */}
          <div
            className="hidden md:flex items-center justify-center min-h-[300px] relative"
            style={{ backgroundColor: LIVE_EVENT.posterColor }}
          >
            <span className="text-6xl font-black text-white/90 select-none tracking-tight">
              {LIVE_EVENT.posterInitial}
            </span>
            <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm text-[11px] font-medium text-white tracking-wide">
              POSTER
            </div>
          </div>
        </div>
      </section>

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
