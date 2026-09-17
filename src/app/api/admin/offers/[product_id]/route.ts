import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { deleteOffer, setOfferActive } from '@/lib/admin-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ product_id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { product_id } = await params;
  if (!product_id) return NextResponse.json({ error: 'Invalid product_id' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  if (typeof body?.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active boolean required' }, { status: 400 });
  }

  try {
    const offer = await setOfferActive(product_id, body.is_active);
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    return NextResponse.json(offer);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update offer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ product_id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { product_id } = await params;
  if (!product_id) return NextResponse.json({ error: 'Invalid product_id' }, { status: 400 });

  try {
    const deleted = await deleteOffer(product_id);
    if (!deleted) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete offer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

