/**
 * In-memory token bucket rate limiter for serverless endpoints.
 * Limits submissions and signed upload requests per IP.
 * Best-effort implementation on distributed serverless nodes.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired keys periodically
const CLEANUP_INTERVAL_MS = 60000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks rate limit for a client IP.
 * - Submissions: 5 requests per 10 minutes (600s)
 * - Signed uploads: 20 requests per 10 minutes (600s)
 */
export function checkRateLimit(
  ip: string,
  action: 'submit' | 'sign'
): RateLimitResult {
  cleanupExpired();

  const maxRequests = action === 'submit' ? 5 : 20;
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();

  const key = `${action}:${ip}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    retryAfterSeconds: 0,
  };
}
