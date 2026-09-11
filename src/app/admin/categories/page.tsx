'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Category } from '@/lib/types';

function sortByOrder(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => a.sort_order - b.sort_order);
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/categories');
      const data = await r.json();
      setCategories(sortByOrder(Array.isArray(data) ? data : []));
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCategories(sortByOrder(Array.isArray(data) ? data : []));
      })
      .catch(() => { if (!cancelled) setCategories([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/categories/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            description: description.trim() || null,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((d.error as string) || 'Update failed');
          return;
        }
        if (d && d.id) {
          setCategories((prev) => sortByOrder(prev.map((c) => (c.id === d.id ? { ...c, ...d } : c))));
        }
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            description: description.trim() || undefined,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((d.error as string) || 'Create failed');
          return;
        }
        if (d && d.id) {
          setCategories((prev) => sortByOrder([...prev.filter((c) => c.id !== d.id), d as Category]));
        }
      }
      setName('');
      setDescription('');
      setEditing(null);
      setShowForm(false);
    } catch {
      setError('Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? Products in this category will need to be reassigned.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d.error as string) || 'Delete failed');
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch {
      setError('Delete failed');
    }
  }

  async function moveCategory(cat: Category, direction: 'up' | 'down') {
    const sorted = sortByOrder(categories);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    if (idx === -1) return;
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const next = [...sorted];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const ids = next.map((c) => c.id);
    setError('');
    try {
      const res = await fetch('/api/admin/categories/reorder', {
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
      setCategories(sortByOrder(Array.isArray(data) ? data : next));
    } catch {
      setError('Request failed');
    }
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setName('');
    setDescription('');
    setError('');
  }

  if (loading) return <p className="text-slate-500 py-8">Loading…</p>;

  const sortedCategories = sortByOrder(categories);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="font-semibold text-slate-900">Categories</h2>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setName('');
            setDescription('');
            setError('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add category
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      {(showForm || editing) && (
        <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-6 max-w-md">
          <h3 className="font-medium text-slate-900 mb-4">{editing ? 'Edit category' : 'New category'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="e.g. Surgical Supplies"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Short description"
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : editing ? 'Update' : 'Add category'}
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
        {sortedCategories.length === 0 ? (
          <p className="p-8 text-slate-500 text-center">No categories yet. Add one to group your products.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {sortedCategories.map((c, index) => (
              <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveCategory(c, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-slate-400 hover:text-sky-600 disabled:opacity-30"
                      title="Move up"
                      aria-label="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(c, 'down')}
                      disabled={index === sortedCategories.length - 1}
                      className="p-0.5 text-slate-400 hover:text-sky-600 disabled:opacity-30"
                      title="Move down"
                      aria-label="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900">{c.name}</span>
                    {c.description && <p className="text-sm text-slate-500 truncate">{c.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(c);
                      setShowForm(false);
                      setName(c.name);
                      setDescription(c.description ?? '');
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
                    onClick={() => handleDelete(c)}
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
