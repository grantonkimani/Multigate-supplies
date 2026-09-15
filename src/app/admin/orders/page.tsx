'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminJson, peekAdminJson, putAdminJson } from '@/lib/admin-client-cache';
import type { Order } from '@/lib/types';

const STATUSES = ['pending', 'paid', 'out_for_delivery', 'delivered', 'cancelled'] as const;

function statusClass(status: string) {
  if (status === 'paid') return 'bg-green-100 text-green-800';
  if (status === 'out_for_delivery') return 'bg-amber-100 text-amber-800';
  if (status === 'delivered') return 'bg-sky-100 text-sky-800';
  if (status === 'cancelled') return 'bg-slate-200 text-slate-700';
  return 'bg-amber-100 text-amber-800';
}

export default function AdminOrdersPage() {
  const cached = peekAdminJson<Order[]>('/api/admin/orders');
  const [orders, setOrders] = useState<Order[]>(Array.isArray(cached) ? cached : []);
  const [loading, setLoading] = useState(!Array.isArray(cached));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
      if (!silent && !peekAdminJson('/api/admin/orders')) setLoading(true);
    try {
      const data = await adminJson<Order[]>('/api/admin/orders', true);
      if (!Array.isArray(data)) {
        if (!silent) setError('Could not load orders');
        return;
      }
      setOrders(data);
      putAdminJson('/api/admin/orders', data);
    } catch {
      if (!silent) setError('Could not load orders');
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

  async function handleStatusChange(order: Order, status: string) {
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
        setError((data.error as string) || 'Could not update status');
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
      setError('Could not update status');
    } finally {
      setUpdatingId(null);
    }
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
      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-sky-100 bg-sky-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">All orders</h2>
              <p className="text-sm text-sky-700">{orders.length} order(s)</p>
              <p className="text-xs text-slate-500 mt-1">
                New WhatsApp checkouts start as pending. Set to paid after the customer pays you. That emails them a thank-you if they gave a real email.
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
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <p className="p-8 text-slate-500 text-center">No orders yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sky-200 bg-sky-50/80">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Date</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Customer</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Total</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Status</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800 w-20" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{order.customer_name}</span>
                        <span className="block text-sm text-slate-500">{order.customer_phone || order.customer_email}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        KES {Number(order.total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          className={`rounded-lg border border-sky-200 px-2 py-1 text-xs font-medium ${statusClass(order.status)}`}
                          aria-label="Order status"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s === 'out_for_delivery' ? 'out for delivery' : s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                          className="text-sm text-sky-600 hover:underline font-medium"
                        >
                          {expandedId === order.id ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-detail`} className="bg-slate-50/50">
                        <td colSpan={5} className="px-4 py-3 text-sm border-b border-slate-100">
                          <div className="space-y-2">
                            <p><span className="text-slate-500">Order ID:</span> {order.id}</p>
                            <p className="whitespace-pre-wrap"><span className="text-slate-500">Shipping:</span> {order.shipping_address}</p>
                            <p><span className="text-slate-500">Phone:</span> {order.customer_phone || '—'}</p>
                            <ul className="list-disc list-inside mt-2">
                              {(order.items ?? []).map((item, i) => (
                                <li key={i}>
                                  {item.product_name} × {item.quantity} — KES {Number(item.total).toLocaleString()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
