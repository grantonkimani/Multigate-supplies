'use client';

import { AdminNav } from '@/components/AdminNav';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#e8f4fc]">
      <header className="sticky top-0 z-20 bg-sky-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                M
              </div>
              <div>
                <span className="font-semibold text-white block leading-tight">Multigate Admin</span>
                <span className="text-sky-200 text-xs">Medical Supplies</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </div>
    </div>
  );
}
