'use client';

import Link from 'next/link';

/* ─────────────────────────────────────────────
   LiveResultCard — 라이브 예매 후 티켓 미발급 결과 화면
   ─ (2) 회원 && TOP10 밖: 아쉬움 안내 + 다음 회차 유도
   ─ (3) 게스트: 회원가입 유도 (강조)
   ───────────────────────────────────────────── */

interface Props {
  /** 서버 확정 순위. null 이면 표시 생략 (에러 방어). */
  rankNumber: number | null;
  /** 서버 확정 소요 시간(ms). */
  elapsedMs: number;
  /** 좌석 라벨. 결과 카드 최상단에 표기. */
  seatLabel: string;
  /**
   * 사용자 분기:
   * - 'member-missed': 회원이지만 TOP10 밖 (ticketId 없음)
   * - 'guest':         비로그인 (ticketId 항상 없음)
   */
  variant: 'member-missed' | 'guest';
  /**
   * 게스트 && rankNumber<=10 인 경우, "회원이었다면 티켓이 발급됐어요" 문구 강조.
   * BookingFlow/RoundDetailClient 가 rankNumber 로 판정해 넘긴다.
   */
  wouldHaveBeenTicketed?: boolean;
  /** [다른 회차 보기]/[회원가입] 클릭 시 sessionStorage 정리 등 상위 훅. */
  onLeave?: () => void;
}

export default function LiveResultCard({
  rankNumber,
  elapsedMs,
  seatLabel,
  variant,
  wouldHaveBeenTicketed = false,
  onLeave,
}: Props) {
  const timeStr = (elapsedMs / 1000).toFixed(3);
  const isGuest = variant === 'guest';

  return (
    <div className="card p-8 space-y-6 max-w-xl mx-auto">
      {/* 상단 결과 배지 + 좌석 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="badge badge-neutral">결과</span>
        <span className="text-xs text-text-secondary">
          좌석{' '}
          <span className="font-mono-tabular font-semibold text-text">{seatLabel}</span>
        </span>
      </div>

      {/* 순위 + 소요 시간 */}
      <div className="text-center space-y-2 py-4 border-y border-border">
        {rankNumber !== null ? (
          <p className="text-4xl font-bold text-text">
            <span className="text-primary font-mono-tabular">#{rankNumber}</span>
            <span className="text-lg font-normal text-text-secondary ml-2">위</span>
          </p>
        ) : (
          <p className="text-2xl font-semibold text-text-secondary">순위 확인 불가</p>
        )}
        <p className="text-sm text-text-secondary">
          소요 시간{' '}
          <span className="font-mono-tabular text-text font-semibold">{timeStr}s</span>
        </p>
      </div>

      {/* 안내 문구 (분기별) */}
      {isGuest ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3">
            <p className="text-sm font-semibold text-warning-text">
              게스트는 티켓 대상이 아닙니다
            </p>
            <p className="text-xs text-warning-text mt-1 leading-relaxed">
              회원가입하면 다음부터 티켓을 받을 수 있어요.
            </p>
          </div>
          {wouldHaveBeenTicketed && (
            <div className="rounded-lg border border-primary bg-bg-subtle px-4 py-3">
              <p className="text-sm font-semibold text-primary">
                회원이었다면 티켓이 발급됐어요
              </p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                TOP 10 안에 드셨습니다. 지금 가입하고 다음 회차에 도전해 보세요.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-bg-subtle px-4 py-3">
          <p className="text-sm font-semibold text-text">
            이번엔 아쉽게 티켓을 놓쳤어요
          </p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            TOP 10 안에 들면 자동 발급됩니다. 다음 회차에 다시 도전해 주세요.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-2">
        {isGuest ? (
          <>
            <Link
              href="/signup"
              onClick={onLeave}
              className="btn btn-solid flex-1"
            >
              회원가입
            </Link>
            <Link
              href="/live"
              onClick={onLeave}
              className="btn btn-outline flex-1"
            >
              다른 회차 보기
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/live"
              onClick={onLeave}
              className="btn btn-solid flex-1"
            >
              다른 회차 보기
            </Link>
            <Link
              href="/my/tickets"
              onClick={onLeave}
              className="btn btn-outline flex-1"
            >
              내 티켓 보기
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
