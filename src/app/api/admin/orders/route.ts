import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getOrders } from '@/lib/admin-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orders = await getOrders();
  return NextResponse.json(orders);
}
