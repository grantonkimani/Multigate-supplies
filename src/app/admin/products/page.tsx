'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import type { Product, Category } from '@/lib/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
    image_urls: [] as string[],
    stock_quantity: '0',
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function fetchData() {
    Promise.all([
      fetch('/api/admin/products').then((r) => r.json()),
      fetch('/api/admin/categories').then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
        if (Array.isArray(c) && c[0]) {
          setForm((f) => (f.category_id === '' ? { ...f, category_id: c[0].id } : f));
        }
      })
      .catch(() => {
        setProducts([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (categories.length && !form.category_id) setForm((f) => ({ ...f, category_id: categories[0].id }));
  }, [categories]);

  function resetForm() {
    setForm({
      category_id: categories[0]?.id ?? '',
      name: '',
      description: '',
      price: '',
      image_url: '',
      image_urls: [],
      stock_quantity: '0',
    });
    setEditing(null);
    setShowForm(false);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const payload = {
      category_id: form.category_id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price) || 0,
      image_url: form.image_url.trim() || null,
      image_urls: form.image_urls.length ? form.image_urls : null,
      stock_quantity: Number.isFinite(parseInt(form.stock_quantity, 10))
        ? parseInt(form.stock_quantity, 10)
        : 0,
      is_active: true,
    };
    try {
      if (editing) {
        const res = await fetch(`/api/admin/products/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || 'Update failed');
          return;
        }
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || 'Create failed');
          return;
        }
      }
      resetForm();
      fetchData();
    } catch {
      setError('Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Permanently delete "${product.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d.error as string) || 'Delete failed');
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch {
      setError('Delete failed');
    }
  }

  async function handleImageFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError('');
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(fileList)) {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/admin/uploads/product-image', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((data.error as string) || `Failed to upload ${file.name}`);
          return;
        }
        if (typeof data.url === 'string' && data.url) uploaded.push(data.url);
      }
      if (!uploaded.length) return;
      setForm((f) => {
        const extra = [...f.image_urls];
        let primary = f.image_url;
        for (const url of uploaded) {
          if (!primary) primary = url;
          else if (url !== primary && !extra.includes(url)) extra.push(url);
        }
        return { ...f, image_url: primary, image_urls: extra };
      });
    } catch {
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  const previewUrls = [form.image_url, ...form.image_urls].filter((u, i, arr) => u && arr.indexOf(u) === i);

  if (loading) return <p className="text-slate-500 py-8">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="font-semibold text-slate-900">Products</h2>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setForm({
              category_id: categories[0]?.id ?? '',
              name: '',
              description: '',
              price: '',
              image_url: '',
              image_urls: [],
              stock_quantity: '0',
            });
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add product
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      {(showForm || editing) && (
        <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-4 sm:p-6">
          <h3 className="font-medium text-slate-900 mb-4">{editing ? 'Edit product' : 'New product'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Product name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (KES)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                <input
                  type="number"
                  min={0}
                  value={form.stock_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <span className="inline-flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Product images</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                disabled={uploading || submitting}
                onChange={(e) => {
                  void handleImageFiles(e.target.files);
                  e.target.value = '';
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">
                Choose images from this device (JPEG, PNG, WebP, GIF, AVIF, max 8MB). They stay until the product is deleted.
              </p>
              {uploading && <p className="mt-1 text-xs text-sky-700">Uploading…</p>}
              {previewUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg border border-sky-100 bg-slate-100"
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              )}
              <label className="block text-sm font-medium text-slate-700 mt-3 mb-1">Or paste image URL</label>
              <input
                type="text"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="https://… or /uploads/products/…"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || uploading}
                className="px-4 py-2.5 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : editing ? 'Update' : 'Add product'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <p className="p-8 text-slate-500 text-center">No products yet. Add a category first, then add products.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sky-200 bg-sky-50/80">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Product</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Category</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Price</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Stock</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800 w-24" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-slate-900">{p.name}</span>
                          {p.description && <p className="text-sm text-slate-500 line-clamp-1">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{(p as Product & { category?: Category }).category?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">KES {p.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{p.stock_quantity}</td>
                    <td className="px-4 py-3 flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(p);
                          setShowForm(false);
                          setForm({
                            category_id: p.category_id,
                            name: p.name,
                            description: p.description ?? '',
                            price: String(p.price),
                            image_url: p.image_url ?? '',
                            image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
                            stock_quantity: String(p.stock_quantity),
                          });
                        }}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
