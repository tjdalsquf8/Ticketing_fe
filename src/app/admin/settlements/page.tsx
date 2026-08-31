import type { Metadata } from 'next';
import AdminSettlementsClient from './AdminSettlementsClient';

export const metadata: Metadata = { title: '정산 이력' };

/* /admin/settlements — 서버 컴포넌트는 메타데이터만, 실제 렌더링은 client에 위임 */

export default function AdminSettlementsPage() {
  return <AdminSettlementsClient />;
}
