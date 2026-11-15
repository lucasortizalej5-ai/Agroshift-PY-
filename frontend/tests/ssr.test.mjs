import { test } from "node:test";
import assert from "node:assert/strict";
import {
  serializeState,
  hasBasicAccess,
  parseCookies,
  createSessionToken,
  verifySession,
} from "../ssr-utils.mjs";
import { createHmac } from "node:crypto";
import { render } from "../dist/server/entry-server.js";

test("SSR delivers actual dashboard content before JavaScript", () => {
  const html = render({
    initialLang: "es",
    parcels: [],
    crops: [],
    region: { name: "Alto Paraná", boundary: null },
    default_period: { start_date: "2024-01-01", end_date: "2024-01-30" },
  });
  assert.match(html, /Una mejor decisión/);
  assert.match(html, /NASA POWER/);
  assert.match(html, /Nueva parcela/);
  assert.match(html, /No mostramos valores de ejemplo/);
});
test("initial state cannot close its JSON script tag", () => {
  const input = {
    name: "</script><script>alert(1)</script>",
    notes: "\u2028test",
  };
  const serialized = serializeState(input);
  assert.ok(!serialized.includes("</script>"));
  assert.deepEqual(JSON.parse(serialized), input);
});
test("private deployment requires matching Basic credentials", () => {
  const header =
    "Basic " + Buffer.from("grower:synthetic-password").toString("base64");
  assert.equal(hasBasicAccess(header, "grower", "synthetic-password"), true);
  assert.equal(hasBasicAccess(header, "grower", "other"), false);
  assert.equal(
    hasBasicAccess(undefined, "grower", "synthetic-password"),
    false,
  );
});
test("SSR backend failure renders an actionable page", () => {
  const html = render({
    initialLang: "es",
    parcels: [],
    error: "El backend no está disponible.",
  });
  assert.match(html, /Necesitamos conectar el servidor/);
  assert.match(html, /Reintentar/);
});

test("SSR also supports the uploaded English interface", () => {
  const html = render({
    initialLang: "en",
    parcels: [],
    crops: [],
    region: null,
  });
  assert.match(html, /A better decision/);
  assert.match(html, /New parcel/);
});

test("session signature binds the user, secret and expiration", () => {
  const secret = "synthetic-test-only-secret";
  const token = createSessionToken("grower", secret);
  assert.equal(verifySession(token, "grower", secret), true);
  assert.equal(verifySession(token, "other", secret), false);
  assert.equal(verifySession(token, "grower", "other"), false);
  for (const time of [Date.now() - 31 * 86400000, Date.now() + 86400000]) {
    const signature = createHmac("sha256", secret)
      .update(`${time}:grower`)
      .digest("hex");
    assert.equal(
      verifySession(`${time}.${signature}`, "grower", secret),
      false,
    );
  }
});

test("malformed cookies cannot crash the server", () => {
  assert.deepEqual(parseCookies("broken=%ZZ; agroshift_lang=es"), {
    agroshift_lang: "es",
  });
});
