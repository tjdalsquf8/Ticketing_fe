'use client';

import { useAuth } from '@/contexts/AuthContext';

/* ──────────────────────────────────────────
   TicketRankingRows — 티켓 누적 랭킹 tbody
   ─ 로그인 회원만 등재 (게스트는 티켓 획득 대상 X)
   ─ "나" 행 하이라이트 (닉네임 일치 기준)
   ────────────────────────────────────────── */

type TicketEntry = {
  rank: number;
  nickname: string;
  tickets: number;
};

const RANK_BADGE: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function TicketRankingRows({ rankings }: { rankings: TicketEntry[] }) {
  const { user } = useAuth();

  if (rankings.length === 0) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-12 text-center text-sm text-text-secondary">
          아직 티켓을 모은 회원이 없습니다.
        </td>
      </tr>
    );
  }

  return (
    <>
      {rankings.map((row, i) => {
        const isMe = !!user && row.nickname === user.name;
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
              {isMe && <span className="ml-2 text-xs text-primary font-semibold">(나)</span>}
            </td>
            <td className="px-4 py-3 text-right font-mono-tabular">
              <strong className="text-base text-text">{row.tickets}</strong>
              <span className="text-xs text-text-tertiary ml-1">매</span>
            </td>
          </tr>
        );
      })}
    </>
  );
}
