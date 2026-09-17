/**
 * Admin data layer: uses Supabase when env is set, otherwise in-memory store
 * so the admin UI works without a database. For production, set up Supabase
 * and run the schema in supabase-schema.sql.
 */

import { createClient as createSupabaseJs } from '@supabase/supabase-js';
import { createClient } from './supabase';
import { loadLocalStore, saveLocalStore } from './local-store';
import { deleteProductImagesForProduct } from './product-images';
import type { Category, Product, Order, OrderItem, Banner, Offer, ProductOffer, ProductWithOffer } from './types';

const memory = loadLocalStore();

function hydrate() {
  const disk = loadLocalStore();
  memory.categories = disk.categories;
  memory.banners = disk.banners;
  memory.offers = disk.offers;
  memory.deleted_product_ids = disk.deleted_product_ids ?? [];
  memory.deleted_order_ids = disk.deleted_order_ids ?? [];
  const removedProducts = new Set(memory.deleted_product_ids);
  memory.products = disk.products.filter((p) => !removedProducts.has(p.id));
  const removedOrders = new Set(memory.deleted_order_ids);
  memory.orders = disk.orders.filter((o) => !removedOrders.has(o.id));
}

function orderStamp(order: { updated_at?: string; created_at?: string }) {
  return String(order.updated_at || order.created_at || '');
}

function normalizeItems(items: unknown): OrderItem[] {
  let parsed: unknown = items;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((row) => {
      const quantity = Math.max(1, Number((row as { quantity?: unknown })?.quantity) || 1);
      const unit_price = Number(
        (row as { unit_price?: unknown; price?: unknown })?.unit_price ??
          (row as { price?: unknown })?.price
      );
      const totalRaw = Number((row as { total?: unknown })?.total);
      const name = String(
        (row as { product_name?: unknown; name?: unknown })?.product_name ??
          (row as { name?: unknown })?.name ??
          ''
      ).trim();
      return {
        product_id: String((row as { product_id?: unknown })?.product_id ?? ''),
        product_name: name,
        quantity,
        unit_price: Number.isFinite(unit_price) ? unit_price : 0,
        total: Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : (Number.isFinite(unit_price) ? unit_price : 0) * quantity,
      };
    })
    .filter((item) => item.product_name);
}

function normalizeOrder(row: Order): Order {
  return {
    ...row,
    items: normalizeItems((row as Order).items),
  };
}

function mergeOrder(prev: Order | undefined, next: Order): Order {
  const a = prev ? normalizeOrder(prev) : undefined;
  const b = normalizeOrder(next);
  if (!a) return b;
  const newer = orderStamp(b) >= orderStamp(a) ? b : a;
  const older = newer === b ? a : b;
  return {
    ...older,
    ...newer,
    items: newer.items.length ? newer.items : older.items,
  };
}

function persist() {
  const disk = loadLocalStore();
  memory.deleted_order_ids = Array.from(
    new Set([...(disk.deleted_order_ids ?? []), ...(memory.deleted_order_ids ?? [])])
  );
  const removed = new Set(memory.deleted_order_ids);
  const byId = new Map<string, Order & { id: string }>();
  for (const row of disk.orders) {
    if (removed.has(row.id)) continue;
    const merged = mergeOrder(undefined, row) as Order & { id: string };
    byId.set(merged.id, merged);
  }
  for (const row of memory.orders) {
    if (removed.has(row.id)) continue;
    const prev = byId.get(row.id);
    const merged = mergeOrder(prev, row) as Order & { id: string };
    byId.set(merged.id, merged);
  }
  memory.orders = Array.from(byId.values()).sort((a, b) =>
    String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  );
  saveLocalStore(memory);
}

function localWrite<T>(fn: () => T): T {
  hydrate();
  const result = fn();
  persist();
  return result;
}

function uuid() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function dataWriteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (url && key) {
    return createSupabaseJs(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return createClient();
}

function isAbortError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error);
  return /abort/i.test(message);
}

async function queryWithAbort<T>(
  run: (signal: AbortSignal) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  ms: number
): Promise<{ data: T | null; error: { message: string } | null }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await run(ac.signal);
  } catch (error) {
    if (ac.signal.aborted || isAbortError(error)) {
      return { data: null, error: { message: 'aborted' } };
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function mapProductRow(p: Product): Product & { id: string } {
  const urls = (p as Product).image_urls;
  return {
    ...(p as Product & { id: string }),
    id: String((p as Product).id),
    price: Number((p as Product).price) || 0,
    stock_quantity: Number((p as Product).stock_quantity) || 0,
    is_active: (p as Product).is_active !== false,
    image_urls: Array.isArray(urls) ? urls : null,
  };
}

function missingImageUrlsColumn(message: string) {
  return /image_urls/i.test(message);
}

async function fetchProductsFromSupabase(): Promise<(Product & { id: string })[] | null> {
  const supabase = dataWriteClient();
  if (!supabase) return null;

  const columnSets = [
    'id,category_id,name,slug,description,price,image_url,image_urls,stock_quantity,is_active,created_at,updated_at',
    'id,category_id,name,slug,description,price,image_url,stock_quantity,is_active,created_at,updated_at',
    '*',
  ];

  for (const columns of columnSets) {
    const collected: Product[] = [];
    let from = 0;
    const pageSize = 1000;
    let failed = false;
    while (true) {
      let query = supabase.from('products').select(columns).range(from, from + pageSize - 1);
      query = query.order('created_at', { ascending: false });
      let { data, error } = await query;
      if (error) {
        const retry = await supabase.from('products').select(columns).range(from, from + pageSize - 1);
        data = retry.data;
        error = retry.error;
      }
      if (error) {
        if (missingImageUrlsColumn(error.message)) {
          failed = true;
          break;
        }
        console.error('fetchProductsFromSupabase', error.message);
        return collected.length ? collected.map(mapProductRow).filter((p) => p.id) : null;
      }
      if (!Array.isArray(data) || data.length === 0) break;
      collected.push(...(data as unknown as Product[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    if (!failed) {
      return collected.map(mapProductRow).filter((p) => p.id);
    }
  }
  return null;
}

// ---- Categories ----
export async function getCategories(): Promise<Category[]> {
  hydrate();
  const byId = new Map<string, Category>();
  for (const c of memory.categories as Category[]) byId.set(c.id, c);
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await queryWithAbort(
      (signal) =>
        supabase
          .from('categories')
          .select('id,name,slug,description,sort_order,created_at')
          .order('sort_order')
          .abortSignal(signal),
      4000
    );
    if (error && !isAbortError(error)) console.error('getCategories', error.message);
    if (!error && data) {
      for (const c of data as Category[]) byId.set(c.id, c);
    }
  }
  const list = Array.from(byId.values()).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  memory.categories = list as (Category & { id: string })[];
  return list;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  hydrate();
  const local = memory.categories.find((c) => c.slug === normalized);
  if (local) return local as Category;
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('id,name,slug,description,sort_order,created_at')
      .eq('slug', normalized)
      .maybeSingle();
    if (!error && data) return data as Category;
  }
  return null;
}

export async function createCategory(input: { name: string; description?: string }): Promise<Category> {
  const slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  hydrate();
  const sort_order = memory.categories.reduce((max, c) => Math.max(max, Number(c.sort_order) || 0), -1) + 1;
  const supabase = dataWriteClient();
  let created: Category | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: input.name, slug, description: input.description ?? null, sort_order })
      .select('id,name,slug,description,sort_order,created_at')
      .single();
    if (error) {
      console.error('createCategory', error.message);
      throw new Error(error.message);
    }
    if (data) created = data as Category;
  }
  return localWrite(() => {
    const newCat: Category & { id: string } = created
      ? { ...(created as Category & { id: string }) }
      : {
          id: uuid(),
          name: input.name,
          slug,
          description: input.description ?? null,
          sort_order,
          created_at: new Date().toISOString(),
        };
    if (!memory.categories.some((c) => c.id === newCat.id)) memory.categories.push(newCat);
    return newCat as Category;
  });
}

export async function updateCategory(
  id: string,
  input: { name?: string; description?: string | null; sort_order?: number }
): Promise<Category | null> {
  const supabase = dataWriteClient();
  if (supabase) {
    const updatePayload: Record<string, unknown> = {};
    if (input.name !== undefined) {
      updatePayload.name = input.name;
      updatePayload.slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.sort_order !== undefined) updatePayload.sort_order = input.sort_order;
    if (Object.keys(updatePayload).length) {
      const { error } = await supabase.from('categories').update(updatePayload).eq('id', id);
      if (error) {
        console.error('updateCategory', error.message);
        throw new Error(error.message);
      }
    }
  }
  return localWrite(() => {
    const idx = memory.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    if (input.name !== undefined) {
      memory.categories[idx].name = input.name;
      memory.categories[idx].slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (input.description !== undefined) memory.categories[idx].description = input.description;
    if (input.sort_order !== undefined) memory.categories[idx].sort_order = input.sort_order;
    return memory.categories[idx] as Category;
  });
}

export async function deleteCategory(id: string): Promise<boolean> {
  hydrate();
  if (memory.products.some((p) => p.category_id === id)) {
    throw new Error('This category still has products. Move or delete those products first.');
  }
  const supabase = dataWriteClient();
  let remoteDeleted = false;
  if (supabase) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23503') {
        throw new Error('This category still has products. Move or delete those products first.');
      }
      console.error('deleteCategory', error.message);
      throw new Error(error.message);
    } else {
      remoteDeleted = true;
    }
  }
  const localDeleted = localWrite(() => {
    const idx = memory.categories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    memory.categories.splice(idx, 1);
    return true;
  });
  return remoteDeleted || localDeleted;
}

export async function reorderCategories(orderedIds: string[]): Promise<Category[]> {
  const supabase = dataWriteClient();
  if (supabase) {
    await Promise.all(
      orderedIds.map((id, i) => supabase.from('categories').update({ sort_order: i }).eq('id', id))
    );
  }
  return localWrite(() => {
    const byId = new Map(memory.categories.map((c) => [c.id, c]));
    orderedIds.forEach((id, i) => {
      const c = byId.get(id);
      if (c) c.sort_order = i;
    });
    memory.categories.sort((a, b) => a.sort_order - b.sort_order);
    return memory.categories as Category[];
  });
}

// ---- Banners ----
export async function getBanners(): Promise<Banner[]> {
  hydrate();
  const local = [...memory.banners] as Banner[];
  const byId = new Map<string, Banner>();
  for (const b of local) byId.set(b.id, b);
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await queryWithAbort(
      (signal) =>
        supabase
          .from('banners')
          .select('id,title,image_url,link_url,sort_order,is_active,created_at')
          .order('sort_order')
          .abortSignal(signal),
      5000
    );
    if (error && !isAbortError(error)) console.error('getBanners', error.message);
    if (!error && data) {
      for (const b of data as Banner[]) byId.set(b.id, b);
    }
  }
  const list = Array.from(byId.values()).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  memory.banners = list as (Banner & { id: string })[];
  return list;
}

export async function createBanner(input: {
  title: string;
  image_url?: string | null;
  link_url?: string | null;
  is_active?: boolean;
}): Promise<Banner> {
  hydrate();
  const sortOrder = memory.banners.reduce((max, b) => Math.max(max, Number(b.sort_order) || 0), -1) + 1;
  const supabase = dataWriteClient();
  let created: Banner | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('banners')
      .insert({
        title: input.title.trim(),
        image_url: input.image_url?.trim() || null,
        link_url: input.link_url?.trim() || null,
        sort_order: sortOrder,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();
    if (error) {
      console.error('createBanner', error.message);
      throw new Error(error.message);
    }
    if (data) created = data as Banner;
  }
  return localWrite(() => {
    const newBanner: Banner & { id: string } = created
      ? { ...(created as Banner & { id: string }) }
      : {
          id: uuid(),
          title: input.title.trim(),
          image_url: input.image_url?.trim() || null,
          link_url: input.link_url?.trim() || null,
          sort_order: sortOrder,
          is_active: input.is_active ?? true,
          created_at: new Date().toISOString(),
        };
    if (!memory.banners.some((b) => b.id === newBanner.id)) memory.banners.push(newBanner);
    memory.banners.sort((a, b) => a.sort_order - b.sort_order);
    return newBanner as Banner;
  });
}

export async function updateBanner(
  id: string,
  input: Partial<{
    title: string;
    image_url: string | null;
    link_url: string | null;
    sort_order: number;
    is_active: boolean;
  }>
): Promise<Banner | null> {
  const supabase = dataWriteClient();
  if (supabase) {
    const payload: Record<string, unknown> = {};
    if (typeof input?.title === 'string') payload.title = input.title.trim();
    if (input?.image_url !== undefined) payload.image_url = input.image_url;
    if (input?.link_url !== undefined) payload.link_url = input.link_url;
    if (input?.sort_order !== undefined) payload.sort_order = input.sort_order;
    if (input?.is_active !== undefined) payload.is_active = input.is_active;
    if (Object.keys(payload).length) {
      const { error } = await supabase.from('banners').update(payload).eq('id', id);
      if (error) {
        console.error('updateBanner', error.message);
        throw new Error(error.message);
      }
    }
  }
  return localWrite(() => {
    const idx = memory.banners.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    if (input?.title !== undefined) memory.banners[idx].title = input.title.trim();
    if (input?.image_url !== undefined) memory.banners[idx].image_url = input.image_url;
    if (input?.link_url !== undefined) memory.banners[idx].link_url = input.link_url;
    if (input?.sort_order !== undefined) memory.banners[idx].sort_order = input.sort_order;
    if (input?.is_active !== undefined) memory.banners[idx].is_active = input.is_active;
    return memory.banners[idx] as Banner;
  });
}

export async function deleteBanner(id: string): Promise<boolean> {
  const supabase = dataWriteClient();
  let remoteDeleted = false;
  if (supabase) {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) {
      console.error('deleteBanner', error.message);
      throw new Error(error.message);
    }
    remoteDeleted = true;
  }
  const localDeleted = localWrite(() => {
    const idx = memory.banners.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    memory.banners.splice(idx, 1);
    return true;
  });
  return remoteDeleted || localDeleted;
}

export async function reorderBanners(orderedIds: string[]): Promise<Banner[]> {
  const supabase = dataWriteClient();
  if (supabase) {
    await Promise.all(
      orderedIds.map((id, i) => supabase.from('banners').update({ sort_order: i }).eq('id', id))
    );
  }
  return localWrite(() => {
    const byId = new Map(memory.banners.map((b) => [b.id, b]));
    orderedIds.forEach((id, i) => {
      const b = byId.get(id);
      if (b) b.sort_order = i;
    });
    memory.banners.sort((a, b) => a.sort_order - b.sort_order);
    return memory.banners as Banner[];
  });
}

export async function getActiveBanners(): Promise<Banner[]> {
  const banners = await getBanners();
  return banners.filter((b) => b.is_active !== false && Boolean(b.image_url));
}

// ---- Products ----
export async function getProducts(): Promise<Product[]> {
  const remote = await fetchProductsFromSupabase();
  if (remote && remote.length) {
    memory.products = remote;
  } else {
    hydrate();
  }
  const cats = await getCategories();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const source =
    remote && remote.length ? remote : (memory.products as Product[]);
  return source.map((p) => ({
    ...p,
    category: p.category ?? catById.get(p.category_id),
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((p) => p.id === id) ?? null;
}

export async function createProduct(input: {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string | null;
  image_urls?: string[] | null;
  stock_quantity?: number;
}): Promise<Product> {
  const slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const now = new Date().toISOString();
  const product: Product & { id: string } = {
    id: uuid(),
    category_id: input.category_id,
    name: input.name,
    slug,
    description: input.description ?? null,
    price: input.price,
    image_url: input.image_url ?? null,
    image_urls: input.image_urls ?? null,
    stock_quantity: input.stock_quantity ?? 0,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  const row = {
    id: product.id,
    category_id: product.category_id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    image_url: product.image_url,
    image_urls: product.image_urls,
    stock_quantity: product.stock_quantity,
    is_active: true,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };

  const supabase = dataWriteClient();
  if (supabase) {
    let lastError: { message: string } | null = null;
    const payloads: Record<string, unknown>[] = [row];
    if (row.image_urls == null) {
      const { image_urls: _omit, ...withoutUrls } = row;
      payloads.unshift(withoutUrls);
    } else {
      const { image_urls: _omit, ...withoutUrls } = row;
      payloads.push(withoutUrls);
    }
    let saved = false;
    for (const payload of payloads) {
      const { error } = await queryWithAbort(
        (signal) => supabase.from('products').insert(payload).abortSignal(signal),
        15000
      );
      lastError = error;
      if (!error) {
        saved = true;
        break;
      }
      if (!missingImageUrlsColumn(error.message) && !isAbortError(error)) break;
    }
    if (!saved) {
      const message = lastError?.message || 'Could not save the product to the database';
      throw new Error(
        isAbortError(lastError) ? 'Saving the product timed out. Try again.' : message
      );
    }
  }

  return localWrite(() => {
    memory.deleted_product_ids = memory.deleted_product_ids.filter((x) => x !== product.id);
    if (!memory.products.some((p) => p.id === product.id)) {
      memory.products.unshift(product);
    }
    return product;
  });
}

function productUpdatePatch(
  input: Partial<{
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    image_urls: string[] | null;
    stock_quantity: number;
    is_active: boolean;
  }>
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === 'is_active' && typeof value !== 'boolean') continue;
    if (key === 'stock_quantity' && (typeof value !== 'number' || !Number.isFinite(value))) continue;
    if (key === 'price' && (typeof value !== 'number' || !Number.isFinite(value))) continue;
    patch[key] = value;
  }
  return patch;
}

export async function updateProduct(
  id: string,
  input: Partial<{
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    image_urls: string[] | null;
    stock_quantity: number;
    is_active: boolean;
  }>
): Promise<Product | null> {
  hydrate();
  const patch = productUpdatePatch(input);
  if (typeof patch.name === 'string') {
    patch.slug = String(patch.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  const supabase = dataWriteClient();
  if (supabase) {
    const payloads: Record<string, unknown>[] = [patch];
    if ('image_urls' in patch) {
      const { image_urls: _omit, ...withoutUrls } = patch;
      payloads.push(withoutUrls);
    }
    let saved = false;
    let lastError: { message: string } | null = null;
    for (const payload of payloads) {
      const { error } = await queryWithAbort(
        (signal) => supabase.from('products').update(payload).eq('id', id).abortSignal(signal),
        15000
      );
      lastError = error;
      if (!error) {
        saved = true;
        break;
      }
      if (!missingImageUrlsColumn(error.message) && !isAbortError(error)) break;
    }
    if (!saved && lastError && !isAbortError(lastError)) {
      throw new Error(lastError.message);
    }
  }

  return localWrite(() => {
    const idx = memory.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const p = memory.products[idx];
    Object.assign(p, patch);
    return { ...p } as Product;
  });
}

export async function deleteProduct(id: string): Promise<boolean> {
  hydrate();
  const existing = memory.products.find((p) => p.id === id) as Product | undefined;

  const localDeleted = localWrite(() => {
    if (!memory.deleted_product_ids.includes(id)) memory.deleted_product_ids.push(id);
    const before = memory.products.length;
    memory.products = memory.products.filter((p) => p.id !== id);
    memory.offers = memory.offers.filter((o) => o.product_id !== id);
    return memory.products.length < before || Boolean(existing);
  });

  const supabase = dataWriteClient();
  let remoteDeleted = !supabase;
  if (supabase) {
    try {
      await queryWithAbort(
        (signal) => supabase.from('offers').delete().eq('product_id', id).abortSignal(signal),
        8000
      );
      let lastError: { message: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await queryWithAbort(
          (signal) =>
            supabase.from('products').delete().eq('id', id).select('id').abortSignal(signal),
          15000
        );
        lastError = error;
        if (!error) {
          remoteDeleted = true;
          break;
        }
      }
      if (!remoteDeleted && lastError && !isAbortError(lastError)) {
        console.error('deleteProduct supabase error:', lastError);
      }
    } catch (e) {
      console.error('deleteProduct', e);
      remoteDeleted = false;
    }
  }
  if (existing && remoteDeleted) deleteProductImagesForProduct(existing);
  return localDeleted || remoteDeleted;
}

// ---- Offers ----
function computePercentOff(originalPrice: number, offerPrice: number): number {
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) return 0;
  if (!Number.isFinite(offerPrice) || offerPrice <= 0) return 0;
  const pct = ((originalPrice - offerPrice) / originalPrice) * 100;
  if (!Number.isFinite(pct) || pct < 0) return 0;
  // Store as whole percent to keep UI clean
  return Math.max(0, Math.round(pct));
}

function mapOfferRow(o: {
  product_id?: unknown;
  offer_price?: unknown;
  percent_off?: unknown;
  is_active?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}): Offer {
  return {
    product_id: String(o.product_id ?? ''),
    offer_price: Number(o.offer_price),
    percent_off: Number(o.percent_off),
    is_active: o.is_active !== false,
    created_at: String(o.created_at ?? ''),
    updated_at: String(o.updated_at ?? ''),
  };
}

async function fetchOffersFromSupabase(): Promise<Offer[] | null> {
  const supabase = dataWriteClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('offers')
    .select('product_id,offer_price,percent_off,is_active,created_at,updated_at');
  if (error) {
    console.error('fetchOffersFromSupabase', error.message);
    return null;
  }
  if (!Array.isArray(data)) return null;
  return data.map((row) => mapOfferRow(row)).filter((o) => o.product_id);
}

export async function getOffersByProductIds(productIds: string[]): Promise<Offer[]> {
  if (!productIds.length) return [];
  const wanted = new Set(productIds.map((id) => String(id)));
  const remote = await fetchOffersFromSupabase();
  if (remote) {
    memory.offers = remote;
    return remote.filter((o) => wanted.has(o.product_id));
  }
  hydrate();
  return memory.offers.filter((o) => wanted.has(o.product_id));
}

export async function getActiveOffersByProductIds(productIds: string[]): Promise<Record<string, ProductOffer>> {
  const offers = await getOffersByProductIds(productIds);
  const out: Record<string, ProductOffer> = {};
  for (const o of offers) {
    if (!o.is_active) continue;
    out[o.product_id] = {
      offer_price: o.offer_price,
      percent_off: o.percent_off,
      is_active: o.is_active,
    };
  }
  return out;
}

export async function upsertOffersForProducts(input: {
  product_ids: string[];
  offer_price: number;
  is_active?: boolean;
}): Promise<Offer[]> {
  const productIds = input.product_ids;
  const offerPrice = input.offer_price;
  const isActive = input.is_active ?? true;

  if (!productIds.length) return [];
  if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
    throw new Error('offer_price must be > 0');
  }

  const products = await getProducts();
  const productsById = new Map(products.map((p) => [p.id, p]));
  const missing = productIds.filter((id) => !productsById.has(id));
  if (missing.length) throw new Error('Some products not found');

  for (const id of productIds) {
    const p = productsById.get(id);
    if (!p) continue;
    if (!Number.isFinite(p.price) || p.price <= 0) continue;
    if (offerPrice >= p.price) {
      throw new Error(`Offer price must be less than original price for ${p.name}`);
    }
  }

  const records: Offer[] = productIds.map((id) => {
    const p = productsById.get(id)!;
    const percent_off = computePercentOff(p.price, offerPrice);
    const now = new Date().toISOString();
    return {
      product_id: id,
      offer_price: offerPrice,
      percent_off,
      is_active: isActive,
      created_at: now,
      updated_at: now,
    };
  });

  const supabase = dataWriteClient();
  if (supabase) {
    const { error } = await supabase.from('offers').upsert(
      records.map((r) => ({
        product_id: r.product_id,
        offer_price: r.offer_price,
        percent_off: r.percent_off,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
      { onConflict: 'product_id' }
    );
    if (error) throw new Error(error.message);
  }

  return localWrite(() => {
    const byId = new Map(memory.offers.map((o) => [o.product_id, o]));
    for (const r of records) {
      byId.set(r.product_id, r);
    }
    memory.offers = Array.from(byId.values());
    return records;
  });
}

export async function setOfferActive(product_id: string, is_active: boolean): Promise<Offer | null> {
  const id = decodeURIComponent(String(product_id));
  const now = new Date().toISOString();
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('offers')
      .update({ is_active, updated_at: now })
      .eq('product_id', id)
      .select('product_id,offer_price,percent_off,is_active,created_at,updated_at')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) {
      const mapped = mapOfferRow(data);
      localWrite(() => {
        const idx = memory.offers.findIndex((o) => o.product_id === id);
        if (idx === -1) memory.offers.push(mapped);
        else memory.offers[idx] = mapped;
        return mapped;
      });
      return mapped;
    }
  }
  return localWrite(() => {
    const idx = memory.offers.findIndex((o) => o.product_id === id);
    if (idx === -1) return null;
    memory.offers[idx] = { ...memory.offers[idx], is_active, updated_at: now };
    return memory.offers[idx];
  });
}

export async function deleteOffer(product_id: string): Promise<boolean> {
  const id = decodeURIComponent(String(product_id));
  const supabase = dataWriteClient();
  let remoteDeleted = !supabase;
  if (supabase) {
    const { error } = await supabase.from('offers').delete().eq('product_id', id);
    if (error) throw new Error(error.message);
    remoteDeleted = true;
  }
  const localDeleted = localWrite(() => {
    const before = memory.offers.length;
    memory.offers = memory.offers.filter((o) => o.product_id !== id);
    return memory.offers.length < before;
  });
  return remoteDeleted || localDeleted;
}

export async function getActiveProductsPage(input: {
  page: number;
  limit: number;
  category_id?: string;
  category_slug?: string;
}): Promise<{
  items: ProductWithOffer[];
  hasMore: boolean;
}> {
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(48, Math.max(4, input.limit || 12));
  const offset = (page - 1) * limit;
  const fetchLimit = limit + 1; // for hasMore

  const remote = await fetchProductsFromSupabase();
  let all: Product[] = remote && remote.length ? remote : [];
  if (!all.length) {
    const extra = await getProducts();
    if (extra.length) all = extra;
  }
  const cats = await getCategories();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const slug = (input.category_slug ?? '').trim().toLowerCase();
  const matchesCategory = (p: Product) => {
    if (!input.category_id && !slug) return true;
    if (input.category_id && p.category_id === input.category_id) return true;
    const cat = p.category ?? catById.get(p.category_id);
    if (slug && cat?.slug === slug) return true;
    return false;
  };

  const inCategory = all.filter(matchesCategory);
  const activeInCategory = inCategory.filter((p) => p.is_active !== false);
  const localFiltered = (activeInCategory.length ? activeInCategory : inCategory).sort((a, b) =>
    String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  );

  const localProducts = localFiltered.slice(offset, offset + fetchLimit).map((p) => ({
    ...p,
    category: p.category ?? catById.get(p.category_id),
  }));
  const hasMore = localProducts.length > limit;
  const pageProducts = hasMore ? localProducts.slice(0, limit) : localProducts;
  try {
    return await attachOffers(pageProducts, hasMore);
  } catch (e) {
    console.error(e);
    return { items: pageProducts as ProductWithOffer[], hasMore };
  }
}

async function attachOffers(
  pageProducts: (Product & { category?: Category })[],
  hasMore: boolean
): Promise<{ items: ProductWithOffer[]; hasMore: boolean }> {
  const productIds = pageProducts.map((p) => p.id);
  const offersByProductId = await getActiveOffersByProductIds(productIds);

  const items: ProductWithOffer[] = pageProducts.map((p) => {
    const offer = offersByProductId[p.id];
    const { image_urls: _urls, ...rest } = p as Product & { category?: Category; image_urls?: string[] | null };
    return offer ? ({ ...rest, offer } as ProductWithOffer) : (rest as ProductWithOffer);
  });
  return { items, hasMore };
}

export async function getOffersAdminRows(): Promise<
  Array<{
    product_id: string;
    product_name: string;
    original_price: number;
    image_url: string | null;
    offer_price: number;
    percent_off: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>
> {
  const offers = await (async () => {
    const remote = await fetchOffersFromSupabase();
    if (remote) {
      memory.offers = remote;
      return remote;
    }
    hydrate();
    return memory.offers;
  })();

  const products = await getProducts();
  const productsById = new Map(products.map((p) => [p.id, p]));

  return offers
    .map((o) => {
      const p = productsById.get(o.product_id);
      if (!p) return null;
      return {
        product_id: o.product_id,
        product_name: p.name,
        original_price: p.price,
        image_url: p.image_url,
        offer_price: o.offer_price,
        percent_off: o.percent_off,
        is_active: o.is_active,
        created_at: o.created_at,
        updated_at: o.updated_at,
      };
    })
    .filter((x) => x !== null) as any;
}

// ---- Orders ----
export async function getOrders(): Promise<Order[]> {
  hydrate();
  const removed = new Set(memory.deleted_order_ids);
  const byId = new Map<string, Order>();
  for (const o of memory.orders as Order[]) {
    if (removed.has(o.id)) continue;
    const merged = mergeOrder(byId.get(o.id), o);
    byId.set(merged.id, merged);
  }
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await queryWithAbort(
      (signal) =>
        supabase.from('orders').select('*').order('created_at', { ascending: false }).abortSignal(signal),
      4000
    );
    if (error && !isAbortError(error)) console.error('getOrders', error.message);
    if (!error && data) {
      for (const o of data as Order[]) {
        if (removed.has(o.id)) continue;
        const merged = mergeOrder(byId.get(o.id), o);
        byId.set(merged.id, merged);
      }
    }
  }
  const orders = Array.from(byId.values())
    .filter((o) => !removed.has(o.id))
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  memory.orders = orders as (Order & { id: string })[];
  persist();
  return orders;
}

export async function createOrder(input: {
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  shipping_address: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status?: string;
}): Promise<Order> {
  const now = new Date().toISOString();
  const order: Order & { id: string } = {
    id: uuid(),
    customer_name: input.customer_name,
    customer_email: input.customer_email,
    customer_phone: input.customer_phone ?? null,
    shipping_address: input.shipping_address,
    items: normalizeItems(input.items),
    subtotal: input.subtotal,
    total: input.total,
    status: input.status ?? 'pending',
    created_at: now,
    updated_at: now,
  };

  localWrite(() => {
    memory.deleted_order_ids = memory.deleted_order_ids.filter((x) => x !== order.id);
    const existing = memory.orders.find((o) => o.id === order.id);
    const merged = mergeOrder(existing, order) as Order & { id: string };
    const idx = memory.orders.findIndex((o) => o.id === order.id);
    if (idx === -1) memory.orders.unshift(merged);
    else memory.orders[idx] = merged;
    return merged;
  });

  const supabase = dataWriteClient();
  if (supabase) {
    try {
      const { error } = await queryWithAbort(
        (signal) =>
          supabase
            .from('orders')
            .insert({
              id: order.id,
              customer_name: order.customer_name,
              customer_email: order.customer_email,
              customer_phone: order.customer_phone,
              shipping_address: order.shipping_address,
              items: order.items,
              subtotal: order.subtotal,
              total: order.total,
              status: order.status,
              created_at: order.created_at,
              updated_at: order.updated_at,
            })
            .abortSignal(signal),
        8000
      );
      if (error && !isAbortError(error)) console.error('createOrder', error.message);
    } catch (e) {
      console.error('createOrder', e);
    }
  }

  return order;
}

const ORDER_STATUSES = ['pending', 'paid', 'out_for_delivery', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export async function updateOrderStatus(id: string, status: string): Promise<Order | null> {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    throw new Error('Invalid status');
  }
  hydrate();
  if (memory.deleted_order_ids.includes(id)) return null;
  const now = new Date().toISOString();
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) console.error('updateOrderStatus', error.message);
    if (!error && data) {
      return localWrite(() => {
        const idx = memory.orders.findIndex((o) => o.id === id);
        const prev = idx === -1 ? undefined : (memory.orders[idx] as Order);
        const mapped = mergeOrder(prev, { ...(data as Order), status, updated_at: now });
        if (idx === -1) memory.orders.unshift(mapped as Order & { id: string });
        else memory.orders[idx] = mapped as Order & { id: string };
        return mapped;
      });
    }
  }
  return localWrite(() => {
    const idx = memory.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    const mapped = mergeOrder(memory.orders[idx] as Order, {
      ...(memory.orders[idx] as Order),
      status,
      updated_at: now,
    });
    memory.orders[idx] = mapped as Order & { id: string };
    return mapped;
  });
}

export async function deleteOrder(id: string): Promise<boolean> {
  hydrate();
  const existing = memory.orders.some((o) => o.id === id);

  const localDeleted = localWrite(() => {
    if (!memory.deleted_order_ids.includes(id)) memory.deleted_order_ids.push(id);
    const before = memory.orders.length;
    memory.orders = memory.orders.filter((o) => o.id !== id);
    return memory.orders.length < before || existing;
  });

  const supabase = dataWriteClient();
  let remoteDeleted = !supabase;
  if (supabase) {
    try {
      let lastError: { message: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await queryWithAbort(
          (signal) => supabase.from('orders').delete().eq('id', id).select('id').abortSignal(signal),
          15000
        );
        lastError = error;
        if (!error) {
          remoteDeleted = true;
          break;
        }
      }
      if (!remoteDeleted && lastError && !isAbortError(lastError)) {
        console.error('deleteOrder supabase error:', lastError);
      }
    } catch (e) {
      console.error('deleteOrder', e);
      remoteDeleted = false;
    }
  }
  return localDeleted || remoteDeleted;
}

// ---- Reports ----
export type ReportRow = {
  total_orders: number;
  total_revenue: number;
  total_items_sold: number;
  by_product: { product_name: string; quantity: number; revenue: number }[];
};

export async function getReport(): Promise<ReportRow> {
  const orders = await getOrders();
  const byProduct: Record<string, { quantity: number; revenue: number }> = {};
  let totalRevenue = 0;
  let totalItems = 0;
  for (const order of orders) {
    if (order.status === 'cancelled' || order.status === 'pending') continue;
    totalRevenue += order.total;
    for (const item of order.items ?? []) {
      totalItems += item.quantity;
      const key = item.product_name;
      if (!byProduct[key]) byProduct[key] = { quantity: 0, revenue: 0 };
      byProduct[key].quantity += item.quantity;
      byProduct[key].revenue += item.total;
    }
  }
  const by_product = Object.entries(byProduct).map(([product_name, { quantity, revenue }]) => ({
    product_name,
    quantity,
    revenue,
  }));
  by_product.sort((a, b) => b.revenue - a.revenue);
  return {
    total_orders: orders.filter((o) => o.status !== 'cancelled' && o.status !== 'pending').length,
    total_revenue: totalRevenue,
    total_items_sold: totalItems,
    by_product,
  };
}
