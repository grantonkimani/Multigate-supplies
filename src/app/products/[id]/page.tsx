'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { productPhotoUrls } from '@/lib/product-photos';
import type { ProductWithOffer } from '@/lib/types';

const BLUE = {
  main: '#0284c7',
};
const GALLERY_VERSION = 3;

function ProductGallery({ name, photos }: { name: string; photos: string[] }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const src = photos[active] && !failed[active] ? photos[active] : '';

  useEffect(() => {
    setActive(0);
  }, [photos.join('|')]);

  return (
    <div className="w-full">
      <div
        data-gallery-version={GALLERY_VERSION}
        className="product-gallery-main w-full overflow-hidden rounded-2xl border border-sky-100 bg-slate-50"
        style={{ minHeight: 360 }}
      >
        {!src ? (
          <div className="flex items-center justify-center text-slate-400 text-base" style={{ minHeight: 360 }}>
            No Image
          </div>
        ) : (
          <img
            key={src}
            src={src}
            alt={name}
            style={{ display: 'block', width: '100%', minHeight: 360, maxHeight: 480, objectFit: 'contain' }}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={() => setFailed((prev) => ({ ...prev, [active]: true }))}
          />
        )}
        {photos.slice(1).map((url) => (
          <img key={`preload-${url}`} src={url} alt="" className="hidden" aria-hidden />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2">
          {photos.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(index)}
              className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-white ${
                active === index ? 'border-sky-600' : 'border-sky-100 hover:border-sky-300'
              }`}
              aria-label={`Show photo ${index + 1}`}
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductWithOffer | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/products/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data.error as string) || 'Product not found');
        if (!cancelled) setProduct(data as ProductWithOffer);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setProduct(null);
          setError(e.message || 'Product not found');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const photos = useMemo(() => (product ? productPhotoUrls(product) : []), [product]);
  const offer = product?.offer;
  const originalPrice = Number(product?.price);
  const offerPrice = Number(offer?.offer_price);
  const hasOffer =
    Boolean(offer) &&
    offer?.is_active !== false &&
    Number.isFinite(offerPrice) &&
    offerPrice > 0 &&
    Number.isFinite(originalPrice) &&
    offerPrice < originalPrice;
  const cartPrice = hasOffer ? offerPrice : Number.isFinite(originalPrice) ? originalPrice : 0;
  const outOfStock = Number(product?.stock_quantity) <= 0;
  const descriptionLines = (product?.description ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);

  function handleAddToCart() {
    if (!product || outOfStock) return;
    addItem({
      id: product.id,
      name: product.name,
      price: cartPrice,
      image: photos[0] ?? product.image_url ?? '',
      category: product.category?.name ?? '',
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-[4/3] rounded-2xl bg-slate-200 animate-pulse" />
              <div className="space-y-4">
                <div className="h-5 w-40 bg-slate-200 animate-pulse rounded" />
                <div className="h-9 w-3/4 bg-slate-200 animate-pulse rounded" />
                <div className="h-24 w-full bg-slate-200 animate-pulse rounded" />
                <div className="h-8 w-32 bg-slate-200 animate-pulse rounded" />
              </div>
            </div>
          ) : error || !product ? (
            <div className="py-16 text-center">
              <p className="text-slate-700">{error || 'Product not found'}</p>
              <Link href="/products" className="mt-4 inline-block text-sky-700 font-semibold hover:underline">
                Back to products
              </Link>
            </div>
          ) : (
            <>
              <nav className="text-sm text-slate-500 mb-6 flex flex-wrap gap-1">
                <Link href="/" className="hover:text-sky-700">
                  Home
                </Link>
                <span>/</span>
                <Link href="/products" className="hover:text-sky-700">
                  Products
                </Link>
                {product.category?.name && (
                  <>
                    <span>/</span>
                    <span>{product.category.name}</span>
                  </>
                )}
                <span>/</span>
                <span className="text-slate-800">{product.name}</span>
              </nav>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="relative">
                  {hasOffer && (
                    <div className="absolute top-3 left-3 z-10 rounded-md bg-red-600 px-2.5 py-1 text-sm font-bold text-white">
                      -{offer?.percent_off ?? 0}%
                    </div>
                  )}
                  <ProductGallery name={product.name} photos={photos} />
                </div>

                <div>
                  {product.category?.name && (
                    <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
                      {product.category.name}
                    </p>
                  )}
                  <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">
                    {product.name}
                  </h1>

                  {descriptionLines.length > 0 ? (
                    descriptionLines.length === 1 ? (
                      <p className="mt-5 text-base leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {descriptionLines[0]}
                      </p>
                    ) : (
                      <ul className="mt-5 space-y-2 text-base leading-relaxed text-slate-700 list-disc pl-5">
                        {descriptionLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )
                  ) : (
                    <p className="mt-5 text-base text-slate-500">No description added yet.</p>
                  )}

                  <div className="mt-8">
                    {!hasOffer ? (
                      <span className="text-3xl font-bold text-red-600">
                        KSh {(Number.isFinite(originalPrice) ? originalPrice : 0).toLocaleString()}.00
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="text-3xl font-bold text-red-600">
                          KSh {offerPrice.toLocaleString()}.00
                        </span>
                        <span className="text-lg text-slate-400 line-through">
                          KSh {originalPrice.toLocaleString()}.00
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={outOfStock}
                    className="mt-8 w-full sm:w-auto min-w-[220px] rounded-xl px-6 py-3.5 text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: added ? '#15803d' : BLUE.main }}
                  >
                    {outOfStock ? 'Out of stock' : added ? 'Added' : 'Add to cart'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
