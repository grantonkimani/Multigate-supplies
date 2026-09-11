import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sky-50">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-slate-600">That link does not exist. Continue shopping or go back home.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white">
            Home
          </Link>
          <Link href="/products" className="rounded-xl border-2 border-sky-200 px-5 py-3 font-semibold text-sky-800">
            Products
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
