import type { Metadata } from 'next';
import Link from 'next/link';
import { ROUTES } from '@/lib/api';
import { PRACTICE_EVENTS } from '@/data/practiceEvents';

export const metadata: Metadata = { title: '랭킹' };

type Mode = 'practice' | 'live';
type Period = 'daily' | 'weekly' | 'monthly';

type RankEntry = {
  rank: number;
  nickname: string;
  best_ms: number;
  is_verified: boolean;
};

const RANK_BADGE: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatTime(ms: number) {
  return (ms / 1000).toFixed(3) + 's';
}

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

const MODE_LABELS: Record<Mode, string> = {
  practice: '연습 모드',
  live: '실시간 모드',
};

const PERIOD_LABELS: Record<Period, string> = {
  daily: '일간',
  weekly: '주간',
  monthly: '월간',
};

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

async function fetchRankings(mode: Mode, period: Period, eventId?: number): Promise<RankEntry[]> {
  const qs = new URLSearchParams({ mode, period, page: '1', size: '20' });
  if (eventId !== undefined) qs.set('eventId', String(eventId));
  const url = `${ROUTES.rankings}?${qs.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 30 },
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

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string | string[];
    period?: string | string[];
    eventId?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const mode: Mode = params.mode === 'live' ? 'live' : 'practice';
  const period: Period =
    params.period === 'weekly' ? 'weekly'
    : params.period === 'monthly' ? 'monthly'
    : 'daily';

  const eventId = parsePositiveInt(params.eventId, { max: 999999 });

  const rankings = await fetchRankings(mode, period, eventId);
  const myEntry = null as RankEntry | null;

  const baseQuery = `mode=${mode}&period=${period}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-text">랭킹</h1>
        <p className="mt-1 text-sm text-text-secondary">
          소요 시간 기준 순위입니다.
        </p>
      </div>

      {/* 모드 탭 + 기간 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 모드 탭 */}
        <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <Link
              key={m}
              href={`/ranking?mode=${m}&period=${period}`}
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

        {/* 기간 탭 */}
        <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <Link
              key={p}
              href={`/ranking?${baseQuery.replace(`period=${period}`, `period=${p}`)}${eventId ? `&eventId=${eventId}` : ''}`}
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

      {/* 내 순위 요약 */}
      {myEntry && (
        <div className="card p-4 flex items-center gap-4 border-primary-border bg-primary-subtle">
          <div className="text-2xl font-bold font-mono-tabular text-primary w-10 text-center">
            {myEntry.rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">내 순위</p>
            <p className="text-xs text-text-secondary mt-0.5">
              소요 시간:{' '}
              <strong className="text-text font-mono-tabular">
                {formatTime(myEntry.best_ms)}
              </strong>
            </p>
          </div>
          <span className="badge badge-primary shrink-0">TOP {myEntry.rank}</span>
        </div>
      )}

      {/* 랭킹 테이블 */}
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
            {rankings.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-sm text-text-secondary">
                  아직 기록이 없습니다.
                </td>
              </tr>
            ) : (
              rankings.map((row, i) => {
                const isMe = row.nickname === myEntry?.nickname;
                return (
                  <tr
                    key={`${row.rank}-${i}`}
                    className={[
                      'transition-colors',
                      isMe ? 'bg-primary-subtle' : 'hover:bg-bg-subtle',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 font-mono-tabular font-semibold text-text-secondary">
                      {RANK_BADGE[row.rank] ?? row.rank}
                    </td>
                    <td className="px-4 py-3">
                      <span className={['font-medium', isMe ? 'text-primary' : 'text-text'].join(' ')}>
                        {row.nickname}
                      </span>
                      {row.is_verified && (
                        <span className="ml-2 badge badge-primary">인증</span>
                      )}
                      {isMe && <span className="ml-2 text-xs text-primary font-semibold">(나)</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular font-bold text-text">
                      {formatTime(row.best_ms)}
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
