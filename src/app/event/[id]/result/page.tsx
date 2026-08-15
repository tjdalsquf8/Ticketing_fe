import type { Metadata } from 'next';
import Link from 'next/link';
import { getMockEvent } from '@/data/mockEvents';

export const metadata: Metadata = { title: '이벤트 결과' };

/* ──────────────────────────────────────────
   /event/[id]/result — 이벤트 결과
   ─ live: TOP 10 · 성공 시 티켓 1매 지급 (회원만)
   ─ paid: TOP 3  · 성공 시 기프티콘 즉시 지급
   ────────────────────────────────────────── */

// 뼈대 mock — 실제로는 GET /events/:id/results 와 /events/:id/results/me
const MY_RESULT = {
  isSuccess: true,
  rank: 3,
  elapsedMs: 8342,
  nickname: '시골쥐',
  isMember: true,
};

const TOP_RANKINGS = [
  { rank: 1,  nickname: '조성민', elapsedMs: 4523, isMe: false },
  { rank: 2,  nickname: '낭낭',   elapsedMs: 5102, isMe: false },
  { rank: 3,  nickname: '시골쥐', elapsedMs: 8342, isMe: true  },
  { rank: 4,  nickname: '빅뱅',   elapsedMs: 9014, isMe: false },
  { rank: 5,  nickname: '구구',   elapsedMs: 10231, isMe: false },
  { rank: 6,  nickname: '강쥐',   elapsedMs: 11402, isMe: false },
  { rank: 7,  nickname: '사자',   elapsedMs: 12118, isMe: false },
  { rank: 8,  nickname: '하냥',   elapsedMs: 13502, isMe: false },
  { rank: 9,  nickname: '별이',   elapsedMs: 14001, isMe: false },
  { rank: 10, nickname: '햇살',   elapsedMs: 15234, isMe: false },
];

const RANK_BADGE: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatMs(ms: number) {
  return (ms / 1000).toFixed(3) + 's';
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getMockEvent(id);
  const isPaid = event.type === 'paid';
  const topN = isPaid ? 3 : 10;
  const rewardLabel = isPaid ? '기프티콘' : '티켓';

  const isSuccess = MY_RESULT.isSuccess;
  const rankedIn = isSuccess && MY_RESULT.rank <= topN;
  // 게스트가 live 이벤트 순위 안에 들면 티켓 지급 대상은 아님 (회원 전용)
  const rewardEligible = rankedIn && (isPaid ? true : MY_RESULT.isMember);

  const rankings = TOP_RANKINGS.slice(0, topN);

  // ── 실패 케이스 ────────────────────────────────────────
  if (!isSuccess) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 space-y-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-danger-text" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-text">이번엔 아쉽게 실패했어요</h1>
          <p className="text-sm text-text-secondary">
            좌석이 모두 매진되었거나 진행 시간이 종료되었습니다.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/live" className="btn btn-neutral flex-1">실시간 이벤트</Link>
          <Link href="/practice" className="btn btn-solid flex-1">연습으로 이동</Link>
        </div>
      </div>
    );
  }

  // ── 성공 케이스 ────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* 헤더 */}
      <header className="text-center space-y-3">
        <div className={[
          'mx-auto w-14 h-14 rounded-full flex items-center justify-center border',
          rankedIn
            ? 'bg-success-bg border-success-border'
            : 'bg-bg-subtle border-border',
        ].join(' ')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={rankedIn ? 'text-success-text' : 'text-text-secondary'} aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text">
            {rankedIn ? `TOP ${topN} 진입!` : '예매에 성공했어요'}
          </h1>
          <p className="text-sm text-text-secondary">
            {event.category} · {event.title}
          </p>
        </div>
      </header>

      {/* 내 성적 */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-tertiary">내 순위</p>
            <p className="mt-1 font-mono-tabular">
              <strong className="text-3xl text-text">{MY_RESULT.rank}</strong>
              <span className="text-sm text-text-secondary ml-1">위</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">소요 시간</p>
            <p className="mt-1 font-mono-tabular font-bold text-3xl text-primary">
              {formatMs(MY_RESULT.elapsedMs)}
            </p>
          </div>
        </div>

        {/* 지급 결과 */}
        <div className={[
          'rounded-lg px-4 py-3 border text-sm',
          rewardEligible
            ? 'bg-success-bg border-success-border text-success-text'
            : rankedIn && !rewardEligible
            ? 'bg-warning-bg border-warning-border text-warning-text'
            : 'bg-bg-subtle border-border text-text-secondary',
        ].join(' ')}>
          {rewardEligible ? (
            isPaid ? (
              <span>🎁 <strong>기프티콘 지급 완료</strong> · 마이페이지에서 코드를 확인하세요</span>
            ) : (
              <span>🎟 <strong>티켓 1매 지급 완료</strong> · 리더보드 순위에 반영됩니다</span>
            )
          ) : rankedIn && !rewardEligible ? (
            <span>회원으로 참여했다면 <strong>티켓 1매</strong>가 지급됐어요. 회원가입하고 다음 기회를 노려보세요.</span>
          ) : (
            <span>TOP {topN} 안에 들어야 {rewardLabel}이 지급됩니다. 다음 이벤트에 도전해보세요.</span>
          )}
        </div>
      </div>

      {/* TOP N 순위 */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-text">TOP {topN}</h2>
          <p className="text-xs text-text-tertiary">소요 시간 순위</p>
        </div>

        <ol className="card divide-y divide-border overflow-hidden">
          {rankings.map((row) => (
            <li
              key={row.rank}
              className={[
                'flex items-center gap-4 px-5 py-3.5 transition-colors',
                row.isMe ? 'bg-primary-subtle' : '',
              ].join(' ')}
            >
              <span className="w-8 text-center font-mono-tabular font-semibold text-text-secondary">
                {RANK_BADGE[row.rank] ?? row.rank}
              </span>
              <span className={[
                'flex-1 text-sm font-medium truncate',
                row.isMe ? 'text-primary' : 'text-text',
              ].join(' ')}>
                {row.nickname}
                {row.isMe && <span className="ml-2 text-xs font-semibold">(나)</span>}
              </span>
              <span className="font-mono-tabular font-bold text-text">
                {formatMs(row.elapsedMs)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* 게스트 유도 (live + 회원 아닐 때만) */}
      {!isPaid && !MY_RESULT.isMember && rankedIn && (
        <div className="card p-5 bg-primary-subtle border-primary-border flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-text">티켓을 놓치셨어요</p>
            <p className="text-xs text-text-secondary mt-0.5">
              회원가입하면 다음 이벤트부터 순위 등재 · 티켓 획득이 가능합니다.
            </p>
          </div>
          <Link href="/signup" className="btn btn-solid btn-sm shrink-0">
            회원가입
          </Link>
        </div>
      )}

      {/* 액션 */}
      <div className="flex gap-2">
        <Link href="/ranking" className="btn btn-neutral flex-1">리더보드</Link>
        {rewardEligible && isPaid && (
          <Link href="/my" className="btn btn-outline flex-1">기프티콘 확인</Link>
        )}
        <Link href={isPaid ? '/event' : '/live'} className="btn btn-solid flex-1">
          다음 이벤트
        </Link>
      </div>

    </div>
  );
}
