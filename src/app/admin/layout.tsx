import type { ReactNode } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminGuard from '@/components/admin/AdminGuard';

/* ──────────────────────────────────────────
   /admin/* 공용 레이아웃
   ─ AdminGuard로 role=admin 확인 후에만 사이드바·컨텐츠 렌더
   ─ 1층: middleware.ts (accessToken 쿠키 유무)
   ─ 2층: AdminGuard (백엔드 admin 엔드포인트 probe)
   ─ 3층: 각 API 호출의 requireAdmin (최종 권위)
   ────────────────────────────────────────── */

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <AdminGuard>
        <div className="flex flex-col sm:flex-row gap-6">
          <AdminSidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </AdminGuard>
    </div>
  );
}
