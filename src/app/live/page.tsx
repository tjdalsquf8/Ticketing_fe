import type { Metadata } from 'next';
import LiveClient from './LiveClient';

export const metadata: Metadata = { title: '실시간 이벤트' };

export default function LivePage() {
  return <LiveClient />;
}
