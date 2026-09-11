import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { saveProductImageFile } from '@/lib/product-images';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const { url } = await saveProductImageFile(file);
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to upload';
    const status = message.includes('too large') || message.includes('Use JPEG') ? 400 : 500;
    console.error(e);
    return NextResponse.json({ error: message }, { status });
  }
}
