import type { Metadata } from 'next';
import AdminGifticonsClient from './AdminGifticonsClient';

export const metadata: Metadata = { title: '기프티콘 재고' };

/* /admin/gifticons — 서버 컴포넌트는 메타데이터만, 실제 렌더링은 client에 위임 */

export default function AdminGifticonsPage() {
  return <AdminGifticonsClient />;
}
