import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getProjectRoot } from './local-store';
import type { Product } from './types';

const BUCKET = 'product-images';
const PUBLIC_DIR = path.join(getProjectRoot(), 'public', 'uploads', 'products');
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function uniqueName(ext: string) {
  return `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}.${ext}`;
}

export function isManagedProductImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('/uploads/products/') || url.includes(`/storage/v1/object/public/${BUCKET}/`);
}

export async function saveProductImageFile(file: File): Promise<{ url: string }> {
  const mime = (file.type || '').toLowerCase();
  const ext = ALLOWED[mime];
  if (!ext) {
    throw new Error('Use JPEG, PNG, WebP, GIF, or AVIF');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image too large (max 8MB)');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = uniqueName(ext);

  const supabase = storageClient();
  if (supabase) {
    await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES }).catch(() => undefined);
    const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: '604800',
    });
    if (!error) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
      if (data?.publicUrl) return { url: data.publicUrl };
    }
  }

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, filename), buffer);
  return { url: `/uploads/products/${filename}` };
}

export function deleteManagedProductImage(url: string) {
  if (!isManagedProductImage(url)) return;

  const supabase = storageClient();
  if (supabase && url.includes(`/storage/v1/object/public/${BUCKET}/`)) {
    const name = url.split(`/storage/v1/object/public/${BUCKET}/`)[1]?.split('?')[0];
    if (name) {
      void supabase.storage.from(BUCKET).remove([decodeURIComponent(name)]);
    }
    return;
  }

  const marker = '/uploads/products/';
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const name = url.slice(idx + marker.length).split('?')[0];
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return;
  const filePath = path.join(PUBLIC_DIR, name);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore missing files
  }
}

export function deleteProductImagesForProduct(product: Pick<Product, 'image_url' | 'image_urls'>) {
  const urls = [product.image_url, ...(product.image_urls ?? [])].filter((u): u is string => Boolean(u));
  const seen = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    deleteManagedProductImage(url);
  }
}
