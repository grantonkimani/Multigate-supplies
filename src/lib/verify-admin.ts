import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from './admin-auth';

export async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidAdminSessionToken(token);
}
