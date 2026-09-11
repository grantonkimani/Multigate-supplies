'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StoreImage } from '@/components/StoreImage';
import { useCart } from '@/contexts/CartContext';

const WHATSAPP_NUMBER = '254706893433';

export default function CartPage() {
  const { state, removeItem, updateQuantity, getTotalPrice, clearCart } = useCart();
  const items = state.items;
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    residence: '',
    deliveryPlace: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handlePayViaWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length || submitting) return;
    setError('');
    setSubmitting(true);

    const orderItems = items.map((item) => {
      const qty = item.quantity || 1;
      return {
        product_id: item.id,
        product_name: item.name,
        quantity: qty,
        unit_price: item.price,
      };
    });
    const shipping = [
      `Residence: ${form.residence.trim()}`,
      `Delivery: ${form.deliveryPlace.trim()}`,
      form.notes.trim() ? `Notes: ${form.notes.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      let data: { id?: string } = {};
      let lastError = 'Could not save order';
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: form.fullName.trim(),
            customer_phone: form.phone.trim(),
            customer_email: form.email.trim(),
            shipping_address: shipping,
            items: orderItems,
          }),
        });
        data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (res.ok && data.id) break;
        lastError = (data as { error?: string }).error || lastError;
        if (attempt === 1) {
          setError(lastError);
          return;
        }
      }
      if (!data.id) {
        setError(lastError);
        return;
      }

      const lines = items.map((item) => {
        const qty = item.quantity || 1;
        const lineTotal = item.price * qty;
        return `- ${item.name} x ${qty} @ KES ${item.price.toLocaleString()} = KES ${lineTotal.toLocaleString()}`;
      });
      const message = [
        'New Multigate Medical Supplies order',
        data.id ? `Order ID: ${data.id}` : null,
        'Status: pending (awaiting payment)',
        '',
        `Name: ${form.fullName.trim()}`,
        `Phone: ${form.phone.trim()}`,
        form.email.trim() ? `Email: ${form.email.trim()}` : null,
        `Place of residence: ${form.residence.trim()}`,
        `Place of delivery: ${form.deliveryPlace.trim()}`,
        form.notes.trim() ? `Notes: ${form.notes.trim()}` : null,
        '',
        'Items:',
        ...lines,
        '',
        `Total: KES ${getTotalPrice().toLocaleString()}`,
      ]
        .filter((line) => line !== null)
        .join('\n');

      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      clearCart();
    } catch {
      setError('Could not save order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen page-bg-light">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Cart</h1>
        {items.length === 0 ? (
          <p className="text-slate-600">
            Your cart is empty.{' '}
            <Link href="/products" className="text-sky-700 font-semibold hover:underline">
              Add products from the Products page
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-6">
            <ul className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="p-4 flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {item.image ? (
                      <StoreImage src={item.image} alt={item.name} className="object-cover" sizes="64px" quality={85} />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{item.name}</p>
                    {item.category && <p className="text-xs text-slate-500">{item.category}</p>}
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      KES {item.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-700"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity || 1}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-700"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-sm text-red-600 hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-lg font-semibold text-slate-900">
                Total: KES {getTotalPrice().toLocaleString()}
              </p>
              <Link href="/products" className="text-sm text-sky-700 font-medium hover:underline">
                Continue shopping
              </Link>
            </div>

            <section className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Delivery details</h2>
              <p className="text-sm text-slate-500 mb-5">
                Fill in your details, then tap Pay. We save the order as pending and open WhatsApp so you can pay personally. Admin confirms it after payment.
              </p>
              <form onSubmit={handlePayViaWhatsApp} className="space-y-4">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                    {error}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
                      Full name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleFieldChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleFieldChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="07XXXXXXXX"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                      Email (optional)
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleFieldChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="residence" className="block text-sm font-medium text-slate-700 mb-1">
                      Place of residence
                    </label>
                    <input
                      id="residence"
                      name="residence"
                      value={form.residence}
                      onChange={handleFieldChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Town / area you live in"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="deliveryPlace" className="block text-sm font-medium text-slate-700 mb-1">
                    Place of delivery
                  </label>
                  <input
                    id="deliveryPlace"
                    name="deliveryPlace"
                    value={form.deliveryPlace}
                    onChange={handleFieldChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    placeholder="Exact delivery location / landmark"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                    Order notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleFieldChange}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    placeholder="Any extra delivery instructions"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Pay'}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
