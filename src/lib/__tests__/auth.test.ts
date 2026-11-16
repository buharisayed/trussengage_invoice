import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  constantTimeEqual,
  createSessionToken,
  sanitizeRedirectPath,
  verifySessionToken,
} from "../auth.ts";

describe("auth session tokens", () => {
  const prevAuthSecret = process.env.AUTH_SECRET;
  const prevAppPassword = process.env.APP_PASSWORD;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-key-for-unit-tests";
    process.env.APP_PASSWORD = "test-password";
  });

  afterEach(() => {
    process.env.AUTH_SECRET = prevAuthSecret;
    process.env.APP_PASSWORD = prevAppPassword;
  });

  it("creates and verifies a valid session token", async () => {
    const token = await createSessionToken();
    assert.equal(await verifySessionToken(token), true);
  });

  it("rejects tampered signature or payload", async () => {
    const token = await createSessionToken();
    const parts = token.split(".");
    const tamperedSig = `${parts[0]}.${parts[1]}.tampered_sig`;
    assert.equal(await verifySessionToken(tamperedSig), false);

    const tamperedExp = `${parts[0]}.${Number(parts[1]) + 100}.${parts[2]}`;
    assert.equal(await verifySessionToken(tamperedExp), false);
  });

  it("rejects expired, malformed, or missing tokens", async () => {
    assert.equal(await verifySessionToken(undefined), false);
    assert.equal(await verifySessionToken(""), false);
    assert.equal(await verifySessionToken("invalid.token"), false);
    assert.equal(await verifySessionToken("v1.1000.abc"), false);
  });

  it("fails closed when AUTH_SECRET and APP_PASSWORD are missing", async () => {
    const token = await createSessionToken();
    delete process.env.AUTH_SECRET;
    delete process.env.APP_PASSWORD;

    assert.equal(await verifySessionToken(token), false);
    await assert.rejects(() => createSessionToken());
  });
});

describe("constantTimeEqual", () => {
  it("matches equal strings and rejects unequal or different-length strings", () => {
    assert.equal(constantTimeEqual("secret123", "secret123"), true);
    assert.equal(constantTimeEqual("secret123", "secret124"), false);
    assert.equal(constantTimeEqual("secret123", "secret12"), false);
  });
});

describe("sanitizeRedirectPath", () => {
  it("allows safe relative paths and blocks open redirects", () => {
    assert.equal(sanitizeRedirectPath("/"), "/");
    assert.equal(sanitizeRedirectPath("/editor/123"), "/editor/123");
    assert.equal(sanitizeRedirectPath("/settings?tab=1"), "/settings?tab=1");
    assert.equal(sanitizeRedirectPath("https://evil.com"), "/");
    assert.equal(sanitizeRedirectPath("//evil.com"), "/");
    assert.equal(sanitizeRedirectPath("/\\evil.com"), "/");
    assert.equal(sanitizeRedirectPath(null), "/");
  });
});
