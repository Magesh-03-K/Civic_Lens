import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'cl_auth';
const SESSION_DURATION_HOURS = 8;

export function checkPasscode(passcode: string): boolean {
  const correct = process.env.AUTHORITY_PASSCODE;
  if (!correct || !passcode) return false;

  const bufInput = Buffer.from(passcode);
  const bufExpected = Buffer.from(correct);

  if (bufInput.length !== bufExpected.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufInput, bufExpected);
}

function signPayload(payloadString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('base64url');
}

export function createAuthorityToken(): string {
  const secret = process.env.SESSION_SECRET || 'fallback-session-secret-at-least-16-chars';
  const expiresAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
  const payload = JSON.stringify({ role: 'authority', exp: expiresAt });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = signPayload(b64Payload, secret);
  return `${b64Payload}.${signature}`;
}

export function verifyAuthorityToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [b64Payload, signature] = parts;
  const secret = process.env.SESSION_SECRET || 'fallback-session-secret-at-least-16-chars';
  const expectedSignature = signPayload(b64Payload, secret);

  const bufSig = Buffer.from(signature);
  const bufExpected = Buffer.from(expectedSignature);

  if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
    return false;
  }

  try {
    const raw = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.exp || typeof parsed.exp !== 'number') return false;
    return parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function checkAuthoritySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyAuthorityToken(token);
}

export async function requireAuthority(): Promise<boolean> {
  const valid = await checkAuthoritySession();
  if (!valid) {
    throw new Error('Unauthorized: Valid authority session required.');
  }
  return true;
}
