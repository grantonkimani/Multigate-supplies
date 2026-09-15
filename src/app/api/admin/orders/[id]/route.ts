import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getOrders, updateOrderStatus } from '@/lib/admin-db';
import { sendOrderStatusEmail } from '@/lib/send-order-email';

export const runtime = 'nodejs';

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
    const existing = (await getOrders()).find((o) => o.id === id);
    const wasPaid =
      !!existing &&
      (existing.status === 'paid' ||
        existing.status === 'out_for_delivery' ||
        existing.status === 'delivered');
    const order = await updateOrderStatus(id, status);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let email_sent = false;
    let email_note = '';
    if (wasPaid && (status === 'out_for_delivery' || status === 'delivered')) {
      try {
        const result = await sendOrderStatusEmail(order, status);
        email_sent = result.sent;
        email_note = result.note;
      } catch (mailError) {
        console.error(mailError);
        email_note = 'Status saved, but the email could not be sent';
      }
    }

    return NextResponse.json({ ...order, email_sent, email_note });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update order';
    const status = message === 'Invalid status' ? 400 : 500;
    console.error(e);
    return NextResponse.json({ error: message }, { status });
  }
}
