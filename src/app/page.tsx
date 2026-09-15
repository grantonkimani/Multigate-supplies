import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomeBanners } from '@/components/HomeBanners';
import { getActiveBanners } from '@/lib/admin-db';
import Link from 'next/link';
import { Package, Truck, HeadphonesIcon, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

const BLUE = {
  dark: '#0c4a6e',
  mid: '#0369a1',
  main: '#0284c7',
  light: '#e0f2fe',
  pageBg: '#dbeafe',
};

export default async function HomePage() {
  let banners: Awaited<ReturnType<typeof getActiveBanners>> = [];
  try {
    banners = await getActiveBanners();
  } catch (e) {
    console.error(e);
  }

  const preloadUrls = banners.map((b) => b.image_url).filter((url): url is string => Boolean(url));

  return (
    <div className="min-h-screen" style={{ backgroundColor: BLUE.pageBg }}>
      {preloadUrls.map((url, i) => (
        <link
          key={url}
          rel="preload"
          as="image"
          href={url}
          fetchPriority={i === 0 ? 'high' : 'low'}
        />
      ))}
      <Header />

      <HomeBanners banners={banners} />

      {/* Hero - blue gradient, inline so it always shows */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${BLUE.dark} 0%, ${BLUE.mid} 35%, ${BLUE.main} 100%)`,
          color: 'white',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20 lg:py-24 relative">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Medical Supplies &amp; Equipment
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5 text-white">
              Trusted healthcare supplies, delivered
            </h1>
            <p className="text-lg sm:text-xl mb-10 max-w-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Quality products for clinics, hospitals, and home care. Reliable delivery and dedicated support.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 sm:px-7 py-3.5 sm:py-4 font-semibold shadow-lg transition hover:shadow-xl"
                style={{ color: BLUE.mid, border: `2px solid ${BLUE.main}` }}
              >
                <Package className="w-5 h-5" strokeWidth={2.5} />
                View Products
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-xl border-2 border-white px-6 sm:px-7 py-3.5 sm:py-4 font-semibold text-white transition hover:bg-white/15"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip - light blue bar */}
      <section className="border-y border-sky-200" style={{ backgroundColor: BLUE.light }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch sm:items-center gap-4 sm:gap-10 font-medium text-slate-800">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm" style={{ color: BLUE.main }}>
                <Shield className="h-5 w-5" strokeWidth={2} />
              </span>
              Quality assured
            </span>
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm" style={{ color: BLUE.main }}>
                <Truck className="h-5 w-5" strokeWidth={2} />
              </span>
              Reliable delivery
            </span>
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm" style={{ color: BLUE.main }}>
                <HeadphonesIcon className="h-5 w-5" strokeWidth={2} />
              </span>
              Trusted by healthcare providers
            </span>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <main className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: BLUE.mid }}>
          Why choose us
        </h2>
        <p className="text-slate-600 mb-12 max-w-xl text-lg">
          We focus on quality, speed, and support so you can focus on care.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { num: 1, title: 'Wide range', desc: 'Medical supplies and equipment for clinics, hospitals, and home care.' },
            { num: 2, title: 'Fast delivery', desc: 'Efficient logistics so you get what you need when you need it.' },
            { num: 3, title: 'Support', desc: 'Dedicated support for orders and product questions.' },
          ].map(({ num, title, desc }) => (
            <div
              key={num}
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300"
              style={{ borderLeft: `4px solid ${BLUE.main}` }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 text-white font-bold text-lg shadow-md"
                style={{ backgroundColor: BLUE.main }}
              >
                {num}
              </div>
              <h3 className="font-semibold text-slate-900 text-xl mb-3">{title}</h3>
              <p className="text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <section className="text-center pt-8 pb-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-4 font-semibold shadow-lg transition hover:shadow-xl hover:opacity-95"
            style={{ backgroundColor: BLUE.main, color: 'white' }}
          >
            Browse all products
            <span aria-hidden>→</span>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
