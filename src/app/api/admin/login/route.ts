import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  resolveAdminPasswordHash,
} from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username : typeof body.email === 'string' ? body.email : '';
    const password = body.password;

    const adminUser = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
    const hash = resolveAdminPasswordHash(process.env.ADMIN_PASSWORD_HASH);

    if (!adminUser || !hash) {
      return NextResponse.json(
        { error: 'Admin login not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH in .env.local' },
        { status: 503 }
      );
    }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const userMatch = username.trim().toLowerCase() === adminUser.trim().toLowerCase();
    const passwordValid = await bcrypt.compare(password, hash);

    if (!userMatch || !passwordValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await createAdminSessionToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_MAX_AGE,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('Admin login error:', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
