'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { listEvents, type EventListItem } from '@/lib/events';
import { getAdminVenueOption } from '@/data/live';
import { formatKstDateTime } from '@/lib/kst';
import { safeHexColor, safeImageUrl } from '@/lib/safe';
import { KR_CATEGORY_MAP } from '@/lib/adminEventValidation';

/* ──────────────────────────────────────────
   곧 오픈되는 이벤트 (가로 스크롤 카드 6개)
   ─ listEvents({ status:'scheduled', limit:6 })
   ─ opensAt ASC 는 서버 정렬
   ─ 카운트다운은 1초마다 tick
   ────────────────────────────────────────── */

function formatCountdown(ms: number): string {
  if (ms <= 0) return '오픈됨';
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86_400);
  if (days >= 1) {
    const hours = Math.floor((total % 86_400) / 3600);
    return `${days}일 ${String(hours).padStart(2, '0')}시간`;
  }
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function HomeUpcomingList() {
  const [items, setItems] = useState<EventListItem[] | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await listEvents({ status: 'scheduled', limit: 6 });
        if (!alive) return;
        setItems(data);
      } catch {
        if (!alive) return;
        setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // 이벤트는 자주 열리지 않는 도메인. 0개면 섹션 자체 숨김.
  if (items !== null && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-lg font-bold text-text">곧 오픈되는 티켓팅</h2>
          <p className="text-xs text-text-tertiary truncate">
            오픈 시간에 맞춰 실전 도전
          </p>
        </div>
        <Link
          href="/event"
          className="text-sm font-semibold text-primary hover:underline shrink-0"
        >
          전체 보기 →
        </Link>
      </div>

      {items === null ? (
        <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <ul className="flex gap-4 pb-1" style={{ width: 'max-content' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <div className="card w-64 shrink-0 overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-bg-subtle" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 bg-bg-subtle rounded" />
                    <div className="h-3 w-1/2 bg-bg-subtle rounded" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : items.length === 0 ? null : (
        <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <ul className="flex gap-4 pb-1" style={{ width: 'max-content' }}>
            {items.map((ev) => {
              const venue = getAdminVenueOption(ev.venueId);
              const posterUrl = safeImageUrl(venue?.posterImage);
              const opensAtMs = Date.parse(ev.opensAt);
              const remaining = Number.isFinite(opensAtMs)
                ? opensAtMs - Date.now()
                : 0;
              const countdown = formatCountdown(remaining);
              const categoryKr = KR_CATEGORY_MAP[ev.category] ?? ev.category;

              return (
                <li key={ev.eventId}>
                  <Link
                    href={`/event/${ev.eventId}`}
                    className="card overflow-hidden w-64 shrink-0 block hover:border-border-strong transition-colors group"
                  >
                    <div
                      className="aspect-[3/4] relative"
                      style={{ backgroundColor: safeHexColor(ev.posterColor) }}
                    >
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={venue?.name ?? ev.title}
                          fill
                          sizes="256px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl font-black text-white/90 leading-none select-none tracking-tight text-center px-4">
                            {ev.posterInitial || 'TR'}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-[10px] font-semibold text-white tracking-wide z-10">
                        {categoryKr}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur-sm z-10">
                        <span className="text-[10px] text-white/70 font-medium">
                          오픈까지
                        </span>
                        <span className="text-xs font-mono-tabular font-bold text-white">
                          {countdown}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-1">
                      <p className="text-sm font-bold text-text truncate group-hover:text-primary transition-colors">
                        {ev.title}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {venue?.name ?? ev.venueId}
                      </p>
                      <p className="text-xs text-text-tertiary pt-1 font-mono-tabular">
                        {formatKstDateTime(ev.opensAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
