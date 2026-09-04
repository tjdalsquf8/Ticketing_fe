'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ──────────────────────────────────────────
   AdminSidebar — 관리자 좌측 네비게이션
   ─ 서브패스 매칭으로 active 하이라이트
   ────────────────────────────────────────── */

const NAV = [
  { href: '/admin',             label: '대시보드',     exact: true  },
  { href: '/admin/live',        label: '실시간 관리',  exact: false },
  { href: '/admin/events',      label: '이벤트 관리',  exact: false },
  { href: '/admin/gifticons',   label: '기프티콘 재고', exact: false },
  { href: '/admin/settlements', label: '정산 이력',    exact: false },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full sm:w-56 shrink-0">
      <div className="card p-2 sticky top-20">
        <p className="px-3 pt-2 pb-3 text-xs font-bold text-text-tertiary tracking-wider uppercase">
          Admin
        </p>
        <nav>
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, exact }) => {
              const active = exact
                ? pathname === href
                : pathname === href || pathname.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={[
                      'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary-subtle text-primary'
                        : 'text-text-secondary hover:bg-bg-subtle hover:text-text',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
