'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { adminJson, peekAdminJson, putAdminJson } from '@/lib/admin-client-cache';
import { productPhotoUrls } from '@/lib/product-photos';
import type { Product, Category } from '@/lib/types';

export default function AdminProductsPage() {
  const cachedProducts = peekAdminJson<Product[]>('/api/admin/products');
  const cachedCategories = peekAdminJson<Category[]>('/api/admin/categories');
  const [products, setProducts] = useState<Product[]>(Array.isArray(cachedProducts) ? cachedProducts : []);
  const [categories, setCategories] = useState<Category[]>(Array.isArray(cachedCategories) ? cachedCategories : []);
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
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(40);

  function fetchData() {
    setLoading(true);
    Promise.all([adminJson<Product[]>('/api/admin/products', true), adminJson<Category[]>('/api/admin/categories', true)])
      .then(([p, c]) => {
        const productsList = Array.isArray(p) ? p : [];
        const categoriesList = Array.isArray(c) ? c : [];
        setProducts(productsList);
        setCategories(categoriesList);
        putAdminJson('/api/admin/products', productsList);
        putAdminJson('/api/admin/categories', categoriesList);
        if (categoriesList[0]) {
          setForm((f) => (f.category_id === '' ? { ...f, category_id: categoriesList[0].id } : f));
        }
        if (!productsList.length) setError('');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not load products');
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
      image_url: productPhotoUrls({ image_url: form.image_url, image_urls: form.image_urls })[0] ?? null,
      image_urls: (() => {
        const extra = productPhotoUrls({ image_url: form.image_url, image_urls: form.image_urls }).slice(1);
        return extra.length ? extra : null;
      })(),
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
        const updated = await res.json().catch(() => null);
        if (updated?.id) {
          setProducts((prev) => {
            const next = prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
            putAdminJson('/api/admin/products', next);
            return next;
          });
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
        const created = await res.json().catch(() => null);
        if (created?.id) {
          setProducts((prev) => {
            const next = [created as Product, ...prev.filter((p) => p.id !== created.id)];
            putAdminJson('/api/admin/products', next);
            return next;
          });
        }
      }
      resetForm();
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
      setProducts((prev) => {
        const next = prev.filter((p) => p.id !== product.id);
        putAdminJson('/api/admin/products', next);
        return next;
      });
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d.error as string) || 'Delete failed');
        fetchData();
      }
    } catch {
      setError('Delete failed');
    }
  }

  async function handleImageFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const remaining = Math.max(
      0,
      2 - productPhotoUrls({ image_url: form.image_url, image_urls: form.image_urls }).length
    );
    if (remaining === 0) {
      setError('A product can have two photos. Remove one first.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(fileList).slice(0, remaining)) {
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
        const next = productPhotoUrls({
          image_url: f.image_url,
          image_urls: [...f.image_urls, ...uploaded],
        });
        return { ...f, image_url: next[0] ?? '', image_urls: next.slice(1) };
      });
    } catch {
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  function startEdit(p: Product) {
    setEditing(p);
    setShowForm(false);
    setForm({
      category_id: p.category_id,
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      image_url: p.image_url ?? '',
      image_urls: productPhotoUrls(p).slice(1),
      stock_quantity: String(p.stock_quantity),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const categoryOptions = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    for (const p of products) {
      if (p.category?.id && !byId.has(p.category.id)) byId.set(p.category.id, p.category);
    }
    return Array.from(byId.values()).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    );
  }, [categories, products]);

  const previewUrls = [form.image_url, ...form.image_urls].filter((u, i, arr) => u && arr.indexOf(u) === i);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
    );
  }, [products, search]);
  const shownProducts = filteredProducts.slice(0, visibleCount);

  if (loading) return <p className="text-slate-500 py-8">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">{filteredProducts.length} product(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData()}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-sky-200 text-sky-800 hover:bg-sky-50"
          >
            Refresh
          </button>
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
                {categoryOptions.map((c) => (
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
                rows={6}
                placeholder="Full product description. Put each point on a new line."
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
                Add up to two photos (JPEG, PNG, WebP, GIF, AVIF, max 8MB). The first photo is the main shop photo.
              </p>
              {uploading && <p className="mt-1 text-xs text-sky-700">Uploading…</p>}
              {previewUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="relative">
                      <img
                        src={url}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg border border-sky-100 bg-slate-100"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {index === 0 ? 'Main' : '2'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => {
                            const next = productPhotoUrls({
                              image_url: f.image_url,
                              image_urls: f.image_urls,
                            }).filter((u) => u !== url);
                            return { ...f, image_url: next[0] ?? '', image_urls: next.slice(1) };
                          })
                        }
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-800 text-white text-xs leading-5"
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="block text-sm font-medium text-slate-700 mt-3 mb-1">Photo 1 URL</label>
              <input
                type="text"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="https://… or /uploads/products/…"
              />
              <label className="block text-sm font-medium text-slate-700 mt-3 mb-1">Photo 2 URL</label>
              <input
                type="text"
                value={form.image_urls[0] ?? ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setForm((f) => ({ ...f, image_urls: value ? [value] : [] }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Optional second photo"
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
          <p className="p-8 text-slate-500 text-center">
            {error ? 'Products could not be loaded. Use Refresh or try again.' : 'No products in the catalog yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="p-3 border-b border-sky-100">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(40);
                }}
                placeholder="Search products"
                className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {shownProducts.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        width={56}
                        height={56}
                        className="w-14 h-14 object-cover rounded-lg bg-slate-100 shrink-0"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-sm text-slate-500">
                        {(p as Product & { category?: Category }).category?.name ?? '—'}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">KES {p.price.toLocaleString()}</p>
                      <p className="text-sm text-slate-500">Stock {p.stock_quantity}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="inline-flex items-center justify-center gap-2 min-h-11 rounded-lg bg-sky-600 text-white text-sm font-semibold"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="inline-flex items-center justify-center gap-2 min-h-11 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <table className="hidden md:table w-full text-left">
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
                {shownProducts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            width={48}
                            height={48}
                            className="w-12 h-12 object-cover rounded-lg bg-slate-100"
                            loading="lazy"
                            decoding="async"
                          />
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
                    <td className="px-4 py-3">
                      <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="p-2 text-sky-700 hover:text-sky-600 hover:bg-sky-50 rounded-lg"
                        title="Edit"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Delete"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length > visibleCount && (
              <div className="p-3 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + 40)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-sky-200 text-sky-800 hover:bg-sky-50"
                >
                  Show more ({filteredProducts.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
