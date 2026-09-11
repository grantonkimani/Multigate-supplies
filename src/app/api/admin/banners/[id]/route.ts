import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { updateBanner, deleteBanner } from '@/lib/admin-db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const body = await request.json();
    const input: Parameters<typeof updateBanner>[1] = {};
    if (body && typeof body === 'object') {
      if (typeof body.title === 'string') input.title = body.title.trim();
      if (body.image_url !== undefined) input.image_url = body.image_url === null || body.image_url === '' ? null : String(body.image_url);
      if (body.link_url !== undefined) input.link_url = body.link_url === null || body.link_url === '' ? null : String(body.link_url);
      if (typeof body.sort_order === 'number') input.sort_order = body.sort_order;
      if (typeof body.is_active === 'boolean') input.is_active = body.is_active;
    }
    const banner = await updateBanner(id, input);
    if (!banner) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    return NextResponse.json(banner);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const deleted = await deleteBanner(id);
  if (!deleted) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
