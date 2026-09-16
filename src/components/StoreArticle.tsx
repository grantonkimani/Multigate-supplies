import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export function StoreArticle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen page-bg-light">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{title}</h1>
        <div className="space-y-4 text-slate-600 leading-relaxed">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
