'use client';

import { useEffect, useRef, useState } from 'react';
import RankingRows from './RankingRows';
import {
  getRankings,
  getMyRankings,
  hasMoreRankings,
  type RankEntry,
  type RankingMode,
  type RankingPeriod,
} from '@/lib/rankings';

/**
 * 무한스크롤 랭킹 테이블 (tbody 내용물). 최초 1페이지는 부모가 이미 불러온
 * initialRows 로 받고, 이후 페이지는 하단 sentinel row가 보일 때 자체적으로
 * 불러와 append한다. tab/period/이벤트가 바뀌면 부모가 key를 바꿔 컴포넌트를
 * 통째로 리마운트시키는 방식으로 리셋한다(RoundDetail 등에서 쓰는 관용구와 동일).
 */
export default function RankingTable({
  mode,
  period,
  eventId,
  myRankings = false,
  initialRows,
}: {
  mode: RankingMode;
  period: RankingPeriod;
  eventId?: number;
  myRankings?: boolean;
  initialRows: RankEntry[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(hasMoreRankings(1, initialRows.length));
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLTableRowElement>(null);

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
      <RankingRows rankings={rows} />
      {hasMore && (
        <tr ref={sentinelRef}>
          <td colSpan={3} className="px-4 py-4 text-center text-xs text-text-tertiary">
            {loadingMore ? '불러오는 중…' : ' '}
          </td>
        </tr>
      )}
    </>
  );
}
