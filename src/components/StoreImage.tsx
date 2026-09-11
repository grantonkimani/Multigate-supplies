'use client';

import Image from 'next/image';
import { useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
};

export function StoreImage({ src, alt, className, sizes = '100vw', priority = false, quality = 90 }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={`bg-slate-100 ${className ?? ''}`} aria-hidden />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      quality={quality}
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}
