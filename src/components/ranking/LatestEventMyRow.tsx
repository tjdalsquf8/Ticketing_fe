'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { LatestEventRankingEntry } from '@/lib/events';

/* ──────────────────────────────────────────
   LatestEventMyRow
   ─ 서버 컴포넌트가 준 rankings 에서 내(로그인 유저) 항목을 찾아
     상단 하이라이트 카드로 보여준다. 종료 직후 결과 확인 UX.
   ─ 게스트 오탐 방지: 닉네임 완전 일치 + 로그인 상태 조건.
   ─ 참여 안 한 경우 렌더 없음.
   ────────────────────────────────────────── */

function formatMs(ms: number) {
  return (ms / 1000).toFixed(3) + 's';
}

export default function LatestEventMyRow({
  rankings,
}: {
  rankings: LatestEventRankingEntry[];
}) {
  const { user } = useAuth();
  if (!user) return null;

  const mine = rankings.find((r) => r.nickname === user.name);
  if (!mine) return null;

  return (
    <div className="rounded-lg border border-primary bg-primary-subtle px-5 py-4 flex items-center gap-4">
      <div className="text-2xl font-black font-mono-tabular text-primary shrink-0 w-14 text-center">
        #{mine.rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text">
          내 결과 · <span className="font-mono-tabular">{mine.seatLabel}</span>
        </p>
        <p className="text-[11px] text-text-secondary">
          좌석 확정 순위와 소요 시간입니다.
        </p>
      </div>
      <div className="font-mono-tabular font-bold text-lg text-primary shrink-0">
        {formatMs(mine.elapsedMs)}
      </div>
    </div>
  );
}
