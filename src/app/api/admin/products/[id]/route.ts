import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { updateProduct, deleteProduct } from '@/lib/admin-db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json();
    const product = await updateProduct(id, {
      category_id: typeof body.category_id === 'string' ? body.category_id : undefined,
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      description: body.description,
      price: body.price != null && body.price !== '' ? Number(body.price) : undefined,
      image_url: body.image_url,
      image_urls: body.image_urls,
      stock_quantity:
        body.stock_quantity != null && body.stock_quantity !== ''
          ? Number(body.stock_quantity)
          : undefined,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
    });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
  try {
    const deleted = await deleteProduct(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
