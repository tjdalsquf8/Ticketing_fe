'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, ROUTES } from '@/lib/api';
import { ApiError } from '@/lib/errors';

/**
 * 관리자 UI 심층 방어(2/3층).
 * 1층: middleware.ts (accessToken 쿠키 유무)
 * 2층: 이 컴포넌트 — 백엔드 admin 엔드포인트 probe로 실제 role=admin 확인
 * 3층: 각 API 호출마다 백엔드 requireAdmin (최종 권위)
 *
 * probe 대상은 이미 존재하는 admin 전용 엔드포인트로,
 * 성공(200) → admin, 403(NOT_ADMIN) → 일반 유저, 401 → 세션 만료.
 */

type Status = 'checking' | 'allowed' | 'forbidden';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login?next=/admin');
      return;
    }

    // 백엔드 role 필드가 추후 도입되면 이 단축 경로가 활성화된다.
    if (user.role && user.role !== 'admin') {
      setStatus('forbidden');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiFetch(ROUTES.admin.liveConfig);
        if (!cancelled) setStatus('allowed');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setStatus('forbidden');
        } else {
          // 401은 apiFetch 내부에서 forceLogout 처리. 그 외 네트워크 오류는
          // 방어적으로 forbidden 처리해 UI 노출 자체를 막는다.
          setStatus('forbidden');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, user, router]);

  if (isLoading || status === 'checking') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-text-tertiary text-sm">
        권한 확인 중…
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-lg font-semibold">접근 권한이 없습니다</h1>
        <p className="text-sm text-text-tertiary">
          관리자만 열람할 수 있는 페이지입니다.
        </p>
        <Link
          href="/"
          className="text-sm text-primary underline underline-offset-4"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
