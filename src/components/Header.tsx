'use client';

import { ShoppingCart, User, Menu, HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { useCart } from '@/contexts/CartContext';
import { MobileNav } from './MobileNav';
import { HelpDrawer } from './HelpDrawer';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { usePathname, useRouter } from 'next/navigation';

const BLUE_MAIN = '#0284c7';
const BLUE_MID = '#0369a1';
const BLUE_LIGHT = '#e0f2fe';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/track', label: 'Track Order' },
  { href: '/support', label: 'Support' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) document.body.classList.add('menu-open');
    else document.body.classList.remove('menu-open');
    return () => document.body.classList.remove('menu-open');
  }, [isMobileMenuOpen]);

  const cartCount = isHydrated ? state.items.reduce((t, i) => t + (i.quantity || 1), 0) : 0;
  const isHome = pathname === '/';

  const handleBack = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (typeof window === 'undefined') return;
    // Go to the previous page in browser history; if none, go home
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <header
      className="sticky top-0 z-50 w-full border-b overflow-x-hidden shadow-sm transition-shadow duration-200"
      style={{ backgroundColor: 'white', borderColor: '#bae6fd' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between min-w-0 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink min-w-0">
            <button
              type="button"
              onClick={(e) => handleBack(e)}
              onPointerDown={(e) => e.stopPropagation()}
              className={`nav-motion relative z-10 items-center justify-center gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0 ${isHome ? 'hidden' : 'inline-flex'}`}
              style={{ color: BLUE_MID, backgroundColor: BLUE_LIGHT }}
              aria-label="Go back to previous page"
              tabIndex={isHome ? -1 : 0}
              aria-hidden={isHome}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <Link
              href="/"
              className="flex items-center flex-shrink-0 min-w-0 transition-opacity duration-200 hover:opacity-90"
            >
              <BrandLogo className="h-10 sm:h-12 w-auto max-w-[220px] sm:max-w-[280px] object-contain" />
            </Link>
          </div>

          <nav className="hidden md:flex items-center" aria-label="Main navigation" style={{ gap: '0.25rem' }}>
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className="nav-motion header-nav-link inline-block rounded-lg px-4 py-2.5 text-base font-semibold whitespace-nowrap transition-all duration-200"
                  style={{
                    marginLeft: '0.25rem',
                    marginRight: '0.25rem',
                    color: isActive ? BLUE_MID : '#334155',
                    backgroundColor: isActive ? BLUE_LIGHT : 'transparent',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center flex-shrink-0" style={{ gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              aria-label="Help"
              className="nav-motion header-icon-btn hidden md:inline-flex items-center justify-center h-10 w-10 rounded-lg transition-all duration-200"
              style={{ color: BLUE_MID }}
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <Link
              href="/cart"
              className="nav-motion header-icon-btn inline-flex items-center justify-center h-10 w-10 rounded-lg text-slate-700 transition-all duration-200 relative"
            >
              <ShoppingCart className="h-5 w-5" />
              <span
                className="absolute top-0 right-0 text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center font-semibold text-white -translate-y-0.5 translate-x-0.5 transition-transform duration-200"
                style={{ backgroundColor: BLUE_MAIN }}
              >
                {cartCount}
              </span>
            </Link>
            <Link
              href="/account/login"
              className="nav-motion header-icon-btn inline-flex items-center justify-center h-10 w-10 rounded-lg text-slate-700 transition-all duration-200"
            >
              <User className="h-5 w-5" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="nav-motion md:hidden text-slate-700 h-10 w-10"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onBack={handleBack}
        showBack={!isHome}
      />
      <HelpDrawer isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </header>
  );
}
