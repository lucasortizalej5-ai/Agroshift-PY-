import { timingSafeEqual } from "node:crypto";
import crypto from "node:crypto";

export function serializeState(state) {
  return JSON.stringify(state)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function secureEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hasBasicAccess(header, username, password) {
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  return (
    colon > 0 &&
    secureEqual(decoded.slice(0, colon), username) &&
    secureEqual(decoded.slice(colon + 1), password)
  );
}

export function parseCookies(header) {
  const list = {};
  if (!header) return list;
  for (const cookie of header.split(";")) {
    const idx = cookie.indexOf("=");
    if (idx < 0) continue;
    const name = cookie.slice(0, idx).trim();
    const val = cookie.slice(idx + 1).trim();
    if (name && name !== "__proto__") {
      try {
        list[name] = decodeURIComponent(val);
      } catch {
        /* Ignore malformed cookies. */
      }
    }
  }
  return list;
}

export function createSessionToken(user, secret) {
  const ts = Date.now().toString();
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${user}`)
    .digest("hex");
  return `${ts}.${sig}`;
}

export function verifySession(token, expectedUser, secret) {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(ts)) return false;
  const time = Number(ts);
  if (!Number.isSafeInteger(time) || time > Date.now()) return false;
  // 30 días de vigencia
  if (Date.now() - time > 30 * 24 * 60 * 60 * 1000) return false;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${expectedUser}`)
    .digest("hex");
  return secureEqual(sig, expectedSig);
}
