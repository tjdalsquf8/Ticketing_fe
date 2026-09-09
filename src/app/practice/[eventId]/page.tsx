import type { Metadata } from 'next';
import Link from 'next/link';
import { PRACTICE_EVENTS } from '@/data/practice';
import PracticeDetailClient from './PracticeDetailClient';

/* ──────────────────────────────────────────
   /practice/[eventId] — 연습 이벤트 상세
   ────────────────────────────────────────── */

function findEvent(eventId: string) {
  return PRACTICE_EVENTS.find((e) => String(e.eventId) === eventId) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = findEvent(eventId);
  return { title: event ? event.title.replace('[연습] ', '') : '연습 모드' };
}

export default async function PracticeDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = findEvent(eventId);

  if (!event) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <div className="card p-8 text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-text">연습 이벤트를 찾을 수 없습니다</h1>
            <p className="text-sm text-text-secondary">
              요청하신 연습 이벤트가 존재하지 않습니다. 목록에서 다시 선택해 주세요.
            </p>
          </div>
          <Link href="/practice" className="btn btn-solid inline-flex">
            이벤트 목록으로
          </Link>
        </div>
      </div>
    );
  }

  return <PracticeDetailClient key={event.eventId} event={event} />;
}
