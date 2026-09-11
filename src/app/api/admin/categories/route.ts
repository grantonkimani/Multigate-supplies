import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getCategories, createCategory } from '@/lib/admin-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const name = body?.name;
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    const description = typeof body?.description === 'string' ? body.description.trim() || undefined : undefined;
    const category = await createCategory({ name: trimmed, description });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Failed to create category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
