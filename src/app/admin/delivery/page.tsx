'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminJson, peekAdminJson, putAdminJson } from '@/lib/admin-client-cache';
import type { Order } from '@/lib/types';

const DELIVERY_STATUSES = ['paid', 'out_for_delivery', 'delivered'] as const;

function isDeliveryOrder(order: Order) {
  return (DELIVERY_STATUSES as readonly string[]).includes(order.status);
}

function hasCustomerEmail(email: string | null | undefined) {
  if (!email || !email.includes('@')) return false;
  return !email.trim().toLowerCase().endsWith('@whatsapp.order');
}

function statusLabel(status: string) {
  if (status === 'out_for_delivery') return 'Out for delivery';
  if (status === 'delivered') return 'Delivered';
  if (status === 'paid') return 'Paid — ready to ship';
  return status;
}

function statusClass(status: string) {
  if (status === 'paid') return 'bg-green-100 text-green-800';
  if (status === 'out_for_delivery') return 'bg-amber-100 text-amber-800';
  if (status === 'delivered') return 'bg-sky-100 text-sky-800';
  return 'bg-slate-100 text-slate-700';
}

export default function AdminDeliveryPage() {
  const cached = peekAdminJson<Order[]>('/api/admin/orders');
  const [orders, setOrders] = useState<Order[]>(Array.isArray(cached) ? cached : []);
  const [loading, setLoading] = useState(!Array.isArray(cached));
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const deliveryOrders = useMemo(
    () => orders.filter(isDeliveryOrder).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [orders]
  );

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent && !peekAdminJson('/api/admin/orders')) setLoading(true);
    try {
      const data = await adminJson<Order[]>('/api/admin/orders', true);
      if (!Array.isArray(data)) {
        if (!silent) setError('Could not load delivery orders');
        return;
      }
      setOrders(data);
      putAdminJson('/api/admin/orders', data);
    } catch {
      if (!silent) setError('Could not load delivery orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const onFocus = () => void loadOrders(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [loadOrders]);

  async function setDeliveryStatus(order: Order, status: 'out_for_delivery' | 'delivered') {
    if (status === order.status) return;
    setError('');
    setNote('');
    setUpdatingId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || 'Could not update delivery status');
        return;
      }
      setOrders((prev) => {
        const items =
          Array.isArray((data as Order).items) && (data as Order).items.length
            ? (data as Order).items
            : order.items;
        const next = prev.map((o) =>
          o.id === order.id ? { ...o, status, items, updated_at: new Date().toISOString() } : o
        );
        putAdminJson('/api/admin/orders', next);
        return next;
      });
      if (typeof data.email_note === 'string' && data.email_note) {
        setNote(data.email_note);
      }
    } catch {
      setError('Could not update delivery status');
    } finally {
      setUpdatingId(null);
    }
  }

  function renderToggles(order: Order) {
    const busy = updatingId === order.id;
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || order.status === 'out_for_delivery'}
          onClick={() => void setDeliveryStatus(order, 'out_for_delivery')}
          className={`px-3 py-2 text-sm font-medium rounded-lg border ${
            order.status === 'out_for_delivery'
              ? 'bg-amber-500 text-white border-amber-600'
              : 'border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100'
          } disabled:opacity-60`}
        >
          Out for delivery
        </button>
        <button
          type="button"
          disabled={busy || order.status === 'delivered'}
          onClick={() => void setDeliveryStatus(order, 'delivered')}
          className={`px-3 py-2 text-sm font-medium rounded-lg border ${
            order.status === 'delivered'
              ? 'bg-sky-600 text-white border-sky-700'
              : 'border-sky-300 text-sky-900 bg-sky-50 hover:bg-sky-100'
          } disabled:opacity-60`}
        >
          Delivered
        </button>
      </div>
    );
  }

  if (loading) return <p className="text-slate-500 py-8">Loading…</p>;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}
      {note && (
        <p className="text-sm text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">{note}</p>
      )}
      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm overflow-hidden" data-delivery-ui="cards-v1">
        <div className="px-4 sm:px-5 py-4 border-b border-sky-100 bg-sky-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Delivery</h1>
              <p className="text-sm text-sky-700 mt-1">{deliveryOrders.length} paid order(s)</p>
              <p className="text-xs text-slate-500 mt-1">
                Only orders marked paid on the Orders tab appear here. Toggling Out for delivery or Delivered emails the
                customer when they gave a real email (WhatsApp-only checkouts are skipped).
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadOrders()}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-sky-200 text-sky-800 hover:bg-sky-100"
            >
              Refresh
            </button>
          </div>
        </div>

        {deliveryOrders.length === 0 ? (
          <p className="p-8 text-slate-500 text-center">No paid orders to deliver yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {deliveryOrders.map((order) => (
              <div key={order.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{order.customer_name}</p>
                    <p className="text-sm text-slate-500">{order.customer_phone || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${statusClass(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.shipping_address}</p>
                <p className="text-xs text-slate-500">
                  {hasCustomerEmail(order.customer_email)
                    ? order.customer_email
                    : 'No email — status only, no mail'}
                </p>
                {renderToggles(order)}
                <ul className="text-sm text-slate-600 list-disc list-inside">
                  {(order.items ?? []).map((item, i) => (
                    <li key={i}>
                      {item.product_name} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
