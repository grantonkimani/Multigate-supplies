'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import type { Banner } from '@/lib/types';

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState({
    title: '',
    image_url: '',
    link_url: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchBanners = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/banners', { cache: 'no-store' });
      const data = await r.json();
      setBanners(Array.isArray(data) ? data : []);
    } catch {
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchBanners();
    const t = window.setTimeout(() => setLoading(false), 8000);
    return () => window.clearTimeout(t);
  }, [fetchBanners]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const title = form.title.trim();
    if (!title) {
      setError('Title is required');
      return;
    }
    if (!form.image_url.trim()) {
      setError('Choose an image from your device');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim() || null,
        is_active: form.is_active,
      };
      if (editing) {
        const res = await fetch(`/api/admin/banners/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((d.error as string) || 'Update failed');
          return;
        }
        if (d && d.id) {
          setBanners((prev) => prev.map((b) => (b.id === d.id ? { ...b, ...d } : b)));
        }
      } else {
        const res = await fetch('/api/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((d.error as string) || 'Create failed');
          return;
        }
        if (d && d.id) {
          setBanners((prev) => (prev.some((b) => b.id === d.id) ? prev : [...prev, d as Banner]));
        }
      }
      setForm({ title: '', image_url: '', link_url: '', is_active: true });
      setEditing(null);
      setShowForm(false);
      await fetchBanners();
    } catch {
      setError('Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(banner: Banner) {
    if (!confirm(`Remove banner "${banner.title}"?`)) return;
    const res = await fetch(`/api/admin/banners/${banner.id}`, { method: 'DELETE' });
    if (res.ok) {
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d.error as string) || 'Delete failed');
    }
  }

  async function toggleActive(banner: Banner) {
    setError('');
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) || 'Update failed');
        return;
      }
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch {
      setError('Request failed');
    }
  }

  async function moveBanner(banner: Banner, direction: 'up' | 'down') {
    const idx = banners.findIndex((b) => b.id === banner.id);
    if (idx === -1) return;
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= banners.length - 1) return;
    const next = [...banners];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const ids = next.map((b) => b.id);
    setError('');
    try {
      const res = await fetch('/api/admin/banners/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) || 'Reorder failed');
        return;
      }
      const data = await res.json();
      setBanners(Array.isArray(data) ? data : next);
    } catch {
      setError('Request failed');
    }
  }

  async function handleImageFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/uploads/product-image', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || `Failed to upload ${file.name}`);
        return;
      }
      if (typeof data.url === 'string' && data.url) {
        setForm((f) => ({ ...f, image_url: data.url }));
      }
    } catch {
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setForm({ title: '', image_url: '', link_url: '', is_active: true });
    setError('');
  }

  if (loading) return <p className="text-slate-500 py-8">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="font-semibold text-slate-900">Banners</h2>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setForm({ title: '', image_url: '', link_url: '', is_active: true });
            setError('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add banner
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      {(showForm || editing) && (
        <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-6 max-w-lg">
          <h3 className="font-medium text-slate-900 mb-4">{editing ? 'Edit banner' : 'New banner'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Banner title"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banner image</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={(e) => {
                  void handleImageFile(e.target.files);
                  e.target.value = '';
                }}
                className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-700"
              />
              <p className="text-xs text-slate-500 mt-1">
                {uploading ? 'Uploading…' : 'Pick a photo from this device (JPEG, PNG, WebP).'}
              </p>
              {form.image_url ? (
                <div className="relative mt-3 h-28 w-full overflow-hidden rounded-lg bg-slate-100">
                  <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Link URL (optional)</label>
              <input
                type="text"
                value={form.link_url}
                onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="/products or https://…"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="banner-active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-slate-300 text-sky-600"
              />
              <label htmlFor="banner-active" className="text-sm font-medium text-slate-700">
                Active (show on site)
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : editing ? 'Update' : 'Add banner'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm overflow-hidden">
        {banners.length === 0 ? (
          <p className="p-8 text-slate-500 text-center">No banners yet. Add one to feature on the homepage.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {banners.map((b, index) => (
              <li key={b.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                <div className="flex flex-col flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveBanner(b, 'up')}
                    disabled={index === 0}
                    className="p-0.5 text-slate-400 hover:text-sky-600 disabled:opacity-30"
                    title="Move up"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBanner(b, 'down')}
                    disabled={index === banners.length - 1}
                    className="p-0.5 text-slate-400 hover:text-sky-600 disabled:opacity-30"
                    title="Move down"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  {b.image_url ? (
                    <img
                      src={b.image_url}
                      alt=""
                      className="w-20 h-12 object-cover rounded-lg bg-slate-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-12 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 block truncate">{b.title}</span>
                    {b.link_url && (
                      <a
                        href={b.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-sky-600 truncate block"
                      >
                        {b.link_url}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(b)}
                    className={`px-2.5 py-1 rounded-lg text-sm font-medium ${
                      b.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                    title={b.is_active ? 'Active – click to hide' : 'Inactive – click to show'}
                  >
                    {b.is_active ? 'Active' : 'Off'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(b);
                      setShowForm(false);
                      setForm({
                        title: b.title,
                        image_url: b.image_url ?? '',
                        link_url: b.link_url ?? '',
                        is_active: b.is_active,
                      });
                      setError('');
                    }}
                    className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
