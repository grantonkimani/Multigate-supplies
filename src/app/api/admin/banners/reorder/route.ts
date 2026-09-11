import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { reorderBanners } from '@/lib/admin-db';

export async function POST(request: NextRequest) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.some((x: unknown) => typeof x !== 'string')) {
      return NextResponse.json({ error: 'ids must be an array of banner ids' }, { status: 400 });
    }
    const banners = await reorderBanners(ids as string[]);
    return NextResponse.json(banners);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to reorder banners' }, { status: 500 });
  }
}
