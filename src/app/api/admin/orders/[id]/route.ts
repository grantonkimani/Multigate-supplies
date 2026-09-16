import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getOrders, updateOrderStatus, deleteOrder } from '@/lib/admin-db';
import { sendOrderStatusEmail } from '@/lib/send-order-email';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

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
    const order = await updateOrderStatus(id, status);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const notify =
      status === 'paid' || status === 'out_for_delivery' || status === 'delivered'
        ? (status as 'paid' | 'out_for_delivery' | 'delivered')
        : null;

    let email_sent = false;
    let email_note = '';
    if (notify && existing?.status !== notify) {
      try {
        const result = await sendOrderStatusEmail(order, notify);
        email_sent = result.sent;
        email_note = result.note;
      } catch (mailError) {
        console.error(mailError);
        email_note =
          mailError instanceof Error
            ? `Status saved, but the email could not be sent (${mailError.message})`
            : 'Status saved, but the email could not be sent';
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing order id' }, { status: 400 });
  try {
    const deleted = await deleteOrder(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
