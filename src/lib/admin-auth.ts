import { jwtVerify, SignJWT } from 'jose';

export const ADMIN_SESSION_COOKIE = 'admin-session';
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret.length < 16) {
    return new TextEncoder().encode('invalid-unconfigured-jwt-secret');
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ type: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getJwtSecretKey());
}

export async function isValidAdminSessionToken(token: string | undefined): Promise<boolean> {
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

export function looksLikeBcryptHash(value: string | undefined): boolean {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
}

export function resolveAdminPasswordHash(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '');
  if (looksLikeBcryptHash(trimmed)) return trimmed;
  if (/^2[aby]\$\d{2}\$.{53}$/.test(trimmed) && looksLikeBcryptHash(`$${trimmed}`)) {
    return `$${trimmed}`;
  }
  const parts = trimmed.split('|');
  if (parts.length === 3) {
    const rebuilt = `$${parts[0]}$${parts[1]}$${parts[2]}`;
    if (looksLikeBcryptHash(rebuilt)) return rebuilt;
  }
  return undefined;
}
