'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="text-white border-t border-[#0c4a6e]" style={{ backgroundColor: '#0369a1' }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          <div>
            <h3 className="text-xl font-semibold mb-3 text-white">Contact Us</h3>
            <div className="space-y-2 break-words text-base" style={{ color: '#e0f2fe' }}>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" style={{ color: '#bae6fd' }} />
                <Link href="tel:0757567614" className="hover:text-white transition">0757567614</Link>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" style={{ color: '#bae6fd' }} />
                <Link href="tel:0115970558" className="hover:text-white transition">Shop number: 0115 970 558</Link>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0" style={{ color: '#bae6fd' }} />
                <Link href="mailto:support@multigate.co.ke" className="hover:text-white transition">support@multigate.co.ke</Link>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#bae6fd' }} />
                <span>Nairobi CBD, Mithoo Business Centre, 3rd floor T54, along Moi Avenue, opposite The Baazar Building</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-3 text-white">Quick Links</h3>
            <div className="grid grid-cols-2 gap-2 text-base" style={{ color: '#e0f2fe' }}>
              <Link href="/products" className="hover:text-white transition">Products</Link>
              <Link href="/support" className="hover:text-white transition">Support</Link>
              <Link href="/track" className="hover:text-white transition">Track Order</Link>
            </div>
          </div>
          <div className="text-center md:text-right">
            <h3 className="text-2xl font-bold text-white mb-2">Multigate</h3>
            <p className="text-base mt-0" style={{ color: '#bae6fd' }}>Medical Supplies &amp; Equipment</p>
            <p className="text-sm mt-2" style={{ color: '#7dd3fc' }}>&copy; 2026 All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
