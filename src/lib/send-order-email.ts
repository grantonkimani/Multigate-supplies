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

function mailErrorNote(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const compact = message.replace(/\s+/g, ' ').slice(0, 180);
  return `Status saved, but the email could not be sent (${compact})`;
}

function resolveSmtpSettings() {
  const host = 'smtp.gmail.com';
  const user = MAIL_USER_DEFAULT;
  const pass = (process.env.SMTP_PASS || '').replace(/[\s"']+/g, '');
  const from = MAIL_FROM_DEFAULT;
  return { host, user, pass, from };
}

function transporter(host: string, user: string, pass: string, port: number) {
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
}

export async function sendOrderStatusEmail(
  order: Order,
  status: NotifyStatus
): Promise<{ sent: boolean; note: string }> {
  if (!isNotifyEmail(order.customer_email)) {
    return { sent: false, note: 'No customer email on this order' };
  }

  const { host, user, pass, from } = resolveSmtpSettings();
  if (!pass) {
    return { sent: false, note: 'Email is not configured on this server (set SMTP_PASS for Production)' };
  }
  if (pass.length !== 16) {
    return {
      sent: false,
      note: `Gmail app password must be 16 letters (this server has ${pass.length}). Edit SMTP_PASS on Vercel Production and redeploy.`,
    };
  }

  const { subject, body } = mailCopy(order, status);
  const mail = { from, to: order.customer_email.trim(), subject, text: body };

  try {
    await nodemailer
      .createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 12_000,
        greetingTimeout: 12_000,
        socketTimeout: 20_000,
      })
      .sendMail(mail);
    return { sent: true, note: `Email sent for ${deliveryLabel(status)}` };
  } catch (gmailServiceError) {
    console.error('sendOrderStatusEmail gmail service', gmailServiceError);
  }

  const preferred = Number(process.env.SMTP_PORT || 465);
  const ports = preferred === 587 ? [587, 465] : [465, 587];
  let lastError: unknown;
  for (const port of ports) {
    try {
      await transporter(host, user, pass, port).sendMail(mail);
      return { sent: true, note: `Email sent for ${deliveryLabel(status)}` };
    } catch (error) {
      lastError = error;
      console.error('sendOrderStatusEmail', port, error);
    }
  }

  return { sent: false, note: mailErrorNote(lastError) };
}
