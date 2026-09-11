import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function AccountLoginPage() {
  return (
    <div className="min-h-screen page-bg-light">
      <Header />
      <main className="max-w-md mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-brand mb-4">Account login</h1>
        <p className="text-slate-600 mb-6">Customer account login will appear here.</p>
        <Link href="/" className="text-brand font-semibold hover:underline">
          ← Back to home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
