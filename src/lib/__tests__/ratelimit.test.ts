import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../ratelimit';

describe('Rate Limiter (lib/ratelimit.ts)', () => {
  it('allows up to 5 submissions within 10 minutes and rejects the 6th', () => {
    const testIp = `test-ip-${Date.now()}`;

    // 5 allowed calls
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(testIp, 'submit');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }

    // 6th call rejected
    const blocked = checkRateLimit(testIp, 'submit');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('allows up to 20 signed upload requests and rejects the 21st', () => {
    const testIp = `test-ip-sign-${Date.now()}`;

    for (let i = 0; i < 20; i++) {
      const result = checkRateLimit(testIp, 'sign');
      expect(result.allowed).toBe(true);
    }

    const blocked = checkRateLimit(testIp, 'sign');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
