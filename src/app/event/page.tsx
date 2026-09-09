import type { Metadata } from 'next';
import { Suspense } from 'react';
import EventListClient from './EventListClient';

export const metadata: Metadata = { title: '이벤트' };

/* ──────────────────────────────────────────
   /event — 이벤트 목록 (서버)
   ─ 실제 인터랙션은 EventListClient (캘린더 + 리스트)
   ─ 백엔드 미연결. 목데이터는 클라이언트에 소유됨
   ────────────────────────────────────────── */

export default function EventListPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="h-6 w-32 bg-bg-subtle rounded animate-pulse mb-4" />
          <div className="h-64 bg-bg-subtle rounded-xl animate-pulse" />
        </div>
      }
    >
      <EventListClient />
    </Suspense>
  );
}
