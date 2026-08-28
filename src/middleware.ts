import { NextResponse, type NextRequest } from 'next/server';

/**
 * /admin/*, /my/* 1차 방어선 — accessToken 또는 refreshToken 쿠키 중
 * 하나라도 있으면 진입을 허용하는 "관용 판정" 모드.
 *
 * accessToken TTL(1h)이 refreshToken TTL(수 일)보다 훨씬 짧기 때문에,
 * 로그인 상태로 브라우저를 켜둔 사용자가 1시간 뒤 새로고침하면
 * accessToken만 소실된 상태가 흔하다. 이때 미들웨어가 accessToken 존재만
 * 보고 리다이렉트하면, 페이지가 열리지도 않아 apiFetch / AuthContext의
 * 자동 refresh 흐름(401 → POST /api/auth/refresh → 재시도)이 발동할
 * 기회조차 얻지 못한다 → 억울한 /login?next=… 튕김.
 *
 * 따라서 여기서는 refreshToken 존재 여부까지 함께 검사하고, 둘 다 없을
 * 때에만 로그인 필요가 명확하다고 판정한다. 실제 인증·refresh는 페이지
 * 로드 이후 apiFetch(401 자동 재시도) + AuthContext(마운트 시 users/me
 * 검증)가 담당하는 심층 방어 구조를 유지한다.
 *
 * 백엔드 인가(NOT_ADMIN 403)와 <AdminGuard>·마이페이지 useEffect 리다이렉트도
 * 그대로 남는다.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isProtected =
    pathname.startsWith('/admin') || pathname.startsWith('/my');

  if (isProtected) {
    const hasAccess = req.cookies.has('accessToken');
    const hasRefresh = req.cookies.has('refreshToken');
    if (!hasAccess && !hasRefresh) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.search = '';
      loginUrl.searchParams.set('next', pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/my/:path*'],
};
