'use client';

import { useEffect, useRef, useState } from 'react';
import RankingRows, { MyRankingRow } from './RankingRows';
import {
  getRankings,
  getMyRankings,
  getMyBestRanking,
  hasMoreRankings,
  type RankEntry,
  type MyRankEntry,
  type RankingMode,
  type RankingPeriod,
} from '@/lib/rankings';

/**
 * 무한스크롤 랭킹 테이블 (tbody 내용물). 최초 1페이지는 부모가 이미 불러온
 * initialRows 로 받고, 이후 페이지는 하단 sentinel row가 보일 때 자체적으로
 * 불러와 append한다. tab/period/이벤트가 바뀌면 부모가 key를 바꿔 컴포넌트를
 * 통째로 리마운트시키는 방식으로 리셋한다(RoundDetail 등에서 쓰는 관용구와 동일).
 *
 * 전체 랭킹 탭에서는 목록 아래에 "내 순위" 행을 따로 고정 표시한다. 리더보드
 * 응답에는 식별자가 없어서 목록에서 내 행을 골라낼 수 없고, 애초에 상위 100명
 * 까지만 내려오므로 그 밖의 순위는 목록에 나타나지도 않기 때문이다.
 */
export default function RankingTable({
  mode,
  period,
  eventId,
  myRankings = false,
  initialRows,
  showNickname = true,
}: {
  mode: RankingMode;
  period: RankingPeriod;
  eventId?: number;
  myRankings?: boolean;
  initialRows: (RankEntry | MyRankEntry)[];
  showNickname?: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(hasMoreRankings(1, initialRows.length));
  const [loadingMore, setLoadingMore] = useState(false);
  const [myBest, setMyBest] = useState<RankEntry | null>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  // 전체 랭킹 탭에서만 내 순위를 따로 조회한다 ("내 기록" 탭은 전부 본인 기록이라 불필요).
  // 실패는 조용히 무시 — 하단 고정 행이 안 뜰 뿐 목록 자체는 정상 동작해야 한다.
  useEffect(() => {
    if (myRankings) return;
    let cancelled = false;
    getMyBestRanking({ mode, period, eventId })
      .then((entry) => {
        if (!cancelled) setMyBest(entry);
      })
      .catch(() => {
        if (!cancelled) setMyBest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, period, eventId, myRankings]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        const fetcher = myRankings ? getMyRankings : getRankings;
        fetcher({ mode, period, eventId, page: nextPage })
          .then((next) => {
            setRows((prev) => [...prev, ...next]);
            setPage(nextPage);
            setHasMore(hasMoreRankings(nextPage, next.length));
          })
          .catch(() => setHasMore(false))
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, mode, period, eventId, myRankings]);

  return (
    <>
      <RankingRows rankings={rows} showNickname={showNickname} />
      {hasMore && (
        <tr ref={sentinelRef}>
          <td colSpan={showNickname ? 3 : 2} className="px-4 py-4 text-center text-xs text-text-tertiary">
            {loadingMore ? '불러오는 중…' : ' '}
          </td>
        </tr>
      )}
      {myBest && <MyRankingRow entry={myBest} showNickname={showNickname} />}
    </>
  );
}
