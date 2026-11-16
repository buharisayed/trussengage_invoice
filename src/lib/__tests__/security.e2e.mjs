import assert from "node:assert/strict";

const BASE_URL = (process.env.TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const APP_PASSWORD = process.env.APP_PASSWORD;

async function run() {
  console.log(`Running headless security checks against ${BASE_URL} ...`);

  // 1. Unauthenticated page routes must redirect to /login
  for (const path of ["/", "/editor/new", "/settings"]) {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
    assert.equal(res.status, 307, `Expected 307 redirect for ${path}, got ${res.status}`);
    const location = res.headers.get("location") || "";
    assert.ok(location.includes("/login"), `Expected redirect to /login for ${path}, got ${location}`);
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.ok(
      (res.headers.get("x-robots-tag") || "").includes("noindex"),
      `Expected X-Robots-Tag noindex on ${path}`
    );
  }
  console.log("✔ Unauthenticated page redirects & security headers verified");

  // 2. Unauthenticated API routes must return 401 and Cache-Control: no-store
  for (const [method, path] of [
    ["GET", "/api/documents"],
    ["POST", "/api/documents"],
    ["GET", "/api/documents/nonexistent"],
    ["PUT", "/api/documents/nonexistent"],
    ["DELETE", "/api/documents/nonexistent"],
    ["GET", "/api/settings"],
    ["PUT", "/api/settings"],
    ["POST", "/api/settings"],
    ["DELETE", "/api/settings"],
  ]) {
    const res = await fetch(`${BASE_URL}${path}`, { method });
    assert.equal(res.status, 401, `Expected 401 for ${method} ${path}, got ${res.status}`);
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
  console.log("✔ Unauthenticated API routes return 401 + Cache-Control: no-store");

  // 3. Forged / invalid session cookie must be rejected
  const forgedRes = await fetch(`${BASE_URL}/api/documents`, {
    headers: { Cookie: "te_session=v1.9999999999.forgedsignature" },
  });
  assert.equal(forgedRes.status, 401, "Forged cookie must be rejected with 401");
  console.log("✔ Forged session cookie rejected");

  // 4. robots.txt must disallow all crawlers
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  assert.equal(robotsRes.status, 200);
  const robotsText = await robotsRes.text();
  assert.ok(robotsText.includes("Disallow: /"), "robots.txt must include Disallow: /");
  console.log("✔ robots.txt disallows all search engines");

  // 5. Login endpoint rejects wrong password & accepts valid password
  const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.50" },
    body: JSON.stringify({ password: "wrong-password-123" }),
  });
  assert.equal(badLogin.status, 401);

  if (APP_PASSWORD) {
    const goodLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.50" },
      body: JSON.stringify({ password: APP_PASSWORD }),
    });
    assert.equal(goodLogin.status, 200, "Valid password should return 200");
    const setCookie = goodLogin.headers.get("set-cookie") || "";
    assert.ok(setCookie.includes("te_session="), "Login should set te_session cookie");
    assert.ok(setCookie.toLowerCase().includes("httponly"), "Cookie must be HttpOnly");

    const cookiePair = setCookie.split(";")[0];
    const authedDocs = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(authedDocs.status, 200, "Authenticated /api/documents should return 200");
    console.log("✔ Authenticated login + HttpOnly cookie + API access verified");
  }

  // 6. Rate limiting triggers 429 after 10 failed attempts from a distinct IP
  const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": testIp },
      body: JSON.stringify({ password: "bad-attempt" }),
    });
    if (res.status === 429) {
      got429 = true;
      break;
    }
  }
  assert.equal(got429, true, "Expected 429 Too Many Requests after repeated failed logins");
  console.log("✔ Brute-force login rate limiting (429) verified");

  console.log("\nAll headless security checks passed!");
}

run().catch((err) => {
  console.error("Security test failed:", err);
  process.exit(1);
});
