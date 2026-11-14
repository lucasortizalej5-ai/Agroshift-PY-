import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { serializeState, hasBasicAccess } from "./ssr-utils.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(root, "../.env"), quiet: true });
const production = process.argv.includes("--production");
const protectedMode = process.env.APP_ENV === "production";
const api = process.env.API_BASE_URL || "http://127.0.0.1:8000";
const internalToken = process.env.API_INTERNAL_TOKEN || "";
const username = process.env.WEB_USERNAME || "",
  password = process.env.WEB_PASSWORD || "";
if (
  protectedMode &&
  (!username || password.length < 12 || internalToken.length < 32)
)
  throw Error(
    "Producción requiere WEB_USERNAME, WEB_PASSWORD (12+ caracteres) y API_INTERNAL_TOKEN (32+).",
  );
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 5173);
if (
  host !== "127.0.0.1" &&
  host !== "localhost" &&
  host !== "::1" &&
  !protectedMode
)
  throw Error(
    "Para escuchar fuera de localhost configurá APP_ENV=production y las credenciales.",
  );
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
  if (req.path === "/healthz") return next();
  if (
    protectedMode &&
    !hasBasicAccess(req.headers.authorization, username, password)
  ) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="AgroShift PY", charset="UTF-8"',
    );
    return res
      .status(401)
      .send("Acceso de equipo. Ingresá las credenciales del despliegue.");
  }
  // Browsers cannot mutate data from another origin using stored Basic credentials.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host)
        return res
          .status(403)
          .json({
            error: { code: "ORIGIN_REJECTED", message: "Origen no permitido." },
          });
    } catch {
      return res.sendStatus(403);
    }
  }
  next();
});
app.get("/healthz", async (req, res) => {
  try {
    const r = await fetch(api + "/api/health", {
      signal: AbortSignal.timeout(2500),
    });
    return res
      .status(r.ok ? 200 : 503)
      .json({ status: r.ok ? "ok" : "degraded", ssr: true });
  } catch {
    return res.status(503).json({ status: "backend_unavailable", ssr: true });
  }
});
app.use(
  "/api",
  express.raw({ type: () => true, limit: "64kb" }),
  async (req, res) => {
    try {
      const response = await fetch(api + req.originalUrl, {
        method: req.method,
        headers: {
          "content-type": "application/json",
          "x-internal-token": internalToken,
        },
        body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
        signal: AbortSignal.timeout(40000),
        redirect: "error",
      });
      res.status(response.status);
      res.setHeader(
        "Content-Type",
        response.headers.get("content-type") || "application/json",
      );
      const content = Buffer.from(await response.arrayBuffer());
      return res.end(content);
    } catch {
      return res
        .status(503)
        .json({
          error: {
            code: "BACKEND_UNAVAILABLE",
            message:
              "No hay conexión con el backend. Verificá que FastAPI esté ejecutándose en el puerto 8000.",
          },
        });
    }
  },
);
let vite;
if (!production) {
  const { createServer } = await import("vite");
  vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);
} else {
  app.use(
    express.static(path.join(root, "dist/client"), {
      index: false,
      immutable: true,
      maxAge: "1h",
    }),
  );
}
app.use(async (req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.path !== "/") return res.status(404).send("Página no encontrada.");
  try {
    const templatePath = production ? "dist/client/index.html" : "index.html";
    let template = await fs.readFile(path.join(root, templatePath), "utf8");
    if (vite)
      template = await vite.transformIndexHtml(req.originalUrl, template);
    let initialState;
    try {
      const response = await fetch(api + "/api/bootstrap", {
        headers: { "x-internal-token": internalToken },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw Error("API_BOOTSTRAP");
      initialState = await response.json();
    } catch {
      initialState = {
        error:
          "El backend no está disponible. Iniciá FastAPI y recargá la página.",
        parcels: [],
        crops: [],
        region: null,
        default_period: null,
      };
    }
    const { render } = vite
      ? await vite.ssrLoadModule("/src/entry-server.jsx")
      : await import("./dist/server/entry-server.js");
    const html = render(initialState);
    const page = template
      .replace("<!--app-html-->", () => html)
      .replace("<!--app-state-->", () => serializeState(initialState));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(initialState.error ? 503 : 200).end(page);
  } catch (error) {
    vite?.ssrFixStacktrace(error);
    console.error("SSR render failed:", error.name);
    res
      .status(500)
      .send(
        "No se pudo renderizar AgroShift PY. Revisá la instalación y la compilación.",
      );
  }
});
app.use((error, req, res, next) =>
  res
    .status(error.status || 500)
    .json({
      error: {
        code: "SERVER_ERROR",
        message:
          error.status === 413
            ? "Solicitud demasiado grande."
            : "No se pudo procesar la solicitud.",
      },
    }),
);
const server = app.listen(port, host, () =>
  console.log(
    `AgroShift PY SSR: http://${host}:${port} (${production ? "producción" : "desarrollo"})`,
  ),
);
const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
