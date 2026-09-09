'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PRACTICE_EVENTS } from '@/data/practice';

/* ──────────────────────────────────────────────────────────
   연습 모드 — 이벤트 선택 화면
   ────────────────────────────────────────────────────────── */

export default function PracticeClient() {
  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-text-secondary uppercase mb-3">
            연습 모드 · 무료 체험
          </p>
          <h1 className="text-3xl font-bold text-text tracking-tight">이벤트를 선택하세요</h1>
          <p className="mt-2 text-sm text-text-secondary">
            원하는 공연을 선택하고 실전과 동일한 티켓팅을 연습해보세요.
          </p>
        </div>

        {/* 이벤트 카드 그리드 — 모바일은 가로 스크롤(카드 고정폭이라 확대·화질저하 없음), sm 이상은 3열 그리드 */}
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible scrollbar-hide">
        <div className="flex sm:grid sm:grid-cols-3 gap-4 sm:gap-6 pb-1 sm:pb-0 w-max sm:w-auto">
          {PRACTICE_EVENTS.map(event => (
            <Link
              key={event.id}
              href={`/practice/${event.eventId}`}
              className="group cursor-pointer shrink-0 w-64 sm:w-auto"
            >
              {/* 포스터 */}
              <div
                className="relative w-full rounded-xl overflow-hidden mb-3"
                style={{ aspectRatio: '3/4', background: event.posterBg }}
              >
                <Image
                  src={event.posterImage}
                  alt={event.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 256px, 33vw"
                />
                {/* 하단 페이드 */}
                <div
                  className="absolute inset-x-0 bottom-0 h-2/3 z-10"
                  style={{ background: `linear-gradient(to top, rgba(0,0,0,0.85) 20%, transparent)` }}
                />
                {/* 텍스트 */}
                <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between">
                  <p
                    className="text-[9px] font-bold tracking-[0.3em] uppercase"
                    style={{ color: event.posterAccent }}
                  >
                    Ticket Rush · Practice
                  </p>
                  <div>
                    <p className="text-white font-black text-lg leading-tight drop-shadow">
                      {event.title.replace('[연습] ', '')}
                    </p>
                    <p className="text-white/60 text-xs mt-2">{event.venueName}</p>
                    <p className="text-white/40 text-[11px] mt-0.5">{event.period}</p>
                  </div>
                </div>
              </div>

              {/* 카드 하단 */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-text leading-snug">
                    {event.title.replace('[연습] ', '')}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{event.venueName}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{event.period}</p>
                </div>
                <span className="text-sm font-semibold text-primary shrink-0 group-hover:underline mt-0.5">
                  선택 →
                </span>
              </div>
            </Link>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
