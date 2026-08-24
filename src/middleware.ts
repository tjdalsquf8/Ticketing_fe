import { NextResponse, type NextRequest } from 'next/server';

/**
 * /admin/*, /my/* 1차 방어선 — accessToken 쿠키 미보유 시 즉시 /login 리다이렉트.
 * 백엔드 인가(NOT_ADMIN 403)와 클라이언트 <AdminGuard> / 마이페이지 useEffect 리다이렉트는
 * 별도 심층 방어. 미들웨어 단계에서 페이지 HTML/JS 다운로드 자체를 차단해
 * 스켈레톤 노출/자원 낭비를 줄인다.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isProtected =
    pathname.startsWith('/admin') || pathname.startsWith('/my');

  if (isProtected) {
    const hasAuthCookie = req.cookies.has('accessToken');
    if (!hasAuthCookie) {
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
