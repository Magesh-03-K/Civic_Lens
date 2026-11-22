import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { checkPasscode, createAuthorityToken, verifyAuthorityToken } from '../auth';

describe('Authority Auth Utilities', () => {
  const originalPasscode = process.env.AUTHORITY_PASSCODE;
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.AUTHORITY_PASSCODE = 'Madurai@Admin2026';
    process.env.SESSION_SECRET = 'a-super-secret-session-key-at-least-32-chars!';
  });

  afterEach(() => {
    process.env.AUTHORITY_PASSCODE = originalPasscode;
    process.env.SESSION_SECRET = originalSecret;
  });

  describe('checkPasscode', () => {
    it('returns true when passcode matches exactly', () => {
      expect(checkPasscode('Madurai@Admin2026')).toBe(true);
    });

    it('returns false when passcode is incorrect', () => {
      expect(checkPasscode('wrong-passcode')).toBe(false);
      expect(checkPasscode('Madurai@Admin202')).toBe(false);
      expect(checkPasscode('Madurai@Admin2026Extra')).toBe(false);
    });

    it('returns false for empty or missing inputs', () => {
      expect(checkPasscode('')).toBe(false);
    });

    it('returns false when process.env.AUTHORITY_PASSCODE is missing', () => {
      delete process.env.AUTHORITY_PASSCODE;
      expect(checkPasscode('Madurai@Admin2026')).toBe(false);
    });
  });

  describe('createAuthorityToken & verifyAuthorityToken', () => {
    it('creates a token that can be verified immediately', () => {
      const token = createAuthorityToken();
      expect(typeof token).toBe('string');
      expect(token).toContain('.');
      expect(verifyAuthorityToken(token)).toBe(true);
    });

    it('returns false if token is null, undefined, or empty', () => {
      expect(verifyAuthorityToken(undefined)).toBe(false);
      expect(verifyAuthorityToken('')).toBe(false);
    });

    it('returns false if token is malformed', () => {
      expect(verifyAuthorityToken('not-a-token')).toBe(false);
      expect(verifyAuthorityToken('payload.signature.extra')).toBe(false);
      expect(verifyAuthorityToken('invalid-base64.signature')).toBe(false);
    });

    it('returns false if signature is tampered', () => {
      const token = createAuthorityToken();
      const [payload, sig] = token.split('.');
      const tamperedSig = sig.slice(0, -2) + (sig.slice(-2) === 'aa' ? 'bb' : 'aa');
      expect(verifyAuthorityToken(`${payload}.${tamperedSig}`)).toBe(false);
    });

    it('returns false if token payload has expired', () => {
      const expiredPayload = JSON.stringify({ role: 'authority', exp: Date.now() - 10000 });
      const b64 = Buffer.from(expiredPayload).toString('base64url');
      const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(b64).digest('base64url');
      const expiredToken = `${b64}.${sig}`;

      expect(verifyAuthorityToken(expiredToken)).toBe(false);
    });
  });
});
