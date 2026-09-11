import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
  return new TextEncoder().encode(secret);
}

export async function verifyAdmin(): Promise<boolean> {
  // Temporary developer mode: allow admin pages/APIs without login.
  // IMPORTANT: keep this off in production.
  const bypass = process.env.ADMIN_BYPASS_AUTH;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const looksLikeBcryptHash = typeof adminPasswordHash === 'string' && /^\$2[aby]\$/.test(adminPasswordHash);
  const shouldBypass =
    bypass === 'true' ||
    bypass === '1' ||
    // If the admin password hash isn't configured yet (or is still a placeholder), let devs work.
    (process.env.NODE_ENV !== 'production' && (!adminPasswordHash || !looksLikeBcryptHash));
  if (shouldBypass) return true;

  const cookieStore = await cookies();
  const token = cookieStore.get('admin-session')?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (payload.type !== 'admin') return false;
    if (payload.exp && payload.exp < Date.now() / 1000) return false;
    return true;
  } catch {
    return false;
  }
}
