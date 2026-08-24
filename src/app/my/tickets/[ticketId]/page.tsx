import type { Metadata } from 'next';
import TicketDetailClient from './TicketDetailClient';

export const metadata: Metadata = { title: '티켓 상세' };

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <TicketDetailClient ticketId={ticketId} />;
}
