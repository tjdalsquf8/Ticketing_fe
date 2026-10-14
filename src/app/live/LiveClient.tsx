'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  getLiveCurrent,
  getLiveNext,
  getLastRound,
  isRoundLive,
  type LiveRoundSummary,
} from '@/lib/live';
import { useServerTime } from '@/hooks/useServerTime';
import { getLiveEventByVenueSlug, type LiveEvent } from '@/data/live';
import { ApiError } from '@/lib/errors';
import {
  getRankings,
  getMyRankings,
  type RankEntry,
  type MyRankEntry,
  type RankingPeriod,
} from '@/lib/rankings';
import RankingTable from '@/components/ranking/RankingTable';
import RoundRankingTable from '@/components/ranking/RoundRankingTable';
import { RANK_HEAD_CELL, RANK_SCROLL_HEIGHT } from '@/components/ranking/rankingShell';

/* ──────────────────────────────────────────
   /live 실시간 이벤트 랜딩 — API 실연동
   ─ current 우선 · 없으면 next 로 fallback
   ─ 카운트다운은 useServerTime 으로 drift 보정
   ────────────────────────────────────────── */

interface State {
  current: LiveRoundSummary | null;
  next: LiveRoundSummary | null;
  /** 진행 중 회차가 없을 때 회차 랭킹이 가리킬 직전 종료 회차. */
  lastRoundId: number | null;
  loaded: boolean;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** ms → { h, m, s } 카운트다운 파트. 음수면 0으로 클램프. */
function splitCountdown(ms: number): { h: string; m: string; s: string; done: boolean } {
  if (ms <= 0) return { h: '00', m: '00', s: '00', done: true };
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h: pad2(h), m: pad2(m), s: pad2(s), done: false };
}

const RANK_TABS: { key: 'all' | 'mine'; label: string }[] = [
  { key: 'all', label: '전체 랭킹' },
  { key: 'mine', label: '내 기록' },
];

const RANK_PERIODS: { key: RankingPeriod; label: string }[] = [
  { key: 'daily', label: '일간' },
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
];

/**
 * 랭킹 범위. 'round' 는 회차 단위(같이 뛴 사람들과의 순위), 나머지는 기간별 누적
 * 최고기록이다. 실시간 참여자가 기대하는 건 "방금 판" 순위라 'round' 가 기본값.
 */
type RankScope = 'round' | RankingPeriod;

export default function LiveClient() {
  const [state, setState] = useState<State>({
    current: null,
    next: null,
    lastRoundId: null,
    loaded: false,
  });
  const [error, setError] = useState<string | null>(null);
  const { nowServer } = useServerTime();
  const [, setTick] = useState(0);

  // 실시간 랭킹 섹션 — 회차/기간 범위 + (누적일 때만) 전체/내기록 탭
  const [rankTab, setRankTab] = useState<'all' | 'mine'>('all');
  const [rankScope, setRankScope] = useState<RankScope>('round');
  const [rankings, setRankings] = useState<(RankEntry | MyRankEntry)[]>([]);
  const [rankLoading, setRankLoading] = useState(true);

  const loadRankings = useCallback(async () => {
    // 회차 랭킹은 RoundRankingTable 이 자체적으로 불러온다.
    if (rankScope === 'round') {
      setRankLoading(false);
      return;
    }
    setRankLoading(true);
    const fetcher = rankTab === 'mine' ? getMyRankings : getRankings;
    try {
      const rows = await fetcher({ mode: 'live', period: rankScope });
      setRankings(rows);
    } catch {
      setRankings([]);
    } finally {
      setRankLoading(false);
    }
  }, [rankTab, rankScope]);

  useEffect(() => {
    void loadRankings();
  }, [loadRankings]);

  // 초기 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, n, l] = await Promise.allSettled([
        getLiveCurrent(),
        getLiveNext(),
        // 회차 랭킹 기본 탭이 가리킬 회차. 진행 중 회차가 없으면 직전 종료 회차로 넘어간다.
        getLastRound(1),
      ]);
      if (!alive) return;
      // 어느 하나라도 rejected 여도 나머지는 렌더. 에러 메시지는 최소한만.
      const firstError = [c, n, l].find((r) => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined;
      if (firstError && firstError.reason instanceof ApiError) {
        setError(firstError.reason.message);
      }
      setState({
        current: c.status === 'fulfilled' ? c.value : null,
        next: n.status === 'fulfilled' ? n.value : null,
        lastRoundId:
          l.status === 'fulfilled' ? (l.value?.round.roundId ?? null) : null,
        loaded: true,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 카운트다운 tick (drift 반영된 nowServer 로 매 500ms 재계산)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  // closesAt 이 지난 회차는 백엔드 status 가 아직 'open' 이어도 진행 중으로 치지 않는다.
  const liveRound: LiveRoundSummary | null = isRoundLive(state.current, nowServer())
    ? state.current
    : null;
  const activeRound: LiveRoundSummary | null = liveRound ?? state.next;
  // 회차 랭킹 대상: 진행 중 회차 우선, 없으면 직전 종료 회차.
  const rankRoundId: number | null = liveRound?.roundId ?? state.lastRoundId;
  const scopeTabs: { key: RankScope; label: string }[] = [
    { key: 'round', label: liveRound ? '이번 회차' : '지난 회차' },
    ...RANK_PERIODS,
  ];
  const showNicknameCol = rankScope === 'round' || rankTab === 'all';
  // "내 기록"은 시도 한 건이 한 행이라 날짜 열을 붙인다. 회차 랭킹에는 해당 없음.
  const showDateCol = rankScope !== 'round' && rankTab === 'mine';
  const activeEvent: LiveEvent | null = activeRound
    ? getLiveEventByVenueSlug(activeRound.venueId)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-14">
      {/* 헤더 */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-bg border border-danger-border">
            <span className="h-1.5 w-1.5 rounded-full bg-danger-text" />
            <span className="text-[11px] font-bold text-danger-text tracking-wider">LIVE</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">실시간 이벤트</h1>
        </div>
        <p className="text-sm text-text-secondary">
          매시간 정각에 자동 오픈. 성공 순위는 실시간 랭킹에서 바로 확인할 수 있습니다.
        </p>
      </header>

      {/* 회차 hero 카드 */}
      {!state.loaded ? (
        <SkeletonHero />
      ) : activeRound ? (
        <HeroCard
          round={activeRound}
          event={activeEvent}
          isOpen={liveRound?.roundId === activeRound.roundId}
          nowServer={nowServer}
        />
      ) : (
        <EmptyHero />
      )}

      {/* 실시간 랭킹 */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-text">실시간 랭킹</h2>
            <p className="text-sm text-text-secondary mt-1">
              {rankScope === 'round'
                ? '같은 회차에 참여한 사람들끼리의 순위입니다.'
                : '기간 내 최고 기록 기준입니다.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {rankScope !== 'round' && (
              <div className="inline-flex flex-wrap rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
                {RANK_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRankTab(key)}
                    className={[
                      'shrink-0 whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                      key === rankTab
                        ? 'bg-bg-surface text-text shadow-xs border border-border'
                        : 'text-text-secondary hover:text-text',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="inline-flex flex-wrap rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
              {scopeTabs.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRankScope(key)}
                  className={[
                    'shrink-0 whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                    key === rankScope
                      ? 'bg-bg-surface text-text shadow-xs border border-border'
                      : 'text-text-secondary hover:text-text',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {/* 참여자가 많아도 페이지 전체가 늘어나지 않도록 랭킹만 별도 스크롤.
              헤더와 "내 순위" 행은 이 영역 위·아래에 고정된다. */}
          <div className={`${RANK_SCROLL_HEIGHT} overflow-y-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  {showDateCol && (
                    <th className={`${RANK_HEAD_CELL} text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap`}>날짜</th>
                  )}
                  <th className={`${RANK_HEAD_CELL} text-left px-4 py-3 text-xs font-semibold text-text-secondary w-12 whitespace-nowrap`}>순위</th>
                  {showNicknameCol && (
                    <th className={`${RANK_HEAD_CELL} text-left px-4 py-3 text-xs font-semibold text-text-secondary`}>닉네임</th>
                  )}
                  {/* 남는 폭을 흡수하는 열이 하나는 있어야 나머지 열이 왼쪽에 붙는다.
                      닉네임 열이 없는 "내 기록"에서는 소요 시간이 그 역할을 맡는다. */}
                  <th className={`${RANK_HEAD_CELL} text-right px-4 py-3 text-xs font-semibold text-text-secondary${showDateCol ? ' w-full' : ''}`}>소요 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rankScope === 'round' ? (
                  rankRoundId !== null ? (
                    <RoundRankingTable key={rankRoundId} roundId={rankRoundId} />
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-sm text-text-tertiary">
                        {state.loaded ? '아직 진행된 회차가 없습니다.' : '불러오는 중…'}
                      </td>
                    </tr>
                  )
                ) : rankLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-sm text-text-tertiary">불러오는 중…</td>
                  </tr>
                ) : (
                  <RankingTable
                    key={`${rankTab}-${rankScope}`}
                    mode="live"
                    period={rankScope}
                    myRankings={rankTab === 'mine'}
                    initialRows={rankings}
                    showNickname={rankTab === 'all'}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 규칙 안내 */}
      <section className="card p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-text">실시간 이벤트 규칙</h2>
        <ul className="text-sm text-text-secondary space-y-1.5 list-disc list-inside">
          <li>매시간 정각에 자동으로 오픈됩니다.</li>
          <li>
            성공한 사람은 소요 시간 기준으로{' '}
            <strong className="text-text">실시간 랭킹</strong>에 바로 반영됩니다.
          </li>
          <li>
            소요 시간은{' '}
            <strong className="text-text">예매하기를 누른 순간부터 예매 완료까지</strong>를
            측정합니다 (대기열에서 기다린 시간도 포함).
          </li>
          <li>
            게스트도 참여 가능하지만 리더보드 등재는{' '}
            <strong className="text-text">회원 전용</strong>입니다.
          </li>
        </ul>
      </section>

      {error && (
        <p className="text-xs text-text-tertiary text-center">
          일부 데이터를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
        </p>
      )}
    </div>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────

function HeroCard({
  round,
  event,
  isOpen,
  nowServer,
}: {
  round: LiveRoundSummary;
  event: LiveEvent | null;
  isOpen: boolean;
  nowServer: () => number;
}) {
  const opensAtMs = Date.parse(round.opensAt);
  const remaining = opensAtMs - nowServer();
  const cd = splitCountdown(remaining);

  const title = event?.title ?? `실시간 회차 #${round.roundId}`;
  const venueName = event?.venueName ?? '';
  const category = event?.category ?? '실시간';
  const poster = event?.posterImage;

  const opensAtLabel = new Date(opensAtMs).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="grid md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start">
      <div className="card p-6 sm:p-8 flex flex-col gap-5 min-w-0">
          <div>
            <p className="text-xs font-semibold text-primary tracking-wide">
              {category} · {isOpen ? '진행 중' : `오픈 ${opensAtLabel}`}
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-[28px] font-bold text-text leading-tight">
              {title}
            </h2>
            {venueName && <p className="mt-1 text-sm text-text-secondary">{venueName}</p>}
          </div>

          {/* 카운트다운 (open 이면 "진행 중" 표시로 대체) */}
          {isOpen ? (
            <div className="rounded-xl border border-danger-border bg-danger-bg p-4 text-center">
              <p className="text-sm font-semibold text-danger-text">지금 진행 중입니다.</p>
              <p className="text-xs text-text-secondary mt-1">
                아래 버튼을 눌러 대기실에 입장하세요.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-subtle p-4 flex items-end gap-1 justify-center">
              {[
                { val: cd.h, unit: '시간' },
                { val: cd.m, unit: '분' },
                { val: cd.s, unit: '초' },
              ].map(({ val, unit }, i) => (
                <div key={unit} className="flex items-end gap-1">
                  {i > 0 && (
                    <span className="text-2xl font-light text-text-tertiary mb-1">:</span>
                  )}
                  <div className="text-center min-w-[3rem]">
                    <span className="font-mono-tabular text-4xl font-bold text-text">{val}</span>
                    <p className="text-xs text-text-tertiary mt-0.5">{unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              총 좌석{' '}
              <strong className="text-text font-mono-tabular">
                {round.totalSeats.toLocaleString()}
              </strong>
              석
            </span>
            <span>회차 #{round.roundId}</span>
          </div>

          <Link
            href={`/live/${round.roundId}`}
            className="btn btn-solid btn-lg w-full sm:w-auto"
          >
            대기실 입장
          </Link>
        </div>

      {/* 포스터 카드 (practice 상세와 동일 스타일) */}
      <div
        className="hidden md:block relative w-full rounded-xl overflow-hidden aspect-[3/4] bg-[#0b1220]"
        aria-label="공연 포스터"
      >
        {poster && (
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(min-width: 1024px) 18rem, 16rem"
            className="object-cover"
            priority
          />
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.85) 20%, transparent)',
          }}
        />
        <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/70">
            Ticket Rush · Live
          </p>
          <div>
            <p className="text-white font-black text-base leading-tight drop-shadow line-clamp-2">
              {title}
            </p>
            {venueName && (
              <p className="text-white/50 text-xs mt-2 truncate">{venueName}</p>
            )}
            <p className="text-white/30 text-[11px] mt-0.5 font-mono-tabular">
              {isOpen ? '진행 중' : `오픈 ${opensAtLabel}`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyHero() {
  return (
    <section className="card p-8 text-center space-y-2">
      <h2 className="text-lg font-bold text-text">예정된 회차가 없습니다</h2>
      <p className="text-sm text-text-secondary">
        곧 새 회차가 오픈될 예정입니다. 잠시 후 다시 확인해 주세요.
      </p>
    </section>
  );
}

function SkeletonHero() {
  return (
    <section className="grid md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start animate-pulse">
      <div className="card p-6 sm:p-8 flex flex-col gap-5">
        <div className="space-y-2">
          <div className="h-3 w-32 rounded bg-bg-subtle" />
          <div className="h-6 w-3/4 rounded bg-bg-subtle" />
          <div className="h-3 w-40 rounded bg-bg-subtle" />
        </div>
        <div className="h-24 rounded-xl bg-bg-subtle" />
        <div className="h-10 rounded bg-bg-subtle" />
      </div>
      <div className="hidden md:block aspect-[3/4] rounded-xl bg-bg-subtle" />
    </section>
  );
}
