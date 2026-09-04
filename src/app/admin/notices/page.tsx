import type { Metadata } from 'next';
import AdminNoticesClient from './AdminNoticesClient';

export const metadata: Metadata = { title: '공지사항' };

/* /admin/notices — 서버 컴포넌트는 메타데이터만, 실제 렌더링은 client에 위임 */

export default function AdminNoticesPage() {
  return <AdminNoticesClient />;
}
