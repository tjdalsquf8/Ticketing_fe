import type { Metadata } from 'next';
import RoundDetailClient from './RoundDetailClient';

export const metadata: Metadata = { title: '실시간 회차 상세' };

// Next.js 15+ App Router: params 는 Promise 로 전달됨.
export default async function LiveRoundPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  return <RoundDetailClient roundId={roundId} />;
}
