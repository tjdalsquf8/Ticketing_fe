'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, ROUTES } from '@/lib/api';
import { ApiError } from '@/lib/errors';

/**
 * 관리자 UI 심층 방어(2/3층).
 * 1층: middleware.ts (accessToken 쿠키 유무 — 없으면 곧장 404, 로그인 유도 없음)
 * 2층: 이 컴포넌트 — 백엔드 admin 엔드포인트 probe로 실제 role=admin 확인
 * 3층: 각 API 호출마다 백엔드 requireAdmin (최종 권위)
 *
 * role != admin 인 모든 경우(비로그인 포함) 는 /login 이 아니라 404 로 통일한다.
 * /admin 라우트가 실재한다는 정보 자체를 노출하지 않기 위함.
 *
 * probe 대상은 이미 존재하는 admin 전용 엔드포인트로,
 * 성공(200) → admin, 403(NOT_ADMIN) → 일반 유저, 401 → 세션 만료.
 */

type Status = 'checking' | 'allowed' | 'forbidden';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setStatus('forbidden');
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
        // probe 대상(/admin/live/config)은 인가 통과 후 비즈니스 로직 에러도
        // 던질 수 있다(예: LIVE_CONFIG_NOT_INITIALIZED). 403이 아닌 응답을
        // 받았다는 것 자체가 이미 백엔드 requireAdmin을 통과했다는 뜻이므로
        // allowed 처리한다. 401은 apiFetch 내부에서 forceLogout 처리되고,
        // 네트워크 실패(status 0)만 판별 불가로 방어적으로 forbidden 처리.
        if (
          err instanceof ApiError &&
          err.status !== 403 &&
          err.status !== 401 &&
          err.status !== 0
        ) {
          setStatus('allowed');
        } else {
          setStatus('forbidden');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  if (isLoading || status === 'checking') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-text-tertiary text-sm">
        권한 확인 중…
      </div>
    );
  }

  if (status === 'forbidden') {
    // 일반 유저에게 "권한 없음" 대신 404를 보여줘 /admin 라우트 존재 자체를 숨긴다.
    notFound();
  }

  return <>{children}</>;
}
