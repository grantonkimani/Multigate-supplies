import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/admin-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}
