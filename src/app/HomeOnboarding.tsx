'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/* ──────────────────────────────────────────
   HomeOnboarding — 게스트 온보딩 (비대칭 flow)
   ─ 좌: 3-step 세로 flow (연결선으로 리듬 부여)
   ─ 우: CTA 요약 패널 (primary-subtle 강조)
   ─ 로그인 유저에겐 노출하지 않음.
   ────────────────────────────────────────── */

interface Step {
  no: number;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const STEPS: Step[] = [
  {
    no: 1,
    title: '연습 모드로 손 풀기',
    description:
      '실전 전 좌석 클릭 감각을 익히세요. 결과는 연습 랭킹에 반영됩니다.',
    href: '/practice',
    cta: '연습 시작',
  },
  {
    no: 2,
    title: '실전 티켓팅 참여',
    description:
      '매 정각 무료 라이브 회차 또는 사전 신청 이벤트에 도전하세요.',
    href: '/live',
    cta: '실시간 참여',
  },
  {
    no: 3,
    title: '리더보드에서 순위 확인',
    description:
      '소요 시간·티켓 누적 랭킹으로 다른 도전자와 실력을 비교하세요.',
    href: '/ranking',
    cta: '랭킹 보기',
  },
];

export default function HomeOnboarding() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return null;

  return (
    <section aria-labelledby="onboarding-heading" className="space-y-4">
      <div>
        <h2 id="onboarding-heading" className="text-xl font-bold text-text">
          티켓 러시가 처음이신가요?
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          3단계면 충분해요. 지금 시작해 보세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* 좌: 세로 flow (연결선) */}
        <ol className="md:col-span-3 relative">
          {/* 좌측 세로 연결선 */}
          <div
            className="absolute left-[15px] top-4 bottom-4 w-px bg-border-strong hidden sm:block"
            aria-hidden
          />
          <div className="space-y-3">
            {STEPS.map((step) => (
              <li key={step.no} className="relative">
                <Link
                  href={step.href}
                  className="group flex items-start gap-4 rounded-2xl border border-border bg-bg-surface shadow-sm p-4 sm:p-5 hover:border-border-strong hover:shadow-md transition-all"
                >
                  {/* 스텝 넘버 (연결선과 겹치도록) */}
                  <span
                    className="relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-black shrink-0 shadow-sm"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {step.no}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-text">
                      {step.title}
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed mt-1">
                      {step.description}
                    </p>
                  </div>
                  <span
                    className="text-sm font-semibold text-primary shrink-0 self-center hidden sm:inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </div>
        </ol>

        {/* 우: CTA 요약 패널 */}
        <aside
          className="md:col-span-2 relative overflow-hidden rounded-2xl border shadow-sm p-6 flex flex-col justify-between gap-6"
          style={{
            backgroundColor: 'var(--primary-subtle)',
            borderColor: 'var(--primary-border)',
          }}
        >
          <div
            className="absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-15"
            style={{ backgroundColor: 'var(--color-primary)' }}
            aria-hidden
          />
          <div className="relative space-y-3">
            <p
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--color-primary)' }}
            >
              가장 빠른 시작
            </p>
            <p className="text-lg font-black text-text leading-snug">
              계정 없이도
              <br />
              연습·실시간 참여
              <br />
              가능해요.
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              게스트로 감을 익힌 뒤, 순위·티켓 누적을 남기고 싶을 때 가입하면
              충분합니다.
            </p>
          </div>
          <div className="relative flex flex-col gap-2">
            <Link href="/practice" className="btn btn-solid w-full justify-center">
              연습으로 시작
            </Link>
            <Link
              href="/signup"
              className="btn btn-outline btn-sm w-full justify-center"
            >
              계정 만들기
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
