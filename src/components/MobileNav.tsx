'use client';

import { X, Home, Package, ShoppingCart, Truck, HelpCircle, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/Button';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/track', label: 'Track Order', icon: Truck },
  { href: '/support', label: 'Support', icon: HelpCircle },
  { href: '/account/login', label: 'Account', icon: User },
];

export function MobileNav({ isOpen, onClose, onBack, showBack }: MobileNavProps) {
  if (!isOpen) return null;
  return (
    <>
      <div className="mobile-drawer-backdrop fixed inset-0 bg-black/50 z-[9998]" aria-hidden onClick={onClose} />
      <div className="mobile-drawer-panel fixed top-0 left-0 h-full w-full max-w-[18rem] bg-white shadow-xl z-[9999] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-slate-900">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="rounded-lg">
            <X className="h-5 w-5" />
          </Button>
        </div>
        {showBack && onBack && (
          <button
            type="button"
            onClick={() => { onBack(); onClose(); }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sky-600 font-medium hover:bg-sky-50 transition-colors duration-200 mb-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
        )}
        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-700 hover:bg-sky-50 hover:text-sky-600 font-medium transition-colors duration-200"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
