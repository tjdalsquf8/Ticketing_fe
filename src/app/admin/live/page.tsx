import type { Metadata } from 'next';
import AdminLiveClient from '@/components/admin/AdminLiveClient';

export const metadata: Metadata = { title: '실시간 관리' };

export default function AdminLivePage() {
  return <AdminLiveClient />;
}
