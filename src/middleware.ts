import { NextResponse, type NextRequest } from 'next/server';

/**
 * /admin/* 1차 방어선 — accessToken 쿠키 미보유 시 즉시 /login 리다이렉트.
 * 백엔드 인가(NOT_ADMIN 403)와 클라이언트 <AdminGuard>는 별도 심층 방어.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
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
  matcher: ['/admin/:path*'],
};
