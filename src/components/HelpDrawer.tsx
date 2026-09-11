'use client';

import { X, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from './ui/Button';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpDrawer({ isOpen, onClose }: HelpDrawerProps) {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9998]" aria-hidden onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl z-[9999] p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Need help?</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-slate-600 text-sm mb-4">
          Contact Multigate Medical Supplies for product or order support.
        </p>
        <div className="space-y-3">
          <a
            href="tel:+254757567614"
            className="flex items-center gap-2 text-slate-700 hover:text-sky-600"
          >
            <Phone className="h-4 w-4 flex-shrink-0" />
            0757567614
          </a>
          <a
            href="tel:0115970558"
            className="flex items-center gap-2 text-slate-700 hover:text-sky-600"
          >
            <Phone className="h-4 w-4 flex-shrink-0" />
            Shop number: 0115 970 558
          </a>
          <a
            href="mailto:support@multigate.co.ke"
            className="flex items-center gap-2 text-slate-700 hover:text-sky-600"
          >
            <Mail className="h-4 w-4 flex-shrink-0" />
            support@multigate.co.ke
          </a>
          <p className="flex items-start gap-2 text-slate-700">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
            Nairobi CBD, Mithoo Business Centre, 3rd floor T54, along Moi Avenue, opposite The Baazar Building
          </p>
        </div>
      </div>
    </>
  );
}
