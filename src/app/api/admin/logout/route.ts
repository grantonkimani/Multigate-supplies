import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  const res = NextResponse.redirect(url);
  res.cookies.set('admin-session', '', { maxAge: 0, path: '/' });
  return res;
}
