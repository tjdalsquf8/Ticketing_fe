import type { Metadata } from 'next';
import Link from 'next/link';
import { ROUTES } from '@/lib/api';
import { PRACTICE_EVENTS } from '@/data/practice';
import RankingRows from '@/components/ranking/RankingRows';
import TicketRankingRows from '@/components/ranking/TicketRankingRows';

export const metadata: Metadata = { title: '랭킹' };

type Board = 'time' | 'tickets';
type Mode = 'practice' | 'live';
type Period = 'daily' | 'weekly' | 'monthly';
type TicketPeriod = 'weekly' | 'monthly' | 'all';

type RankEntry = {
  rank: number;
  nickname: string;
  best_ms: number;
  is_verified: boolean;
};

type TicketEntry = {
  rank: number;
  nickname: string;
  tickets: number;
};

function parsePositiveInt(
  value: string | string[] | undefined,
  { max }: { max: number },
): number | undefined {
  if (typeof value !== 'string') return undefined;
  if (!/^\d+$/.test(value)) return undefined;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1 || n > max) return undefined;
  return n;
}

const BOARD_LABELS: Record<Board, string> = {
  time: '소요 시간',
  tickets: '티켓 누적',
};

const MODE_LABELS: Record<Mode, string> = {
  practice: '연습 모드',
  live: '실시간 모드',
};

const PERIOD_LABELS: Record<Period, string> = {
  daily: '일간',
  weekly: '주간',
  monthly: '월간',
};

const TICKET_PERIOD_LABELS: Record<TicketPeriod, string> = {
  weekly: '주간',
  monthly: '월간',
  all: '전체',
};

const BOARD_DESCRIPTION: Record<Board, string> = {
  time: '소요 시간이 빠른 순으로 정렬됩니다.',
  tickets: '누적 티켓 수 기준 회원 순위입니다 (게스트 제외).',
};

// 뼈대 mock — 백엔드 board=tickets 엔드포인트 구현 시 대체
const MOCK_TICKET_RANKINGS: TicketEntry[] = [
  { rank: 1, nickname: '조성민', tickets: 47 },
  { rank: 2, nickname: '낭낭',   tickets: 42 },
  { rank: 3, nickname: '시골쥐', tickets: 38 },
  { rank: 4, nickname: '빅뱅',   tickets: 31 },
  { rank: 5, nickname: '구구',   tickets: 28 },
  { rank: 6, nickname: '강쥐',   tickets: 23 },
  { rank: 7, nickname: '사자',   tickets: 20 },
  { rank: 8, nickname: '하냥',   tickets: 17 },
  { rank: 9, nickname: '별이',   tickets: 12 },
  { rank: 10, nickname: '햇살',  tickets:  9 },
];

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeRankEntry(v: unknown): RankEntry | null {
  if (!v || typeof v !== 'object') return null;
  const e = v as Record<string, unknown>;
  const rank = toFiniteNumber(e.rank);
  const best_ms = toFiniteNumber(e.best_ms);
  if (
    rank === null ||
    best_ms === null ||
    typeof e.nickname !== 'string' ||
    typeof e.is_verified !== 'boolean'
  ) return null;
  return { rank, nickname: e.nickname, best_ms, is_verified: e.is_verified };
}

async function fetchTimeRankings(mode: Mode, period: Period, eventId?: number): Promise<RankEntry[]> {
  const qs = new URLSearchParams({ mode, period, page: '1', size: '20' });
  if (eventId !== undefined) qs.set('eventId', String(eventId));
  const url = `${ROUTES.rankings}?${qs.toString()}`;

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[ranking] fetch failed: ${res.status} ${res.statusText}`);
      }
      return [];
    }
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!Array.isArray(json.data)) return [];
    return json.data
      .map(normalizeRankEntry)
      .filter((e): e is RankEntry => e !== null);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ranking] fetch error:', e);
    }
    return [];
  }
}

// 백엔드 board=tickets 미구현 상태 — 향후 GET /rankings?board=tickets&period=... 대체
async function fetchTicketRankings(_period: TicketPeriod): Promise<TicketEntry[]> {
  return MOCK_TICKET_RANKINGS;
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{
    board?: string | string[];
    mode?: string | string[];
    period?: string | string[];
    eventId?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const board: Board = params.board === 'tickets' ? 'tickets' : 'time';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-text">랭킹</h1>
        <p className="mt-1 text-sm text-text-secondary">{BOARD_DESCRIPTION[board]}</p>
      </div>

      {/* 상위 탭: 랭킹 종류 (underline 스타일 — 최상위 네비게이션) */}
      <nav className="border-b border-border">
        <div className="flex gap-1 -mb-px">
          {(Object.keys(BOARD_LABELS) as Board[]).map((b) => (
            <Link
              key={b}
              href={`/ranking?board=${b}`}
              className={[
                'px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
                b === board
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text',
              ].join(' ')}
            >
              {BOARD_LABELS[b]}
            </Link>
          ))}
        </div>
      </nav>

      {board === 'time' ? (
        <TimeBoard params={params} />
      ) : (
        <TicketBoard params={params} />
      )}

    </div>
  );
}

// ── 소요 시간 보드 ─────────────────────────────────────

async function TimeBoard({
  params,
}: {
  params: { mode?: string | string[]; period?: string | string[]; eventId?: string | string[] };
}) {
  const mode: Mode = params.mode === 'live' ? 'live' : 'practice';
  const period: Period =
    params.period === 'daily' ? 'daily'
    : params.period === 'weekly' ? 'weekly'
    : 'monthly';
  const eventId = parsePositiveInt(params.eventId, { max: 999999 });

  const rankings = await fetchTimeRankings(mode, period, eventId);
  const baseQuery = `board=time&mode=${mode}&period=${period}`;

  return (
    <>
      {/* 서브 필터: 모드 + 기간 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <Link
              key={m}
              href={`/ranking?board=time&mode=${m}&period=${period}`}
              className={[
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                m === mode
                  ? 'bg-bg-surface text-text shadow-xs border border-border'
                  : 'text-text-secondary hover:text-text',
              ].join(' ')}
            >
              {MODE_LABELS[m]}
            </Link>
          ))}
        </div>

        <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <Link
              key={p}
              href={`/ranking?board=time&mode=${mode}&period=${p}${eventId ? `&eventId=${eventId}` : ''}`}
              className={[
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                p === period
                  ? 'bg-bg-surface text-text shadow-xs border border-border'
                  : 'text-text-secondary hover:text-text',
              ].join(' ')}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      {/* 연습 모드 — 이벤트 필터 */}
      {mode === 'practice' && (
        <div className="flex flex-wrap gap-2">
          {[{ eventId: undefined as number | undefined, label: '전체' },
            ...PRACTICE_EVENTS.map(e => ({ eventId: e.eventId, label: e.title.replace('[연습] ', '') }))
          ].map(({ eventId: eid, label }) => {
            const isActive = eid === undefined ? !eventId : eventId === eid;
            const href = eid === undefined
              ? `/ranking?${baseQuery}`
              : `/ranking?${baseQuery}&eventId=${eid}`;
            return (
              <Link
                key={eid ?? 'all'}
                href={href}
                className={[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white border border-primary'
                    : 'text-text-secondary border border-border hover:text-text hover:border-text-secondary',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}

      {/* 테이블 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary w-12 whitespace-nowrap">순위</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">닉네임</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">소요 시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <RankingRows rankings={rankings} />
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── 티켓 누적 보드 ─────────────────────────────────────

async function TicketBoard({
  params,
}: {
  params: { period?: string | string[] };
}) {
  const period: TicketPeriod =
    params.period === 'weekly' ? 'weekly'
    : params.period === 'monthly' ? 'monthly'
    : 'all';

  const rankings = await fetchTicketRankings(period);

  return (
    <>
      {/* 기간 필터 (블록 래퍼로 상위 탭과 수직 분리) */}
      <div>
        <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
          {(Object.keys(TICKET_PERIOD_LABELS) as TicketPeriod[]).map((p) => (
            <Link
              key={p}
              href={`/ranking?board=tickets&period=${p}`}
              className={[
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                p === period
                  ? 'bg-bg-surface text-text shadow-xs border border-border'
                  : 'text-text-secondary hover:text-text',
              ].join(' ')}
            >
              {TICKET_PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary w-12 whitespace-nowrap">순위</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">닉네임</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">티켓</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <TicketRankingRows rankings={rankings} />
          </tbody>
        </table>
      </div>

      {/* 안내 */}
      <div className="rounded-lg border border-info-border bg-info-bg px-4 py-3">
        <p className="text-xs text-info-text">
          티켓은 실시간·유료 이벤트에서 성공 순위 TOP 10(라이브) / TOP 3(유료)에 든 회원에게 지급됩니다.
          게스트는 티켓 지급 대상이 아닙니다.
        </p>
      </div>
    </>
  );
}
