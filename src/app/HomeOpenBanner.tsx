'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listEvents, type EventListItem } from '@/lib/events';
import { getAdminVenueOption } from '@/data/live';

/* ──────────────────────────────────────────
   지금 오픈 진행 중인 이벤트 배너
   ─ 결과 0개면 섹션 자체 렌더 스킵
   ─ 여러 개면 리스트로 노출
   ────────────────────────────────────────── */

export default function HomeOpenBanner() {
  const [items, setItems] = useState<EventListItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await listEvents({ status: 'open', limit: 5 });
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

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-text opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-danger-text" />
        </span>
        <h2 className="text-xl font-bold text-text">지금 오픈 중</h2>
        <span className="text-xs text-text-secondary">
          · {items.length}개 이벤트 진행 중
        </span>
      </div>

      <ul className="space-y-2.5">
        {items.map((ev) => {
          const venue = getAdminVenueOption(ev.venueId);
          return (
            <li key={ev.eventId}>
              <Link
                href={`/event/${ev.eventId}`}
                className="block rounded-xl border border-primary bg-primary-subtle px-5 py-4 hover:brightness-95 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-danger-text bg-white/60 px-1.5 py-0.5 rounded tracking-wider">
                        진행 중
                      </span>
                      <span className="text-[11px] font-semibold text-primary tracking-wide">
                        {ev.category === 'concert' && '콘서트'}
                        {ev.category === 'musical' && '뮤지컬'}
                        {ev.category === 'sports' && '스포츠'}
                        {ev.category === 'theater' && '연극'}
                        {ev.category === 'festival' && '페스티벌'}
                      </span>
                    </div>
                    <p className="text-base font-bold text-text mt-1.5 truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {venue?.name ?? ev.venueId} · 총 {ev.totalSeats.toLocaleString()}석
                    </p>
                  </div>
                  <span className="btn btn-solid btn-sm shrink-0">바로 참여 →</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
