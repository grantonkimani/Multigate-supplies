'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import type { Category, ProductWithOffer } from '@/lib/types';

const BLUE = {
  main: '#0284c7',
  mid: '#0369a1',
  light: '#e0f2fe',
};

function categoryTabClass(active: boolean) {
  return [
    'inline-flex items-center whitespace-nowrap rounded-full px-4 py-2.5 text-base font-semibold border-2 transition-colors',
    active
      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
      : 'bg-white text-sky-800 border-sky-100 hover:border-sky-300 hover:bg-sky-50',
  ].join(' ');
}

function ProductCard({ product, eager }: { product: ProductWithOffer; eager?: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const offer = product.offer;
  const originalPrice = Number(product.price);
  const offerPrice = Number(offer?.offer_price);
  const hasOffer =
    Boolean(offer) &&
    offer?.is_active !== false &&
    Number.isFinite(offerPrice) &&
    offerPrice > 0 &&
    Number.isFinite(originalPrice) &&
    offerPrice < originalPrice;
  const cartPrice = hasOffer ? offerPrice : originalPrice;
  const outOfStock = Number(product.stock_quantity) <= 0;

  function handleAddToCart() {
    if (outOfStock) return;
    addItem({
      id: product.id,
      name: product.name,
      price: cartPrice,
      image: product.image_url ?? '',
      category: product.category?.name ?? '',
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full ${
        hasOffer ? 'offer-card border-sky-500' : 'border-sky-100 hover:border-sky-200'
      }`}
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={eager ? 'high' : 'low'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-base">
            No Image
          </div>
        )}
        {hasOffer && (
          <div className="offer-banner">
            Offer · -{offer?.percent_off ?? 0}% off
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 min-w-0">
        {product.category?.name && (
          <p className="text-sm font-medium text-sky-700 truncate">{product.category.name}</p>
        )}
        <h3 className="mt-1 font-semibold text-slate-900 text-lg leading-snug line-clamp-2">{product.name}</h3>

        <div className="mt-3">
          {!hasOffer ? (
            <span className="text-lg font-bold text-slate-900">KES {product.price.toLocaleString()}</span>
          ) : (
            <div className="space-y-0.5">
              <span className="text-lg font-bold" style={{ color: BLUE.mid }}>
                KES {offerPrice.toLocaleString()}
              </span>
              <span className="block text-sm text-slate-500 line-through">
                KES {originalPrice.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="mt-auto pt-4 w-full rounded-xl px-4 py-3 text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: added ? '#15803d' : BLUE.main }}
        >
          {outOfStock ? 'Out of stock' : added ? 'Added' : 'Add to cart'}
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="p-5">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-5 bg-slate-200 rounded w-3/4 mt-3" />
        <div className="h-5 bg-slate-200 rounded w-1/2 mt-4" />
        <div className="h-11 bg-slate-200 rounded-xl mt-6" />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsCatalog />
    </Suspense>
  );
}

function ProductsFallback() {
  return (
    <div className="min-h-screen page-bg-light">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-brand mb-2">Products</h1>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ProductsCatalog() {
  const searchParams = useSearchParams();
  const categorySlug = (searchParams.get('category') ?? '').trim();
  const limit = 24;
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProductWithOffer[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestSeq = useRef(0);
  const loadSlugRef = useRef(categorySlug);

  async function load(p: number, slug: string, quiet = false) {
    setError('');
    const seq = ++requestSeq.current;
    loadSlugRef.current = slug;
    if (p === 1 && !quiet) setInitialLoading(true);
    else if (p !== 1) setLoadingMore(true);

    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (slug) qs.set('category', slug);
      const res = await fetch(`/api/products?${qs.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load products');
      if (seq !== requestSeq.current || loadSlugRef.current !== slug) return;

      const newItems = Array.isArray(data.items) ? (data.items as ProductWithOffer[]) : [];
      setItems((prev) => {
        if (p === 1) return newItems;
        const map = new Map<string, ProductWithOffer>();
        for (const it of prev) map.set(it.id, it);
        for (const it of newItems) map.set(it.id, it);
        return Array.from(map.values());
      });
      setHasMore(Boolean(data.hasMore));
    } catch (e: any) {
      if (seq === requestSeq.current) setError(e?.message || 'Failed to load products');
    } finally {
      if (seq === requestSeq.current) {
        setInitialLoading(false);
        setLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
    setItems([]);
    setHasMore(false);
    load(1, categorySlug);
    const reload = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setPage(1);
      load(1, categorySlug, true);
    };
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', reload);
    return () => {
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', reload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug]);

  useEffect(() => {
    if (page === 1) return;
    if (!hasMore) return;
    load(page, categorySlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const sortedItems = useMemo(() => {
    const active = categories.find((c) => c.slug === categorySlug);
    const filtered = !categorySlug
      ? items
      : items.filter((p) => {
          if (active?.id && p.category_id === active.id) return true;
          if (p.category?.slug === categorySlug) return true;
          return false;
        });
    return [...filtered].sort((a, b) =>
      String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
    );
  }, [items, categories, categorySlug]);

  return (
    <div className="min-h-screen page-bg-light">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div>
          <h1 className="text-3xl font-bold text-brand mb-2">Products</h1>
          <p className="text-lg text-slate-600">
            Browse products. Active offers are shown instantly.
          </p>
        </div>

        {categories.length > 0 && (
          <div className="mt-8 overflow-x-auto pb-1 -mx-1 px-1">
            <div className="inline-flex min-w-full sm:min-w-0 flex-nowrap sm:flex-wrap gap-2 p-2 rounded-2xl bg-white border-2 border-sky-100 shadow-sm">
            <Link
              href="/products"
              className={categoryTabClass(!categorySlug)}
            >
              All
            </Link>
            {categories.map((cat) => {
              const active = categorySlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${encodeURIComponent(cat.slug)}`}
                  className={categoryTabClass(active)}
                >
                  {cat.name}
                </Link>
              );
            })}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}

        {initialLoading ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No products in this view yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedItems.map((p, index) => (
              <ProductCard key={p.id} product={p} eager={index < 6} />
            ))}
          </div>
        )}

        {hasMore && !initialLoading && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={loadingMore}
              className="rounded-xl bg-sky-600 px-6 py-3 text-base font-semibold text-white disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more products'}
            </button>
          </div>
        )}

        {loadingMore && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={`more-${i}`} />
            ))}
          </div>
        )}

        {!hasMore && !initialLoading && sortedItems.length > 0 && (
          <p className="mt-8 text-center text-sm text-slate-500">You reached the end of the catalog.</p>
        )}
      </main>

      <Footer />
    </div>
  );
}
