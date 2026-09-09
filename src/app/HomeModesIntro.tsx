import Link from 'next/link';

/* ──────────────────────────────────────────
   HomeModesIntro — 3가지 모드 소개 (비대칭 bento)
   ─ 좌: 실시간(오렌지) — 큰 강조 카드
   ─ 우: 연습(블루) / 이벤트(딥 뉴트럴) — 세로 스택
   ─ 색 계층: primary → info → neutral-dark 순으로 시선 유도
   ────────────────────────────────────────── */

const ICONS = {
  live: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="4" fill="currentColor" />
      <path
        d="M10 2a8 8 0 018 8h-2a6 6 0 00-6-6V2zm0 16a8 8 0 01-8-8h2a6 6 0 006 6v2z"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  ),
  practice: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 3a1 1 0 011-1h10a1 1 0 011 1v14a1 1 0 01-1.6.8L10 14l-4.4 3.8A1 1 0 014 17V3zm2 1v11l3.4-2.9a1 1 0 011.2 0L14 15V4H6z"
        fill="currentColor"
      />
    </svg>
  ),
  event: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 1l2.4 5.5 6 .5-4.5 4 1.4 5.9L10 13.8l-5.3 3.1L6.1 11 1.6 7l6-.5L10 1z"
        fill="currentColor"
      />
    </svg>
  ),
};

export default function HomeModesIntro() {
  return (
    <section aria-labelledby="modes-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="modes-heading" className="text-lg font-bold text-text">
          TicketRush 는 어떻게 즐기나요?
        </h2>
        <p className="text-xs text-text-tertiary hidden sm:block">
          목적별 3가지 모드
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* ── LIVE (강조 · 오렌지) ── */}
        <article
          className="md:col-span-3 relative overflow-hidden rounded-2xl border shadow-sm flex flex-col"
          style={{
            backgroundColor: 'var(--primary-subtle)',
            borderColor: 'var(--primary-border)',
          }}
        >
          {/* 상단 컬러 액센트 바 */}
          <div
            className="h-1 w-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
            aria-hidden
          />
          <div className="p-6 sm:p-7 flex-1 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-fore)',
                }}
              >
                {ICONS.live}
              </div>
              <span
                className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-fore)',
                }}
              >
                매 정각 · 무료
              </span>
            </div>

            <div className="space-y-2">
              <h3
                className="text-2xl font-black tracking-tight"
                style={{ color: 'var(--color-primary)' }}
              >
                실시간 티켓팅
              </h3>
              <p className="text-sm text-text leading-relaxed">
                매 정각에 열리는 무료 매치. 예고 없이 오픈되는 좌석을 가장
                빠르게 잡은 사람이 이깁니다.
              </p>
            </div>

            <ul
              className="space-y-2 border-t pt-4 mt-1"
              style={{ borderColor: 'var(--primary-border)' }}
            >
              {[
                '로그인·게스트 모두 참여 가능',
                '성공 상위 10명에게 티켓 자동 발급',
                '순위·소요 시간이 리더보드에 즉시 반영',
              ].map((p) => (
                <li
                  key={p}
                  className="text-sm text-text-secondary flex gap-2"
                >
                  <span
                    className="shrink-0 mt-0.5"
                    style={{ color: 'var(--color-primary)' }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-2">
              <Link href="/live" className="btn btn-solid">
                지금 참여
              </Link>
            </div>
          </div>
        </article>

        {/* ── 우: 연습 + 이벤트 세로 스택 ── */}
        <div className="md:col-span-2 grid grid-cols-1 gap-4">
          {/* PRACTICE (인포 블루) */}
          <article
            className="relative overflow-hidden rounded-2xl border shadow-sm flex flex-col"
            style={{
              backgroundColor: 'var(--info-bg)',
              borderColor: 'var(--info-border)',
            }}
          >
            <div
              className="h-1 w-full"
              style={{ backgroundColor: 'var(--info-tx)' }}
              aria-hidden
            />
            <div className="p-5 flex-1 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--info-tx)',
                    color: '#FFFFFF',
                  }}
                >
                  {ICONS.practice}
                </div>
                <span
                  className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border"
                  style={{
                    color: 'var(--info-tx)',
                    borderColor: 'var(--info-border)',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  언제든 · 무제한
                </span>
              </div>
              <div className="space-y-1">
                <h3
                  className="text-lg font-bold"
                  style={{ color: 'var(--info-tx)' }}
                >
                  연습 모드
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  실전과 동일한 좌석·플로우로 손을 풉니다. 감을 유지하고 싶을
                  때.
                </p>
              </div>
              <Link
                href="/practice"
                className="mt-auto text-sm font-bold hover:underline flex items-center gap-1"
                style={{ color: 'var(--info-tx)' }}
              >
                연습 시작 →
              </Link>
            </div>
          </article>

          {/* EVENT (딥 뉴트럴 = 프리미엄) */}
          <article
            className="relative overflow-hidden rounded-2xl border shadow-sm flex flex-col"
            style={{
              backgroundColor: '#0F172A',
              borderColor: '#0F172A',
            }}
          >
            <div
              className="h-1 w-full"
              style={{ backgroundColor: '#FBBF24' }}
              aria-hidden
            />
            <div className="p-5 flex-1 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: '#FBBF24',
                    color: '#0F172A',
                  }}
                >
                  {ICONS.event}
                </div>
                <span
                  className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: '#FBBF24',
                    color: '#0F172A',
                  }}
                >
                  사전 신청 · 무료
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                  이벤트
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: '#CBD5E1' }}
                >
                  드물게 열리는 대형 이벤트. 로그인 후 무료로 사전 신청한
                  사람만 참여합니다.
                </p>
              </div>
              <Link
                href="/event"
                className="mt-auto text-sm font-bold hover:underline flex items-center gap-1"
                style={{ color: '#FBBF24' }}
              >
                열린 이벤트 →
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
