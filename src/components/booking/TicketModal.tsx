'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TicketCard, { type TicketData } from './TicketCard';

/* ─────────────────────────────────────────────
   TicketModal — 가로형 콘서트 티켓 오버레이
   순수 티켓 마크업은 TicketCard 로 분리했고, 이 컴포넌트는
   풀스크린 배경 + 하단 CTA 버튼 셋만 담당한다.
   ───────────────────────────────────────────── */

export type { TicketData } from './TicketCard';

interface Props extends TicketData {
  onClose:  () => void;
  /**
   * practice 모드에서만 사용. live 모드에서는 넘기지 않아도 되며 하단 버튼 셋도 다르다.
   */
  onRetry?: () => void;
  /**
   * 좌측 상단 캡션 및 하단 버튼 세트 결정.
   * - 'practice' (default): "PRACTICE MODE" · [다시하기][순위 보러가기]
   * - 'live': "LIVE MODE"     · [내 티켓 보기][다른 회차 보기] (또는 커스텀)
   */
  mode?: 'practice' | 'live';
  /** 하단 primary 버튼 커스터마이징. mode='live' 기본: '내 티켓 보기' → '/my/tickets'. */
  primaryLabel?: string;
  primaryHref?: string;
  /** 하단 secondary(outline) 버튼 커스터마이징. mode='live' 기본: '다른 회차 보기' → '/live'. */
  secondaryLabel?: string;
  secondaryHref?: string;
}

export default function TicketModal(props: Props) {
  const { onClose, onRetry,
          mode = 'practice',
          primaryLabel, primaryHref, secondaryLabel, secondaryHref,
          ...ticketData } = props;
  const isLive = mode === 'live';

  const router = useRouter();

  const handleGoToRanking = () => {
    onClose();
    // Router Cache 무효화 후 이동 — 방금 등록된 세션이 즉시 반영되도록
    router.refresh();
    router.push('/ranking');
  };

  // live 모드 기본 링크
  const livePrimaryLabel = primaryLabel ?? '내 티켓 보기';
  const livePrimaryHref  = primaryHref  ?? '/my/tickets';
  const liveSecondaryLabel = secondaryLabel ?? '다른 회차 보기';
  const liveSecondaryHref  = secondaryHref  ?? '/live';

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      // 배경 클릭·상단 닫기 버튼으로 실수 종료 방지 — 하단 액션 버튼(다시하기/순위/저장)만으로 이탈 가능
    >
      {/* ── 티켓 카드 ── */}
      <TicketCard {...ticketData} mode={mode} notchColor="rgba(0,0,0,0.85)" />

      {/* ── 하단 버튼 줄 ── */}
      <div className="flex items-center gap-3 w-full" style={{ maxWidth: 700 }}>
        {isLive ? (
          <>
            {/* 내 티켓 보기 (primary) */}
            <Link
              href={livePrimaryHref}
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#E85D00', color: '#FFFFFF', border: '1px solid #E85D00' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
              {livePrimaryLabel}
            </Link>

            {/* 다른 회차 보기 (secondary outline) */}
            <Link
              href={liveSecondaryHref}
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m13 6 6 6-6 6"/></svg>
              {liveSecondaryLabel}
            </Link>
          </>
        ) : (
          <>
            {/* 다시하기 */}
            <button
              type="button"
              onClick={onRetry}
              disabled={!onRetry}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              다시하기
            </button>

            {/* 순위보러가기 */}
            <button
              type="button"
              onClick={handleGoToRanking}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              순위 보러가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
