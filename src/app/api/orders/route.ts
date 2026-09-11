import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/admin-db';
import type { OrderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer_name = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
    const customer_phone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : '';
    const customer_email = typeof body.customer_email === 'string' ? body.customer_email.trim() : '';
    const shipping_address = typeof body.shipping_address === 'string' ? body.shipping_address.trim() : '';
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!customer_name || !customer_phone || !shipping_address) {
      return NextResponse.json({ error: 'Name, phone, and delivery details are required' }, { status: 400 });
    }
    if (!rawItems.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const items: OrderItem[] = [];
    for (const row of rawItems) {
      const product_id = String(row?.product_id ?? '');
      const product_name = String(row?.product_name ?? '').trim();
      const quantity = Math.max(1, parseInt(String(row?.quantity ?? 1), 10) || 1);
      const unit_price = Number(row?.unit_price);
      if (!product_id || !product_name || !Number.isFinite(unit_price) || unit_price < 0) {
        return NextResponse.json({ error: 'Invalid cart items' }, { status: 400 });
      }
      items.push({
        product_id,
        product_name,
        quantity,
        unit_price,
        total: unit_price * quantity,
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const order = await createOrder({
      customer_name,
      customer_email: customer_email || `${customer_phone}@whatsapp.order`,
      customer_phone,
      shipping_address,
      items,
      subtotal,
      total: subtotal,
      status: 'pending',
    });

    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
}
