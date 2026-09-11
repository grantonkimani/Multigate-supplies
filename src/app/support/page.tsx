import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function SupportPage() {
  return (
    <div className="min-h-screen page-bg-light">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Support</h1>
        <p className="text-slate-600 mb-4">Contact us for product or order support.</p>
        <p className="text-slate-600">Phone: 0757567614</p>
        <p className="text-slate-600">Shop number: 0115 970 558</p>
        <p className="text-slate-600">Email: support@multigate.co.ke</p>
        <p className="text-slate-600 mt-4">
          Nairobi CBD, Mithoo Business Centre, 3rd floor T54, along Moi Avenue, opposite The Baazar Building
        </p>
      </main>
      <Footer />
    </div>
  );
}
