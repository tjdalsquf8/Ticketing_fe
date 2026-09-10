'use client';

type RankRow = {
  rank: number;
  /** 리더보드에서만 내려온다. "내 기록" 응답에는 없음. */
  nickname?: string;
  best_ms: number;
  is_verified: boolean;
};

const RANK_BADGE: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatTime(ms: number) {
  return (ms / 1000).toFixed(3) + 's';
}

export default function RankingRows({
  rankings,
  showNickname = true,
}: {
  rankings: RankRow[];
  /** false면 닉네임 열 자체를 숨긴다. "내 기록"처럼 모든 행이 본인일 때 사용. */
  showNickname?: boolean;
}) {
  if (rankings.length === 0) {
    return (
      <tr>
        <td colSpan={showNickname ? 3 : 2} className="px-4 py-12 text-center text-sm text-text-secondary">
          아직 기록이 없습니다.
        </td>
      </tr>
    );
  }

  return (
    <>
      {rankings.map((row, i) => (
        <tr key={`${row.rank}-${i}`} className="transition-colors hover:bg-bg-subtle">
          <td className="px-4 py-3 font-mono-tabular font-semibold text-text-secondary">
            {RANK_BADGE[row.rank] ?? row.rank}
          </td>
          {showNickname && (
            <td className="px-4 py-3">
              <span className="font-medium text-text">{row.nickname}</span>
              {row.is_verified && (
                <span className="ml-2 badge badge-primary">인증</span>
              )}
            </td>
          )}
          <td className="px-4 py-3 text-right font-mono-tabular font-bold text-text">
            {formatTime(row.best_ms)}
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * 리더보드 하단에 고정으로 붙는 "내 순위" 행.
 * 리더보드는 상위 100명까지만 내려오므로, 그 밖의 순위인 사용자도 자기 위치를
 * 볼 수 있도록 GET /rankings/me/best 결과를 따로 렌더한다.
 */
export function MyRankingRow({
  entry,
  showNickname = true,
}: {
  entry: RankRow;
  showNickname?: boolean;
}) {
  return (
    <tr className="bg-primary-subtle border-t-2 border-primary">
      <td className="px-4 py-3 font-mono-tabular font-semibold text-primary">
        {entry.rank}
      </td>
      {showNickname && (
        <td className="px-4 py-3">
          <span className="font-medium text-primary">{entry.nickname}</span>
          {entry.is_verified && (
            <span className="ml-2 badge badge-primary">인증</span>
          )}
          <span className="ml-2 text-xs text-primary font-semibold">(나)</span>
        </td>
      )}
      <td className="px-4 py-3 text-right font-mono-tabular font-bold text-primary">
        {formatTime(entry.best_ms)}
      </td>
    </tr>
  );
}
