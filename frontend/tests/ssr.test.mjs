import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeState, hasBasicAccess } from "../ssr-utils.mjs";
import { render } from "../dist/server/entry-server.js";

test("SSR delivers actual dashboard content before JavaScript", () => {
  const html = render({
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
  const html = render({ parcels: [], error: "El backend no está disponible." });
  assert.match(html, /Necesitamos conectar el servidor/);
  assert.match(html, /Reintentar/);
});
