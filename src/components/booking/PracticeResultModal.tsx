'use client';

/* ─────────────────────────────────────────────────────────
   PracticeResultModal — 연습 완료 팝업
   ─ 소요시간 + 상위%(누적 참여 세션 기준) 를 보여주는 결과 팝업
   ───────────────────────────────────────────────────────── */

interface Props {
  seat: string;
  elapsedMs: number;
  ranked: boolean;
  sessionRank: number | null;
  totalSessions: number | null;
  rankPercentile: number | null;
  onRetry: () => void;
  /** 지정 시 [랭킹 보러가기] 버튼 노출. */
  onViewRanking?: () => void;
}

export default function PracticeResultModal({
  seat,
  elapsedMs,
  ranked,
  sessionRank,
  totalSessions,
  rankPercentile,
  onRetry,
  onViewRanking,
}: Props) {
  const hasRank = ranked && sessionRank !== null && totalSessions !== null && rankPercentile !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-bg-surface rounded-2xl border border-border shadow-lg overflow-hidden">
        {/* 상단: 완료 배지 + 상위% 요약 바 */}
        <div className="px-6 pt-8 pb-6 text-center space-y-4 bg-gradient-to-b from-primary-subtle to-bg-surface">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary">
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-lg font-bold text-text">연습 완료!</p>

          {hasRank && (
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-surface px-4 py-2 text-sm shadow-xs">
              <span className="text-text-tertiary">상위</span>
              <span className="font-bold text-primary font-mono-tabular">
                {rankPercentile!.toFixed(1)}%
              </span>
              <span className="w-px h-3.5 bg-border" />
              <span className="text-text-secondary font-mono-tabular">
                {totalSessions}회 중 {sessionRank}위
              </span>
            </div>
          )}
        </div>

        {/* 하단: 소요 시간 + 좌석 */}
        <div className="px-6 pb-6 space-y-4">
          <div className="rounded-xl border border-border px-4 py-5 text-center">
            <p className="text-[11px] text-text-tertiary mb-1">소요 시간</p>
            <p className="text-3xl font-bold text-primary font-mono-tabular tracking-tight">
              {(elapsedMs / 1000).toFixed(3)}
              <span className="text-base font-semibold ml-1">s</span>
            </p>
          </div>

          <p className="text-xs text-text-tertiary text-center">
            좌석 <span className="font-mono-tabular font-semibold text-text-secondary">{seat}</span>
          </p>

          {!ranked && (
            <p className="text-xs text-warning-text text-center">
              다른 게스트가 먼저 사용한 닉네임이라 랭킹에 반영되지 않았습니다.
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm flex-1"
              onClick={onRetry}
            >
              다시 연습하기
            </button>
            {onViewRanking && (
              <button
                type="button"
                className="btn btn-solid btn-sm flex-1"
                onClick={onViewRanking}
              >
                랭킹 보러가기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
