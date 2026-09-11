'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Plus } from 'lucide-react';
import type { Product } from '@/lib/types';

type OfferAdminRow = {
  product_id: string;
  product_name: string;
  original_price: number;
  image_url: string | null;
  offer_price: number;
  percent_off: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminOffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<OfferAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [offerPrice, setOfferPrice] = useState<string>(''); // string for input

  async function fetchAll() {
    setError('');
    try {
      const [pRes, oRes] = await Promise.all([fetch('/api/admin/products'), fetch('/api/admin/offers')]);
      const pData = await pRes.json();
      const oData = await oRes.json();
      setProducts(Array.isArray(pData) ? pData : []);
      setOffers(Array.isArray(oData) ? oData : []);
    } catch {
      setError('Failed to load products/offers');
      setProducts([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const offerByProductId = useMemo(() => {
    const map = new Map<string, OfferAdminRow>();
    for (const o of offers) map.set(o.product_id, o);
    return map;
  }, [offers]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);

  function isSelected(id: string) {
    return selectedProductIds.includes(id);
  }

  function toggleSelected(id: string) {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const selected = selectedProductIds;
    const priceNum = Number(offerPrice);
    if (!selected.length) {
      setError('Select at least one product');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('Offer price must be greater than 0');
      return;
    }

    try {
      const res = await fetch('/api/admin/offers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: selected,
          offer_price: priceNum,
          is_active: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to apply offers');
        return;
      }
      setSelectedProductIds([]);
      setOfferPrice('');
      await fetchAll();
    } catch {
      setError('Request failed');
    }
  }

  async function handleToggleActive(row: OfferAdminRow) {
    setError('');
    try {
      const res = await fetch(`/api/admin/offers/${row.product_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to update offer');
        return;
      }
      await fetchAll();
    } catch {
      setError('Request failed');
    }
  }

  async function handleDelete(row: OfferAdminRow) {
    setError('');
    if (!confirm(`Remove offer for "${row.product_name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/offers/${row.product_id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to delete offer');
        return;
      }
      await fetchAll();
    } catch {
      setError('Request failed');
    }
  }

  if (loading) return <p className="text-slate-500 py-8">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="font-semibold text-slate-900">Offers</h2>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-4 sm:p-6">
        <h3 className="font-medium text-slate-900 mb-4">Create / Update Offers</h3>

        <form onSubmit={handleApply} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search products</label>
              <div className="flex items-center gap-2 border border-sky-200 rounded-lg px-3 py-2">
                <Search className="h-4 w-4 text-sky-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Offer price (KES)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="e.g. 2500"
                required
              />
            </div>
          </div>

          <div className="border border-sky-100 rounded-xl overflow-hidden">
            <div className="bg-sky-50 px-4 py-3 border-b border-sky-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">
                Select products ({selectedProductIds.length} selected)
              </span>
              {visibleCount < filteredProducts.length && (
                <button
                  type="button"
                  className="text-sm text-sky-700 hover:underline font-medium"
                  onClick={() => setVisibleCount((n) => n + 60)}
                >
                  Show more
                </button>
              )}
            </div>
            <div className="max-h-[320px] overflow-auto">
              {visibleProducts.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No products match your search.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visibleProducts.map((p) => {
                    const selected = isSelected(p.id);
                    const existing = offerByProductId.get(p.id);
                    const hasActive = Boolean(existing?.is_active);
                    return (
                      <li key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelected(p.id)}
                          className="h-4 w-4 accent-sky-600"
                          aria-label={`Select ${p.name}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-slate-900 truncate">{p.name}</span>
                            {hasActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                            {existing && !hasActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                                Off
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Original: KES {p.price.toLocaleString()}
                          </div>
                        </div>
                        {existing?.percent_off !== undefined && (
                          <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">
                            -{existing.percent_off}%
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
              disabled={!selectedProductIds.length || !offerPrice}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Apply offer to selected
              </span>
            </button>
            <button
              type="button"
              className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setSelectedProductIds([]);
                setOfferPrice('');
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sky-100 bg-sky-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Current offers</h3>
          <span className="text-sm text-sky-700">{offers.length} total</span>
        </div>
        {offers.length === 0 ? (
          <p className="p-8 text-sm text-slate-500 text-center">No offers yet. Pick products above and apply an offer price.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sky-200 bg-sky-50/80">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Product</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Original</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Offer</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Discount</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800 w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.product_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {o.image_url ? (
                          <img src={o.image_url} alt="" className="w-10 h-10 object-cover rounded-lg bg-slate-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200" />
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{o.product_name}</div>
                          <div className="text-xs text-slate-500">{o.is_active ? 'Active on site' : 'Off'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">KES {o.original_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">KES {o.offer_price.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700">
                        -{o.percent_off}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(o)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                            o.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
                          } hover:opacity-95`}
                        >
                          {o.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(o)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                          aria-label={`Delete offer for ${o.product_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

