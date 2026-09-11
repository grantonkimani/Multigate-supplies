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
  memory.products = disk.products;
  memory.orders = disk.orders;
  memory.banners = disk.banners;
  memory.offers = disk.offers;
}

function persist() {
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
      return { data: null, error: null };
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Categories ----
export async function getCategories(): Promise<Category[]> {
  hydrate();
  if (memory.categories.length) return memory.categories as Category[];
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await supabase.from('categories').select('id,name,slug,description,sort_order,created_at').order('sort_order');
    if (!error && (data?.length ?? 0) > 0) return data as Category[];
  }
  return memory.categories as Category[];
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
      2500
    );
    if (error && !isAbortError(error)) console.error('getBanners', error.message);
    if (!error && data) {
      for (const b of data as Banner[]) byId.set(b.id, b);
    }
  }
  return Array.from(byId.values()).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
  hydrate();
  return ([...memory.banners] as Banner[])
    .filter((b) => b.is_active && Boolean(b.image_url))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

// ---- Products ----
export async function getProducts(): Promise<Product[]> {
  hydrate();
  if (memory.products.length) {
    return memory.products.map((p) => ({
      ...p,
      category: memory.categories.find((c) => c.id === p.category_id),
    })) as Product[];
  }
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('id,category_id,name,slug,description,price,image_url,image_urls,stock_quantity,is_active,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (!error && (data?.length ?? 0) > 0) {
      return (data ?? []).map((p: any) => ({
        ...p,
        price: Number(p.price),
        stock_quantity: Number(p.stock_quantity),
        category: memory.categories.find((c) => c.id === p.category_id),
      })) as Product[];
    }
  }
  return memory.products.map((p) => ({
    ...p,
    category: memory.categories.find((c) => c.id === p.category_id),
  })) as Product[];
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
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        category_id: input.category_id,
        name: input.name,
        slug,
        description: input.description ?? null,
        price: input.price,
        image_url: input.image_url ?? null,
        image_urls: input.image_urls ?? null,
        stock_quantity: input.stock_quantity ?? 0,
        is_active: true,
      })
      .select()
      .single();
    if (error) {
      console.error('createProduct', error.message);
      throw new Error(error.message);
    }
    if (data) {
      const mapped = {
        ...(data as Product & { price: unknown; stock_quantity: unknown }),
        price: Number((data as any).price),
        stock_quantity: Number((data as any).stock_quantity),
      } as Product;
      return localWrite(() => {
        if (!memory.products.some((p) => p.id === mapped.id)) {
          memory.products.push(mapped as Product & { id: string });
        }
        return mapped;
      });
    }
  }
  return localWrite(() => {
    const newProduct: Product & { id: string } = {
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
    memory.products.push(newProduct);
    return newProduct as Product;
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
  const patch = productUpdatePatch(input);
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await supabase.from('products').update(patch).eq('id', id).select().single();
    if (error) console.error('updateProduct', error.message);
    if (!error && data) {
      const mapped = {
        ...(data as Product & { price: unknown; stock_quantity: unknown }),
        price: Number((data as any).price),
        stock_quantity: Number((data as any).stock_quantity),
      } as Product;
      return localWrite(() => {
        const idx = memory.products.findIndex((p) => p.id === id);
        if (idx === -1) memory.products.push(mapped as Product & { id: string });
        else Object.assign(memory.products[idx], mapped);
        return mapped;
      });
    }
  }
  return localWrite(() => {
    const idx = memory.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const p = memory.products[idx];
    if (typeof patch.name === 'string') {
      p.name = patch.name;
      p.slug = patch.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    Object.assign(p, patch);
    return p as Product;
  });
}

export async function deleteProduct(id: string): Promise<boolean> {
  const existing = await getProductById(id);
  const supabase = dataWriteClient();
  let remoteDeleted = false;
  if (supabase) {
    await supabase.from('offers').delete().eq('product_id', id);
    const { data, error } = await supabase.from('products').delete().eq('id', id).select('id');
    if (error) {
      console.error('deleteProduct supabase error:', error);
    } else {
      remoteDeleted = (data?.length ?? 0) > 0;
    }
  }
  const localDeleted = localWrite(() => {
    const before = memory.products.length;
    memory.products = memory.products.filter((p) => p.id !== id);
    memory.offers = memory.offers.filter((o) => o.product_id !== id);
    return memory.products.length < before;
  });
  const deleted = remoteDeleted || localDeleted;
  if (deleted && existing) deleteProductImagesForProduct(existing);
  return deleted;
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

export async function getOffersByProductIds(productIds: string[]): Promise<Offer[]> {
  if (!productIds.length) return [];
  hydrate();
  const byId = new Set(productIds);
  return memory.offers.filter((o) => byId.has(o.product_id));
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

  const supabase = createClient();
  if (supabase) {
    const payload = records.map((r) => ({
      product_id: r.product_id,
      offer_price: r.offer_price,
      percent_off: r.percent_off,
      is_active: r.is_active,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('offers').upsert(payload, { onConflict: 'product_id' });
    if (!error) return records;
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
  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('offers')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('product_id', product_id)
      .select()
      .single();
    if (!error && data) {
      return {
        product_id: String((data as any).product_id),
        offer_price: Number((data as any).offer_price),
        percent_off: Number((data as any).percent_off),
        is_active: Boolean((data as any).is_active),
        created_at: String((data as any).created_at),
        updated_at: String((data as any).updated_at),
      };
    }
  }

  return localWrite(() => {
    const idx = memory.offers.findIndex((o) => o.product_id === product_id);
    if (idx === -1) return null;
    memory.offers[idx] = { ...memory.offers[idx], is_active, updated_at: new Date().toISOString() };
    return memory.offers[idx];
  });
}

export async function deleteOffer(product_id: string): Promise<boolean> {
  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.from('offers').delete().eq('product_id', product_id);
    if (!error) return true;
  }
  return localWrite(() => {
    const idx = memory.offers.findIndex((o) => o.product_id === product_id);
    if (idx === -1) return false;
    memory.offers.splice(idx, 1);
    return true;
  });
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

  hydrate();
  const slug = (input.category_slug ?? '').trim().toLowerCase();
  const matchesCategory = (p: Product) => {
    if (!input.category_id && !slug) return true;
    if (input.category_id && p.category_id === input.category_id) return true;
    const cat = memory.categories.find((c) => c.id === p.category_id);
    if (slug && cat?.slug === slug) return true;
    return false;
  };

  const localFiltered = memory.products
    .filter((p) => p.is_active !== false)
    .filter(matchesCategory)
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

  if (memory.products.length > 0) {
    const localProducts = localFiltered.slice(offset, offset + fetchLimit).map((p) => ({
      ...p,
      category: memory.categories.find((c) => c.id === p.category_id),
    }));
    const hasMore = localProducts.length > limit;
    const pageProducts = hasMore ? localProducts.slice(0, limit) : localProducts;
    return attachOffers(pageProducts, hasMore);
  }

  const supabase = dataWriteClient();
  if (supabase) {
    let query = supabase
      .from('products')
      .select('id,category_id,name,slug,description,price,image_url,image_urls,stock_quantity,is_active,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (input.category_id) query = query.eq('category_id', input.category_id);
    const { data, error } = await query.range(offset, offset + fetchLimit - 1);
    if (!error && (data?.length ?? 0) > 0) {
      const catIds = [...new Set((data ?? []).map((p: any) => p.category_id).filter(Boolean))];
      const { data: cats } = catIds.length
        ? await supabase.from('categories').select('id,name,slug,description,sort_order,created_at').in('id', catIds)
        : { data: [] as Category[] };
      const catById = new Map((cats ?? []).map((c: any) => [c.id, c]));
      const products = (data ?? [])
        .filter((p: any) => p.is_active !== false)
        .map((p: any) => ({
          ...p,
          price: Number(p.price),
          stock_quantity: Number(p.stock_quantity),
          category: catById.get(p.category_id),
        }));
      if (products.length > 0) {
        const hasMore = products.length > limit;
        const pageProducts = hasMore ? products.slice(0, limit) : products;
        return attachOffers(pageProducts, hasMore);
      }
    }
  }

  return { items: [], hasMore: false };
}

async function attachOffers(
  pageProducts: (Product & { category?: Category })[],
  hasMore: boolean
): Promise<{ items: ProductWithOffer[]; hasMore: boolean }> {
  const productIds = pageProducts.map((p) => p.id);
  const offersByProductId = await getActiveOffersByProductIds(productIds);

  const items: ProductWithOffer[] = pageProducts.map((p) => {
    const offer = offersByProductId[p.id];
    return offer ? ({ ...(p as any), offer } as ProductWithOffer) : (p as ProductWithOffer);
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
    hydrate();
    if (memory.offers.length) return memory.offers;
    const supabase = dataWriteClient();
    if (supabase) {
      const { data, error } = await supabase.from('offers').select('*');
      if (!error && (data?.length ?? 0) > 0) {
        return (data ?? []).map((o: any) => ({
          product_id: String(o.product_id),
          offer_price: Number(o.offer_price),
          percent_off: Number(o.percent_off),
          is_active: Boolean(o.is_active),
          created_at: String(o.created_at),
          updated_at: String(o.updated_at),
        }));
      }
    }
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
  const local = [...(memory.orders as Order[])];
  const byId = new Map<string, Order>();
  for (const o of local) byId.set(o.id, o);
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await queryWithAbort(
      (signal) =>
        supabase.from('orders').select('*').order('created_at', { ascending: false }).abortSignal(signal),
      4000
    );
    if (error && !isAbortError(error)) console.error('getOrders', error.message);
    if (!error && data) {
      for (const o of data as Order[]) byId.set(o.id, o);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  );
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
  const supabase = dataWriteClient();
  if (supabase) {
    try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone ?? null,
        shipping_address: input.shipping_address,
        items: input.items,
        subtotal: input.subtotal,
        total: input.total,
        status: input.status ?? 'pending',
      })
      .select()
      .single();
    if (error) console.error('createOrder', error.message);
    if (!error && data) {
      const order = data as Order;
      return localWrite(() => {
        if (!memory.orders.some((o) => o.id === order.id)) {
          memory.orders.unshift(order as Order & { id: string });
        }
        return order;
      });
    }
    } catch (e) {
      console.error('createOrder', e);
    }
  }
  return localWrite(() => {
    const newOrder: Order & { id: string } = {
      id: uuid(),
      ...input,
      customer_phone: input.customer_phone ?? null,
      status: input.status ?? 'pending',
      created_at: now,
      updated_at: now,
    };
    memory.orders.push(newOrder);
    return newOrder as Order;
  });
}

const ORDER_STATUSES = ['pending', 'paid', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export async function updateOrderStatus(id: string, status: string): Promise<Order | null> {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    throw new Error('Invalid status');
  }
  const now = new Date().toISOString();
  const supabase = dataWriteClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const mapped = data as Order;
      return localWrite(() => {
        const idx = memory.orders.findIndex((o) => o.id === id);
        if (idx === -1) memory.orders.unshift(mapped as Order & { id: string });
        else memory.orders[idx] = { ...memory.orders[idx], ...mapped };
        return mapped;
      });
    }
  }
  return localWrite(() => {
    const idx = memory.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    memory.orders[idx] = { ...memory.orders[idx], status, updated_at: now };
    return memory.orders[idx] as Order;
  });
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
    for (const item of order.items) {
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
