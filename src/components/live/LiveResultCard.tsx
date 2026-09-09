'use client';

import Link from 'next/link';

/* ─────────────────────────────────────────────
   LiveResultCard — 실시간 예매 확정 직후 뜨는 성공 팝업
   ─ 회차가 아직 진행 중일 수 있으므로 등수는 보여주지 않고,
     예매 성공 여부 + 소요 시간만 알려준 뒤 랭킹 페이지로 유도한다.
   ───────────────────────────────────────────── */

interface Props {
  /** 서버 확정 소요 시간(ms). */
  elapsedMs: number;
  /** 팝업 닫힘(배경 클릭/랭킹 보러가기 클릭) 시 sessionStorage 정리 등 상위 훅. */
  onLeave?: () => void;
}

export default function LiveResultCard({ elapsedMs, onLeave }: Props) {
  const timeStr = (elapsedMs / 1000).toFixed(3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onLeave}
    >
      <div
        className="w-full max-w-sm bg-bg-surface rounded-2xl border border-border shadow-lg p-8 space-y-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xl font-bold text-text">예매 성공!</p>
        <p className="text-sm text-text-secondary">
          소요 시간{' '}
          <span className="text-2xl font-bold text-primary font-mono-tabular">{timeStr}s</span>
        </p>
        <Link
          href="/live"
          onClick={onLeave}
          className="btn btn-solid w-full"
        >
          랭킹 보러가기
        </Link>
      </div>
    </div>
  );
}
