'use client';

import { useAuth } from '@/contexts/AuthContext';

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

export default function RankingRows({
  rankings,
  showNickname = true,
}: {
  rankings: RankEntry[];
  /** false면 닉네임 열 자체를 숨긴다. "내 기록"처럼 모든 행이 본인일 때 사용. */
  showNickname?: boolean;
}) {
  const { user, guestNickname } = useAuth();

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
      {rankings.map((row, i) => {
        // 로그인 유저: 인증 뱃지가 있는 행 중 내 이름과 일치할 때만 "나"로 판정
        // (게스트가 같은 닉네임 써도 오탐 방지). 게스트: 미인증 행 중 내 게스트
        // 닉네임과 일치할 때 판정 (로그인 유저가 같은 닉네임 써도 오탐 방지).
        const isMe = showNickname && (user
          ? row.is_verified && row.nickname === user.name
          : !row.is_verified && !!guestNickname && row.nickname === guestNickname);
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
            {showNickname && (
              <td className="px-4 py-3">
                <span className={['font-medium', isMe ? 'text-primary' : 'text-text'].join(' ')}>
                  {row.nickname}
                </span>
                {row.is_verified && (
                  <span className="ml-2 badge badge-primary">인증</span>
                )}
                {isMe && <span className="ml-2 text-xs text-primary font-semibold">(나)</span>}
              </td>
            )}
            <td className="px-4 py-3 text-right font-mono-tabular font-bold text-text">
              {formatTime(row.best_ms)}
            </td>
          </tr>
        );
      })}
    </>
  );
}
