import Link from 'next/link';

/* ──────────────────────────────────────────
   HomeWelcomeHero — 첫 화면 상단 환영 카피
   ─ 정보 밀도 낮게. 여백 · 큰 타이포 · 명확한 CTA 2개.
   ─ 방문자가 "무슨 서비스인지" 3초 안에 파악하도록.
   ────────────────────────────────────────── */

export default function HomeWelcomeHero() {
  return (
    <section className="pt-2 pb-1 sm:pt-4 sm:pb-2">
      <div className="max-w-3xl space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-4xl font-black text-text leading-tight tracking-tight">
          빠른 손이 이깁니다.{' '}
          <span className="text-primary">TicketRush</span> 에서 훈련하세요.
        </h1>

        <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl">
          실전과 동일한 좌석·큐·홀드 플로우로 연습하고, 매 정각 열리는 무료
          실시간 매치에서 실력을 겨루세요. 상위 도전자에게는 실물 티켓·상품 지급.
        </p>

        <div className="flex flex-wrap gap-2">
          <Link href="/live" className="btn btn-solid btn-sm">
            지금 실시간 참여
          </Link>
          <Link href="/practice" className="btn btn-outline btn-sm">
            처음이라면 연습부터
          </Link>
        </div>
      </div>
    </section>
  );
}
