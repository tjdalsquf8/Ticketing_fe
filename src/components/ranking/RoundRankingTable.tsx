'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import RankingRows, { MyRankingRow } from './RankingRows';
import { RANK_HEAD_CELL, RANK_SCROLL_HEIGHT } from './rankingShell';
import {
  getRoundRankings,
  hasMoreRoundRankings,
  type RoundRankEntry,
} from '@/lib/liveRankings';

/**
 * 회차 단위 랭킹 테이블 (tbody 내용물). 부모는 table/thead 껍데기만 그린다.
 *
 * 누적 랭킹용 RankingTable 과 달리 첫 페이지도 스스로 불러온다 — 회차 id 가
 * 정해지는 시점이 부모의 current/last-round 조회 이후라 부모가 미리 받아둘 수 없다.
 * 회차가 바뀌면 부모가 key 를 바꿔 통째로 리마운트시킨다.
 *
 * `me` 는 페이지 범위 밖이어도 항상 내려오므로 목록 행과 중복될 수 있다.
 * 목록에서 걸러내는 대신 하단 고정 행으로 분리해 둔다 (누적 랭킹과 동일한 관용구).
 */
export default function RoundRankingTable({ roundId }: { roundId: number }) {
  const [rows, setRows] = useState<RoundRankEntry[]>([]);
  const [me, setMe] = useState<RoundRankEntry | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  const loadPage = useCallback(
    async (nextPage: number) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        const res = await getRoundRankings(roundId, nextPage);
        setRows((prev) => (nextPage === 1 ? res.rows : [...prev, ...res.rows]));
        setMe(res.me);
        setPage(nextPage);
        setHasMore(hasMoreRoundRankings(nextPage, res.rows.length, res.totalCount));
      } catch {
        setHasMore(false);
        if (nextPage === 1) setFailed(true);
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [roundId],
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    if (page === 0 || !hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadPage(page + 1);
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasMore, loading, loadPage]);

  if (page === 0) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-12 text-center text-sm text-text-tertiary">
          {failed ? '랭킹을 불러오지 못했습니다.' : '불러오는 중…'}
        </td>
      </tr>
    );
  }

  return (
    <>
      <RankingRows
        rankings={rows.map((r) => ({
          rank: r.rank,
          nickname: r.nickname,
          best_ms: r.elapsed_ms,
          is_verified: r.is_verified,
        }))}
      />
      {hasMore && (
        <tr ref={sentinelRef}>
          <td colSpan={3} className="px-4 py-4 text-center text-xs text-text-tertiary">
            {loading ? '불러오는 중…' : ' '}
          </td>
        </tr>
      )}
      {me && (
        <MyRankingRow
          entry={{
            rank: me.rank,
            nickname: me.nickname,
            best_ms: me.elapsed_ms,
            is_verified: me.is_verified,
          }}
        />
      )}
    </>
  );
}

/**
 * 카드 + 테이블 껍데기까지 포함한 회차 랭킹 섹션. 회차 상세 페이지처럼 이 랭킹
 * 하나만 놓는 화면에서 쓴다. /live 랜딩은 누적 랭킹과 table 껍데기를 공유하므로
 * RoundRankingTable 을 직접 tbody 안에 넣는다.
 */
export function RoundRankingSection({
  roundId,
  title = '이번 회차 순위',
  description,
}: {
  roundId: number;
  title?: string;
  description?: string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text">{title}</h2>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>
      <div className="card overflow-hidden">
        {/* 목록만 고정 높이로 스크롤 — 헤더/내 순위 행은 위아래 고정 */}
        <div className={`${RANK_SCROLL_HEIGHT} overflow-y-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className={`${RANK_HEAD_CELL} text-left px-4 py-3 text-xs font-semibold text-text-secondary w-12 whitespace-nowrap`}>순위</th>
                <th className={`${RANK_HEAD_CELL} text-left px-4 py-3 text-xs font-semibold text-text-secondary`}>닉네임</th>
                <th className={`${RANK_HEAD_CELL} text-right px-4 py-3 text-xs font-semibold text-text-secondary`}>소요 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <RoundRankingTable roundId={roundId} />
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
