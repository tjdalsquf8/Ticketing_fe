'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { listEvents, type EventListItem } from '@/lib/events';
import { getAdminVenueOption } from '@/data/live';
import { safeHexColor, safeImageUrl } from '@/lib/safe';

/* ──────────────────────────────────────────
   다가오는 이벤트 — 소형 사이드 위젯
   ─ HomeLiveHero 우측 칼럼(데스크톱) / 히어로 아래(모바일)에 붙는다.
   ─ listEvents({ status:'scheduled', limit:2 }) — 실시간과 헷갈리지 않게 최소 정보만.
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
        const { data } = await listEvents({ status: 'scheduled', limit: 2 });
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

  // 이벤트는 자주 열리지 않는 도메인. 0개면 위젯 자체 숨김.
  if (items !== null && items.length === 0) return null;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
          다가오는 이벤트
        </p>
        <Link
          href="/event"
          className="text-[11px] font-semibold text-primary hover:underline shrink-0"
        >
          전체 →
        </Link>
      </div>

      <div className="space-y-2.5">
        {items === null
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 animate-pulse">
                <div className="w-11 h-11 rounded-md bg-bg-subtle shrink-0" />
                <div className="flex-1 space-y-1.5 py-0.5">
                  <div className="h-3 w-3/4 bg-bg-subtle rounded" />
                  <div className="h-2.5 w-1/2 bg-bg-subtle rounded" />
                </div>
              </div>
            ))
          : items.map((ev) => {
              const venue = getAdminVenueOption(ev.venueId);
              const posterUrl = safeImageUrl(venue?.posterImage);
              const opensAtMs = Date.parse(ev.opensAt);
              const remaining = Number.isFinite(opensAtMs)
                ? opensAtMs - Date.now()
                : 0;
              const countdown = formatCountdown(remaining);

              return (
                <Link
                  key={ev.eventId}
                  href={`/event/${ev.eventId}`}
                  className="flex items-center gap-2.5 group"
                >
                  <div
                    className="relative w-11 h-11 rounded-md overflow-hidden shrink-0"
                    style={{ backgroundColor: safeHexColor(ev.posterColor) }}
                  >
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={venue?.name ?? ev.title}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black text-white/90 select-none">
                          {ev.posterInitial || 'TR'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text truncate group-hover:text-primary transition-colors">
                      {ev.title}
                    </p>
                    <p className="text-[11px] text-text-tertiary font-mono-tabular">
                      오픈까지 {countdown}
                    </p>
                  </div>
                </Link>
              );
            })}
      </div>
    </div>
  );
}
