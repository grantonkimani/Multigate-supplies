'use client';

import { AdminNav } from '@/components/AdminNav';
import { BrandLogo } from '@/components/BrandLogo';
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
              <BrandLogo className="h-10 w-auto max-w-[200px] object-contain bg-white rounded-md p-1" />
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
