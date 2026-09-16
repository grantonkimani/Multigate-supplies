'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

const WHATSAPP_URL = 'https://wa.me/254115970558';

const socials = [
  {
    href: 'https://www.facebook.com/share/1LnQZrWjmG/',
    label: 'Multigate on Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M22 12.07C22 6.5 17.52 2 12 2S2 6.5 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H8.08v-2.91h2.36V9.41c0-2.33 1.39-3.62 3.52-3.62.99 0 2.03.18 2.03.18v2.24h-1.14c-1.13 0-1.48.7-1.48 1.42v1.7h2.52l-.4 2.91h-2.12V22c4.78-.75 8.44-4.91 8.44-9.93z" />
      </svg>
    ),
  },
  {
    href: WHATSAPP_URL,
    label: 'Multigate on WhatsApp',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    href: 'https://www.instagram.com/multigatemedicalsupplies',
    label: 'Multigate on Instagram',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z" />
      </svg>
    ),
  },
  {
    href: 'https://www.tiktok.com/@multigatemedicals',
    label: 'Multigate on TikTok',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M14.5 3c.4 2.4 1.8 4.1 4.2 4.4v3.1c-1.5 0-2.9-.5-4.1-1.3v6.3c0 3.4-2.7 6.2-6.2 6.2A6.2 6.2 0 012.2 15.5c0-3.4 2.8-6.2 6.2-6.2.3 0 .7 0 1 .1v3.2a3 3 0 00-1-.2 3.1 3.1 0 00-3.1 3.1 3.1 3.1 0 003.1 3.1 3.1 3.1 0 003.1-3.1V3h2.9z" />
      </svg>
    ),
  },
];

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/products', label: 'Shop' },
  { href: '/support', label: 'Contact' },
  { href: '/track', label: 'Track Order' },
];

const policies = [
  { href: '/faq', label: 'FAQ' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms and Conditions' },
];

export function Footer() {
  return (
    <>
      <footer className="text-white border-t border-[#0c4a6e]" style={{ backgroundColor: '#0369a1' }}>
        <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-white">Contact Us</h3>
              <div className="space-y-2 break-words text-base" style={{ color: '#e0f2fe' }}>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0" style={{ color: '#bae6fd' }} />
                  <Link href="tel:0757567614" className="hover:text-white transition">
                    0757567614
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0" style={{ color: '#bae6fd' }} />
                  <Link href="tel:0115970558" className="hover:text-white transition">
                    Shop number: 0115 970 558
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 flex-shrink-0" style={{ color: '#bae6fd' }} />
                  <Link href="mailto:support@multigate.co.ke" className="hover:text-white transition">
                    support@multigate.co.ke
                  </Link>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#bae6fd' }} />
                  <span>
                    Nairobi CBD, Mithoo Business Centre, 3rd floor T54, along Moi Avenue, opposite The Baazar
                    Building
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-white">Quick Links</h3>
                <div className="flex flex-col gap-2 text-base" style={{ color: '#e0f2fe' }}>
                  {quickLinks.map((item) => (
                    <Link key={item.href} href={item.href} className="hover:text-white transition">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-white">Policies</h3>
                <div className="flex flex-col gap-2 text-base" style={{ color: '#e0f2fe' }}>
                  {policies.map((item) => (
                    <Link key={item.href} href={item.href} className="hover:text-white transition">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <BrandLogo className="h-16 w-auto max-w-[240px] object-contain bg-white rounded-lg p-2 mx-auto md:ml-auto md:mr-0" />
              <p className="text-sm mt-3" style={{ color: '#7dd3fc' }}>
                &copy; 2026 Multigate Medical Supplies Limited. All rights reserved.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-white">Site Disclaimer</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base leading-relaxed" style={{ color: '#e0f2fe' }}>
              <li>
                Whilst we at Multigate Medical Supplies Limited try to ensure the information on this website is
                accurate, frequent change of prices of our products may not reflect immediately.
              </li>
              <li>All products are subject to availability.</li>
              <li>Orders are confirmed after payment is received and recorded by our team.</li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {socials.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white hover:text-sky-800 transition"
              >
                {item.icon}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Multigate on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe5d] transition"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </>
  );
}
