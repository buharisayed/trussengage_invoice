export const SESSION_COOKIE_NAME = "te_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string | null {
  const secret = process.env.AUTH_SECRET || process.env.APP_PASSWORD;
  return secret && secret.length > 0 ? secret : null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET or APP_PASSWORD must be configured");
  }
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `v1.${exp}`;
  const sig = await signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const secret = getSecret();
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expStr, providedSig] = parts;
  if (version !== "v1") return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  try {
    const expectedSig = await signPayload(`${version}.${expStr}`, secret);
    const a = fromBase64Url(providedSig);
    const b = fromBase64Url(expectedSig);
    if (a.length !== b.length) return false;

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

export function sanitizeRedirectPath(nextPath: string | null | undefined): string {
  if (!nextPath || typeof nextPath !== "string") return "/";
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return "/";
  }
  return trimmed;
}
