import { NextResponse } from 'next/server';
import { getActiveProductsPage, getCategoryBySlug } from '@/lib/admin-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageRaw = url.searchParams.get('page');
  const limitRaw = url.searchParams.get('limit');
  let categoryId = url.searchParams.get('category_id') ?? undefined;
  const categorySlug = url.searchParams.get('category') ?? undefined;

  const page = Math.max(1, parseInt(pageRaw ?? '1', 10));
  const limit = Math.min(48, Math.max(4, parseInt(limitRaw ?? '24', 10)));

  try {
    if (!categoryId && categorySlug) {
      const category = await getCategoryBySlug(categorySlug);
      if (!category) {
        return NextResponse.json({ items: [], page, limit, hasMore: false });
      }
      categoryId = category.id;
    }

    const { items, hasMore } = await getActiveProductsPage({
      page,
      limit,
      category_id: categoryId,
      category_slug: categorySlug || undefined,
    });
    return NextResponse.json({
      items,
      page,
      limit,
      hasMore,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

