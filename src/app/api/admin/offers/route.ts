import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getOffersAdminRows, upsertOffersForProducts } from '@/lib/admin-db';

export async function GET() {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await getOffersAdminRows();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Bulk apply endpoint kept separate, but allow POST for convenience.
  const body = await request.json().catch(() => ({}));
  const product_ids = Array.isArray(body.product_ids) ? body.product_ids : [];
  const offer_price = typeof body.offer_price === 'number' ? body.offer_price : Number(body.offer_price);

  if (!product_ids.length || !Number.isFinite(offer_price)) {
    return NextResponse.json({ error: 'product_ids and offer_price required' }, { status: 400 });
  }

  try {
    const offers = await upsertOffersForProducts({
      product_ids: product_ids.map((x: unknown) => String(x)),
      offer_price,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
    });
    return NextResponse.json(offers);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to apply offers' }, { status: 400 });
  }
}

