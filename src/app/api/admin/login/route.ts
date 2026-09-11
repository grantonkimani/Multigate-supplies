import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminSessionToken } from '@/lib/admin-auth';

const SESSION_COOKIE = 'admin-session';
const MAX_AGE = 8 * 60 * 60; // 8 hours

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      return NextResponse.json(
        { error: 'Admin login not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH in .env.local' },
        { status: 503 }
      );
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const emailMatch = email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
    const passwordValid = await bcrypt.compare(password, adminPasswordHash);

    if (!emailMatch || !passwordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await createAdminSessionToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('Admin login error:', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
