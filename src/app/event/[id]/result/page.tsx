import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '예매 결과' };

/* ──────────────────────────────────────────
   예매 결과 화면 — 성공 / 실패
   RESULT_STATE를 'success' | 'fail' 로 전환하여 확인
   ────────────────────────────────────────── */
const RESULT_STATE: 'success' | 'fail' = 'success';

const TICKET = {
  serial: '#TR-20260801-00017',
  event:  '스타벅스 아메리카노 이벤트',
  nickname: '스피드킹',
  elapsed: '0.721s',
  successAt: '2026.08.01 12:00:00.721',
  expiresAt: '2027.08.01',
};

export default function EventResultPage() {
  if (RESULT_STATE === 'fail') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center gap-6">
        <div className="w-14 h-14 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center text-2xl">
          ✕
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-text">이번엔 아쉽게 실패했어요</h1>
          <p className="text-sm text-text-secondary">
            선착순 {100}명이 모두 채워졌습니다. 연습 모드로 다음을 준비해보세요.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link href="/practice" className="btn btn-solid flex-1">연습 모드 가기</Link>
          <Link href="/"         className="btn btn-neutral flex-1">다음 이벤트 보기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-6">

      {/* 성공 헤더 */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success-bg border border-success-border text-2xl mx-auto">
          ✓
        </div>
        <h1 className="text-xl font-bold text-text">예매에 성공했어요!</h1>
        <p className="text-sm text-text-secondary">
          아래 티켓이 발급되었습니다. 10매 모으면 기프티콘으로 교환할 수 있어요.
        </p>
      </div>

      {/* 티켓 카드 */}
      <div className="card p-6 space-y-5">
        {/* 티켓 헤더 */}
        <div className="flex items-start justify-between">
          <span className="badge badge-success">예매 성공</span>
          <span className="text-xs text-text-tertiary font-mono-tabular">{TICKET.serial}</span>
        </div>

        {/* 이벤트명 */}
        <div>
          <p className="text-xs text-text-tertiary">이벤트</p>
          <p className="text-base font-bold text-text mt-0.5">{TICKET.event}</p>
        </div>

        {/* 메타 정보 */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-text-tertiary">닉네임</p>
            <p className="text-sm font-semibold text-text mt-1">{TICKET.nickname}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">소요 시간</p>
            <p className="text-sm font-bold text-primary font-mono-tabular mt-1">{TICKET.elapsed}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">성공 일시</p>
            <p className="text-sm text-text mt-1">{TICKET.successAt}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">유효 기간</p>
            <p className="text-sm text-text mt-1">{TICKET.expiresAt}</p>
          </div>
        </div>

        {/* 워터마크 */}
        <p className="text-xs text-text-tertiary text-center pt-1 border-t border-border">
          본 티켓은 {TICKET.nickname}님 전용이며 양도 시 효력이 없습니다.
        </p>
      </div>

      {/* 로그인 유도 배너 (비로그인 시) */}
      <div className="card p-4 bg-bg-subtle flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text">티켓을 영구 저장하려면 로그인하세요</p>
          <p className="text-xs text-text-secondary mt-0.5">
            비로그인 상태에서는 24시간 후 자동 삭제됩니다.
          </p>
        </div>
        <button className="btn btn-solid btn-sm shrink-0">로그인</button>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button className="btn btn-neutral flex-1">티켓 다운로드</button>
        <Link href="/" className="btn btn-outline flex-1">홈으로</Link>
      </div>

    </div>
  );
}
