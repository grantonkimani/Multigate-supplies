import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getReport } from '@/lib/admin-db';

export async function GET() {
  const ok = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const report = await getReport();
  return NextResponse.json(report);
}
