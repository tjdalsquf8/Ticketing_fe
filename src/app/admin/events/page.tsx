import type { Metadata } from 'next';
import AdminEventsClient from './AdminEventsClient';

export const metadata: Metadata = { title: '이벤트 관리' };

/* /admin/events — 서버 컴포넌트는 메타데이터만, 실제 렌더링은 client에 위임 */

export default function AdminEventsPage() {
  return <AdminEventsClient />;
}
