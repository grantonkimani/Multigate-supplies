import { SignJWT } from 'jose';

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(): Promise<string> {
  const token = await new SignJWT({ type: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getJwtSecretKey());
  return token;
}
