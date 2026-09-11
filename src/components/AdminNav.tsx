'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  Package,
  FolderTree,
  ShoppingCart,
  BarChart3,
  Truck,
  Tag,
  LifeBuoy,
  Menu,
  LogOut,
  Image as ImageIcon,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/delivery', label: 'Delivery', icon: Truck },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/offers', label: 'Offers', icon: Tag },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
];

export function AdminNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    window.location.href = '/admin/login';
  };

  return (
    <nav className="bg-white border-b border-sky-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex items-center justify-between">
          <div className="flex-1 overflow-x-auto no-scrollbar -mx-2">
            <div className="flex whitespace-nowrap gap-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-4 py-3.5 border-b-2 font-medium text-sm transition-colors ${
                      isActive
                        ? 'border-sky-600 text-sky-700 bg-sky-50/80'
                        : 'border-transparent text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 transition-colors rounded-lg hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="md:hidden">
          <div className="flex items-center justify-between py-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-sky-600 rounded-lg"
            >
              <Menu className="h-5 w-5" />
              <span className="font-medium">Menu</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1 text-sm text-slate-600 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
          {isMobileMenuOpen && (
            <div className="border-t border-sky-100 py-2 flex flex-col">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-sky-100 text-sky-700' : 'text-slate-700 hover:bg-sky-50 hover:text-sky-600'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
