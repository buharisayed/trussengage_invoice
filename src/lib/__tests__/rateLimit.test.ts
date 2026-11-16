import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SlidingWindowRateLimiter } from "../rateLimit.ts";

describe("SlidingWindowRateLimiter", () => {
  it("allows up to maxAttempts, blocks after limit, and resets", () => {
    const limiter = new SlidingWindowRateLimiter(3, 60_000);
    const t0 = 1_000_000;

    assert.equal(limiter.check("1.2.3.4", t0).allowed, true);
    limiter.recordFailure("1.2.3.4", t0);
    limiter.recordFailure("1.2.3.4", t0 + 100);
    limiter.recordFailure("1.2.3.4", t0 + 200);

    const blocked = limiter.check("1.2.3.4", t0 + 300);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterSeconds >= 1);

    // Different IP is unaffected
    assert.equal(limiter.check("5.6.7.8", t0 + 300).allowed, true);

    // After window expires, IP is allowed again
    assert.equal(limiter.check("1.2.3.4", t0 + 61_000).allowed, true);

    // Explicit reset clears failures
    limiter.recordFailure("9.9.9.9", t0);
    limiter.recordFailure("9.9.9.9", t0);
    limiter.recordFailure("9.9.9.9", t0);
    assert.equal(limiter.check("9.9.9.9", t0 + 10).allowed, false);
    limiter.reset("9.9.9.9");
    assert.equal(limiter.check("9.9.9.9", t0 + 10).allowed, true);
  });
});
