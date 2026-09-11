import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from '@/lib/admin-auth';

function isAdminLoginPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return normalized === '/admin/login';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') && !isAdminLoginPath(pathname)) {
    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const ok = await isValidAdminSessionToken(sessionToken);
    if (!ok) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
