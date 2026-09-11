import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getBanners, createBanner } from '@/lib/admin-db';

export async function GET() {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const banners = await getBanners();
    return NextResponse.json(banners);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load banners' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const title = body?.title;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const banner = await createBanner({
      title: title.trim(),
      image_url: typeof body.image_url === 'string' ? body.image_url.trim() || null : undefined,
      link_url: typeof body.link_url === 'string' ? body.link_url.trim() || null : undefined,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : undefined,
    });
    return NextResponse.json(banner);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Failed to create banner';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
