import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { reorderCategories } from '@/lib/admin-db';

export async function POST(request: NextRequest) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.some((x: unknown) => typeof x !== 'string')) {
      return NextResponse.json({ error: 'ids must be an array of category ids' }, { status: 400 });
    }
    const categories = await reorderCategories(ids as string[]);
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
  }
}
