import { timingSafeEqual } from "node:crypto";

export function serializeState(state) {
  return JSON.stringify(state)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export function secureEqual(actual, expected) {
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
