import fs from 'fs';
import path from 'path';
import type { Banner, Category, Offer, Order, Product } from './types';

export type LocalStore = {
  categories: (Category & { id: string })[];
  products: (Product & { id: string })[];
  orders: (Order & { id: string })[];
  banners: (Banner & { id: string })[];
  offers: Offer[];
  deleted_product_ids: string[];
};

const emptyStore = (): LocalStore => ({
  categories: [],
  products: [],
  orders: [],
  banners: [],
  offers: [],
  deleted_product_ids: [],
});

function findProjectRoot(): string {
  const starts = [process.cwd(), __dirname];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      const pkgPath = path.join(dir, 'package.json');
      try {
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
          if (pkg.name === 'multigate-medical-supplies') return dir;
        }
      } catch {
        // continue walking
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

export function getProjectRoot() {
  return findProjectRoot();
}

function storeFilePath() {
  return path.join(findProjectRoot(), 'data', 'admin-store.json');
}

export function getLocalStorePath() {
  return storeFilePath();
}

export function loadLocalStore(): LocalStore {
  try {
    const file = storeFilePath();
    if (!fs.existsSync(file)) return emptyStore();
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      banners: Array.isArray(parsed.banners) ? parsed.banners : [],
      offers: Array.isArray(parsed.offers) ? parsed.offers : [],
      deleted_product_ids: Array.isArray(parsed.deleted_product_ids)
        ? parsed.deleted_product_ids.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return emptyStore();
  }
}

export function saveLocalStore(store: LocalStore) {
  try {
    const file = storeFilePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // ignore write errors (e.g. read-only serverless filesystem)
  }
}
