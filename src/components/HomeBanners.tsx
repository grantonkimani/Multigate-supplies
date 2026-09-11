'use client';

import { useEffect, useState } from 'react';
import type { Banner } from '@/lib/types';
import { StoreImage } from './StoreImage';

export function HomeBanners({ banners }: { banners: Banner[] }) {
  const slides = banners.filter((b) => b.image_url);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((n) => (n + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;
  const current = slides[Math.min(index, slides.length - 1)];
  const src = current.image_url as string;

  const frame = (
    <div className="relative w-full aspect-[21/9] min-h-[240px] max-h-[480px] overflow-hidden bg-slate-200">
      <StoreImage
        src={src}
        alt={current.title}
        className="object-cover"
        sizes="100vw"
        priority
        quality={90}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
        <h2 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-md">{current.title}</h2>
      </div>
    </div>
  );

  return (
    <section className="w-full">
      {current.link_url ? (
        <a href={current.link_url} className="block">
          {frame}
        </a>
      ) : (
        frame
      )}
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 py-3 bg-sky-50">
          {slides.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Show banner ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${i === index ? 'w-8 bg-sky-600' : 'w-2.5 bg-sky-200'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
