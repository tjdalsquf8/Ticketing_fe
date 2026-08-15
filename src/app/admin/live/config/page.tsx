import type { Metadata } from 'next';
import AdminLiveConfigClient from '@/components/admin/AdminLiveConfigClient';

export const metadata: Metadata = { title: '라이브 공연 설정' };

export default function AdminLiveConfigPage() {
  return <AdminLiveConfigClient />;
}
