import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { updateCategory, deleteCategory } from '@/lib/admin-db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    const description =
      body?.description !== undefined
        ? body.description === null
          ? null
          : String(body.description).trim()
        : undefined;
    const category = await updateCategory(id, {
      name,
      description: description === '' ? null : description,
      sort_order: typeof body?.sort_order === 'number' ? body.sort_order : undefined,
    });
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const deleted = await deleteCategory(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete category';
    const status = message.includes('still has products') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
