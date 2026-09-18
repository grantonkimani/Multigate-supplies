import type { Product } from '@/lib/types';

export function productPhotoUrls(product: Pick<Product, 'image_url' | 'image_urls'>): string[] {
  const raw = [product.image_url, ...(product.image_urls ?? [])];
  const unique: string[] = [];
  for (const value of raw) {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url || unique.includes(url)) continue;
    unique.push(url);
    if (unique.length >= 2) break;
  }
  return unique;
}
