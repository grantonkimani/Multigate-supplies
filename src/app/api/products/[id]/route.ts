import { NextResponse } from 'next/server';
import { getActiveProductById } from '@/lib/admin-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await getActiveProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product, {
      headers: { 'Cache-Control': 'no-store, must-revalidate' },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}
