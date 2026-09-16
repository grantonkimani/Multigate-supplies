import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProducts, createProduct } from '@/lib/admin-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const products = await getProducts();
  return NextResponse.json(products, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const { category_id, name, description, price, image_url, image_urls, stock_quantity } = body;
    if (!category_id || !name || typeof price !== 'number') {
      return NextResponse.json({ error: 'category_id, name, and price required' }, { status: 400 });
    }
    const product = await createProduct({
      category_id,
      name: String(name).trim(),
      description: description != null ? String(description) : undefined,
      price: Number(price),
      image_url: image_url ?? null,
      image_urls: Array.isArray(image_urls) ? image_urls : null,
      stock_quantity: typeof stock_quantity === 'number' ? stock_quantity : 0,
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Failed to create product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
