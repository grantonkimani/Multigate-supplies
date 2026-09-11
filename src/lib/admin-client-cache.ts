'use client';

type CacheEntry = { at: number; data: unknown };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export function peekAdminJson<T>(url: string): T | undefined {
  const hit = cache.get(url);
  if (!hit) return undefined;
  return hit.data as T;
}

export function putAdminJson(url: string, data: unknown) {
  cache.set(url, { at: Date.now(), data });
}

export function adminJson<T>(url: string, force = false): Promise<T> {
  if (!force) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < 20_000) return Promise.resolve(hit.data as T);
  }
  const existing = inflight.get(url);
  if (existing) return existing as Promise<T>;

  const request = fetch(url, { cache: 'no-store' })
    .then(async (res) => {
      const data = (await res.json().catch(() => null)) as T;
      if (Array.isArray(data)) putAdminJson(url, data);
      return data;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, request);
  return request;
}

export function prefetchAdminTabs() {
  void adminJson('/api/admin/orders');
  void adminJson('/api/admin/products');
  void adminJson('/api/admin/categories');
}
