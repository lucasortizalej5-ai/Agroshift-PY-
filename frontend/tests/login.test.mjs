import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("production login, cookie access, origin protection and logout", async () => {
  const backend = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify(
        req.url === "/api/bootstrap"
          ? { parcels: [], crops: [], region: null }
          : { status: "ok" },
      ),
    );
  });
  backend.listen(0, "127.0.0.1");
  await once(backend, "listening");
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ["server.mjs", "--production"], {
    cwd: new URL("../", import.meta.url),
    env: {
      ...process.env,
      APP_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
      API_BASE_URL: `http://127.0.0.1:${backend.address().port}`,
      API_INTERNAL_TOKEN: "x".repeat(40),
      WEB_USERNAME: "grower",
      WEB_PASSWORD: "synthetic-test-only-password",
    },
    stdio: "ignore",
  });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        ready = (await fetch(origin + "/healthz")).ok;
      } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, "SSR server did not start");
    const screen = await fetch(origin + "/login?lang=es", {
      headers: { cookie: "bad=%ZZ" },
    });
    assert.equal(screen.status, 200);
    assert.match(await screen.text(), /Iniciar sesión/);
    assert.equal((await fetch(origin + "/api/parcels")).status, 401);
    const submit = (password, headers = {}) =>
      fetch(origin + "/login", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ username: "grower", password }),
        redirect: "manual",
      });
    assert.equal((await submit("wrong")).status, 401);
    assert.equal(
      (
        await submit("synthetic-test-only-password", {
          origin: "https://other.invalid",
        })
      ).status,
      403,
    );
    const login = await submit("synthetic-test-only-password");
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    const cookie = setCookie.split(";")[0];
    const dashboard = await fetch(origin + "/", { headers: { cookie } });
    assert.equal(dashboard.status, 200);
    assert.match(await dashboard.text(), /A better decision/);
    assert.equal(
      (await fetch(origin + "/api/parcels", { headers: { cookie } })).status,
      200,
    );
    const httpsLogin = await submit("synthetic-test-only-password", {
      "x-forwarded-proto": "https",
    });
    assert.match(httpsLogin.headers.get("set-cookie"), /; Secure/);
    const logout = await fetch(origin + "/logout", {
      headers: { cookie },
      redirect: "manual",
    });
    assert.equal(logout.status, 302);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  } finally {
    child.kill();
    await once(child, "exit");
    await new Promise((resolve) => backend.close(resolve));
  }
});
