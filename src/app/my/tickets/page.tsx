import type { Metadata } from 'next';
import MyTicketsClient from './MyTicketsClient';

export const metadata: Metadata = { title: '내 티켓' };

export default function MyTicketsPage() {
  return <MyTicketsClient />;
}
