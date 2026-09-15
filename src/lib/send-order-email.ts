import nodemailer from 'nodemailer';
import type { Order } from './types';

export function isNotifyEmail(email: string | null | undefined): boolean {
  if (!email || !email.includes('@')) return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.endsWith('@whatsapp.order')) return false;
  return true;
}

function deliveryLabel(status: string): string {
  if (status === 'out_for_delivery') return 'out for delivery';
  if (status === 'delivered') return 'delivered';
  return status;
}

export async function sendOrderStatusEmail(
  order: Order,
  status: 'out_for_delivery' | 'delivered'
): Promise<{ sent: boolean; note: string }> {
  if (!isNotifyEmail(order.customer_email)) {
    return { sent: false, note: 'No customer email on this order' };
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  if (!host || !user || !pass || !from) {
    return { sent: false, note: 'Email is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)' };
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const items = (order.items ?? [])
    .map((item) => `${item.product_name} × ${item.quantity}`)
    .join(', ');
  const heading =
    status === 'out_for_delivery'
      ? 'Your order is out for delivery'
      : 'Your order has been delivered';
  const body =
    status === 'out_for_delivery'
      ? `Hi ${order.customer_name},\n\nYour Multigate Medical Supplies order is now out for delivery.\n\nOrder ID: ${order.id}\nItems: ${items}\nTotal: KES ${Number(order.total).toLocaleString()}\n\nThank you.`
      : `Hi ${order.customer_name},\n\nYour Multigate Medical Supplies order has been marked as delivered.\n\nOrder ID: ${order.id}\nItems: ${items}\nTotal: KES ${Number(order.total).toLocaleString()}\n\nThank you for shopping with us.`;

  await transporter.sendMail({
    from,
    to: order.customer_email.trim(),
    subject: `Multigate: ${heading}`,
    text: body,
  });

  return { sent: true, note: `Email sent for ${deliveryLabel(status)}` };
}
