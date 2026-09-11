import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function TrackPage() {
  return (
    <div className="min-h-screen page-bg-light">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Track order</h1>
        <p className="text-slate-600">Enter your order ID to track your delivery.</p>
      </main>
      <Footer />
    </div>
  );
}
