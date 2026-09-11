import { NextResponse } from 'next/server';
import { getActiveBanners } from '@/lib/admin-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const banners = await getActiveBanners();
    return NextResponse.json(banners, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load banners' }, { status: 500 });
  }
}
