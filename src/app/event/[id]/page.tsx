import type { Metadata } from 'next';
import EventDetailClient from './EventDetailClient';

export const metadata: Metadata = { title: '이벤트 상세' };

/* ──────────────────────────────────────────
   /event/[id] — 이벤트 상세 (무료·유료 공용)
   ─ 실제 렌더는 EventDetailClient 에 위임 (카운트다운·CTA 상태를 위해 클라이언트)
   ────────────────────────────────────────── */

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventDetailClient eventId={id} />;
}
