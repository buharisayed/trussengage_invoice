interface RateEntry {
  timestamps: number[];
}

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export class SlidingWindowRateLimiter {
  private store = new Map<string, RateEntry>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    windowMs = DEFAULT_WINDOW_MS
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const cutoff = now - this.windowMs;
    const entry = this.store.get(key);
    const recent = entry ? entry.timestamps.filter((t) => t > cutoff) : [];

    if (recent.length >= this.maxAttempts) {
      const oldest = recent[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      this.store.set(key, { timestamps: recent });
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    return {
      allowed: true,
      remaining: this.maxAttempts - recent.length,
      retryAfterSeconds: 0,
    };
  }

  recordFailure(key: string, now = Date.now()): void {
    const cutoff = now - this.windowMs;
    const entry = this.store.get(key);
    const recent = entry ? entry.timestamps.filter((t) => t > cutoff) : [];
    recent.push(now);
    this.store.set(key, { timestamps: recent });
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

export const loginRateLimiter = new SlidingWindowRateLimiter();
