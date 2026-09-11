import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { updateOrderStatus } from '@/lib/admin-db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing order id' }, { status: 400 });
  try {
    const body = await request.json();
    const status = typeof body.status === 'string' ? body.status.trim() : '';
    const order = await updateOrderStatus(id, status);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update order';
    const status = message === 'Invalid status' ? 400 : 500;
    console.error(e);
    return NextResponse.json({ error: message }, { status });
  }
}
