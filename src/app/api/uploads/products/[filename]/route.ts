import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/local-store';

export const dynamic = 'force-dynamic';

const DIR = path.join(getProjectRoot(), 'public', 'uploads', 'products');
const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = path.join(DIR, filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
}
