import nodemailer from 'nodemailer';
import type { Order } from './types';

export const MAIL_FROM_DEFAULT = 'Multigate Medical Supplies <multigatemedicalsupplies@gmail.com>';
export const MAIL_USER_DEFAULT = 'multigatemedicalsupplies@gmail.com';

export type NotifyStatus = 'paid' | 'out_for_delivery' | 'delivered';

export function isNotifyEmail(email: string | null | undefined): boolean {
  if (!email || !email.includes('@')) return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.endsWith('@whatsapp.order')) return false;
  return true;
}

function deliveryLabel(status: NotifyStatus): string {
  if (status === 'paid') return 'payment received';
  if (status === 'out_for_delivery') return 'out for delivery';
  return 'delivered';
}

function mailCopy(order: Order, status: NotifyStatus) {
  const items = (order.items ?? [])
    .map((item) => `${item.product_name} × ${item.quantity}`)
    .join(', ');
  const total = `KES ${Number(order.total).toLocaleString()}`;
  const details = `Order ID: ${order.id}\nItems: ${items || '—'}\nTotal: ${total}`;

  if (status === 'paid') {
    return {
      subject: 'Multigate: Payment received — thank you',
      body: `Hi ${order.customer_name},\n\nThank you for your payment. We have confirmed it for your Multigate Medical Supplies order.\n\n${details}\n\nWe will prepare your order for delivery.\n\nThank you for shopping with us.\nMultigate Medical Supplies`,
    };
  }
  if (status === 'out_for_delivery') {
    return {
      subject: 'Multigate: Your order is out for delivery',
      body: `Hi ${order.customer_name},\n\nYour Multigate Medical Supplies order is now out for delivery.\n\n${details}\n\nThank you.`,
    };
  }
  return {
    subject: 'Multigate: Your order has been delivered',
    body: `Hi ${order.customer_name},\n\nYour Multigate Medical Supplies order has been marked as delivered.\n\n${details}\n\nThank you for shopping with us.`,
  };
}

export async function sendOrderStatusEmail(
  order: Order,
  status: NotifyStatus
): Promise<{ sent: boolean; note: string }> {
  if (!isNotifyEmail(order.customer_email)) {
    return { sent: false, note: 'No customer email on this order' };
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER || MAIL_USER_DEFAULT;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || MAIL_FROM_DEFAULT;
  if (!pass) {
    return { sent: false, note: 'Email is not configured (set SMTP_PASS for Gmail)' };
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const { subject, body } = mailCopy(order, status);
  await transporter.sendMail({
    from,
    to: order.customer_email.trim(),
    subject,
    text: body,
  });

  return { sent: true, note: `Email sent for ${deliveryLabel(status)}` };
}
