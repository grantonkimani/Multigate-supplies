import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for an admin route (but not login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Temporary developer mode: allow admin pages without login.
    const bypass = process.env.ADMIN_BYPASS_AUTH;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const looksLikeBcryptHash =
      typeof adminPasswordHash === 'string' && /^\$2[aby]\$/.test(adminPasswordHash);
    const shouldBypass =
      bypass === 'true' ||
      bypass === '1' ||
      // If the admin password hash isn't configured yet (or is still a placeholder), let devs work.
      (process.env.NODE_ENV !== 'production' && (!adminPasswordHash || !looksLikeBcryptHash));
    if (shouldBypass) {
      return NextResponse.next();
    }

    const sessionToken = request.cookies.get('admin-session')?.value;

    // If no session token, redirect to login
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Validate the JWT token
    try {
      const { payload } = await jwtVerify(sessionToken, getJwtSecretKey());
      
      // Check if token is for admin user
      if (payload.type !== 'admin') {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }

      // Check token expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }

      // Token is valid, allow request to continue
    } catch (error) {
      // Token is invalid, redirect to login
      console.error('JWT verification failed in middleware:', error);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - API routes are now protected individually
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
