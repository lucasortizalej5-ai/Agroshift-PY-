import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  serializeState,
  hasBasicAccess,
  parseCookies,
  createSessionToken,
  verifySession,
  secureEqual,
} from "./ssr-utils.mjs";

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

function renderLoginPage(errorMessage = "", lang = "en") {
  const isEn = lang === "en";
  return `<!doctype html>
<html lang="${isEn ? "en" : "es"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#173f32">
  <title>${isEn ? "Sign In · AgroShift PY" : "Iniciar Sesión · AgroShift PY"}</title>
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 20%, #1e4b3b 0%, #0d221a 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a202c;
      padding: 20px;
    }
    .login-card {
      position: relative;
      background: #ffffff;
      width: 100%;
      max-width: 410px;
      padding: 38px 34px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1);
      text-align: center;
    }
    .login-lang {
      position: absolute;
      top: 18px;
      right: 20px;
      display: flex;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
    }
    .login-lang a {
      color: #94a3b8;
      text-decoration: none;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .login-lang a.active {
      color: #173f32;
      background: #e2e8f0;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .logo-img {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      box-shadow: 0 4px 14px rgba(23, 63, 50, 0.35);
    }
    .brand-name {
      font-size: 25px;
      font-weight: 800;
      color: #173f32;
      letter-spacing: -0.5px;
    }
    .brand-name span {
      color: #648643;
    }
    .brand-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #68796f;
      margin-top: 2px;
      margin-bottom: 22px;
    }
    .login-title {
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 18px;
    }
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 20px;
      text-align: left;
    }
    .form-group {
      text-align: left;
      margin-bottom: 18px;
    }
    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid #d1d5db;
      border-radius: 10px;
      font-size: 14px;
      color: #111827;
      background: #f9fafb;
      transition: all 0.2s ease;
      outline: none;
    }
    .form-control:focus {
      border-color: #2e6047;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(46, 96, 71, 0.15);
    }
    .btn-submit {
      width: 100%;
      padding: 12px;
      background: #173f32;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.2s ease, transform 0.1s ease;
    }
    .btn-submit:hover {
      background: #235544;
    }
    .btn-submit:active {
      transform: scale(0.99);
    }
    .login-footer {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="login-lang">
      <a href="/login?lang=es" class="${!isEn ? "active" : ""}">ES</a>
      <span>/</span>
      <a href="/login?lang=en" class="${isEn ? "active" : ""}">EN</a>
    </div>
    <div class="logo-container">
      <img src="/icon.svg" alt="AgroShift Logo" class="logo-img">
    </div>
    <div class="brand-name">AgroShift<span>PY</span></div>
    <div class="brand-tag">${isEn ? "FROM SPACE TO YOUR LAND" : "DEL ESPACIO A TU TIERRA"}</div>

    <div class="login-title">${isEn ? "Sign in to your field" : "Iniciar sesión en tu campo"}</div>

    ${errorMessage ? `<div class="error-banner">${errorMessage}</div>` : ""}

    <form method="POST" action="/login${isEn ? "?lang=en" : ""}">
      <div class="form-group">
        <label for="username">${isEn ? "Username" : "Usuario"}</label>
        <input type="text" id="username" name="username" class="form-control" placeholder="${isEn ? "Enter your username" : "Ingresá tu usuario"}" required autofocus>
      </div>
      <div class="form-group">
        <label for="password">${isEn ? "Password" : "Contraseña"}</label>
        <input type="password" id="password" name="password" class="form-control" placeholder="••••••••••••" required>
      </div>
      <button type="submit" class="btn-submit">${isEn ? "Enter dashboard" : "Ingresar al panel"}</button>
    </form>

    <div class="login-footer">
      ${isEn ? "Protected access · Connected with NASA POWER" : "Acceso protegido · Conectado con NASA POWER"}
    </div>
  </div>
</body>
</html>`;
}

const app = express();
app.disable("x-powered-by");

// Static assets needed for login without auth
app.get("/icon.svg", (req, res) => {
  const iconPath = production
    ? path.join(root, "dist/client/icon.svg")
    : path.join(root, "public/icon.svg");
  res.sendFile(iconPath, (err) => {
    if (err) res.sendFile(path.join(root, "public/icon.svg"));
  });
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");

  if (
    req.path === "/healthz" ||
    req.path === "/icon.svg" ||
    req.path === "/favicon.ico"
  ) {
    return next();
  }

  // Browsers cannot mutate data from another origin using stored Basic credentials.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host)
        return res.status(403).json({
          error: { code: "ORIGIN_REJECTED", message: "Origen no permitido." },
        });
    } catch {
      return res.sendStatus(403);
    }
  }

  // Cerrar sesión: siempre borra la cookie de sesión y redirige al login
  if (req.path === "/logout") {
    res.setHeader(
      "Set-Cookie",
      "agroshift_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    );
    return res.redirect("/login");
  }

  const cookies = parseCookies(req.headers.cookie);
  const isCookie = verifySession(
    cookies.agroshift_session,
    username,
    internalToken,
  );
  const isBasic = hasBasicAccess(req.headers.authorization, username, password);

  // Para APIs o pruebas automatizadas con JSON/Basic Auth: permitir Basic o Cookie.
  // Para navegación web (HTML en navegador): requerir la cookie de sesión para evitar bucles con Basic Auth previo.
  const isApiRequest =
    req.path.startsWith("/api") ||
    req.headers["content-type"] === "application/json";
  const isAuth =
    !protectedMode || (isApiRequest ? isBasic || isCookie : isCookie);

  const userLang =
    req.query?.lang === "en" || req.query?.lang === "es"
      ? req.query.lang
      : ["en", "es"].includes(cookies.agroshift_lang)
        ? cookies.agroshift_lang
        : "en";
  if (req.query?.lang) {
    res.setHeader(
      "Set-Cookie",
      `agroshift_lang=${encodeURIComponent(userLang)}; Path=/; Max-Age=31536000`,
    );
  }

  if (isAuth) {
    if (req.path === "/login" && req.method === "GET") {
      return res.redirect("/");
    }
  } else {
    if (req.path === "/login") {
      if (req.method === "GET") {
        return res.send(renderLoginPage("", userLang));
      }
      return next();
    }
    if (
      req.path.startsWith("/api") ||
      req.headers["content-type"] === "application/json"
    ) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            userLang === "en"
              ? "Unauthorized access. Please log in."
              : "Acceso no autorizado. Iniciá sesión con tus credenciales.",
        },
      });
    }
    return res.send(renderLoginPage("", userLang));
  }

  next();
});

app.post(
  "/login",
  express.urlencoded({ extended: false, limit: "8kb" }),
  express.json({ limit: "8kb" }),
  (req, res) => {
    const user = req.body?.username || "";
    const pass = req.body?.password || "";
    if (
      user &&
      pass &&
      secureEqual(user, username) &&
      secureEqual(pass, password)
    ) {
      const token = createSessionToken(username, internalToken);
      res.setHeader(
        "Set-Cookie",
        `agroshift_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${req.secure || req.get("x-forwarded-proto") === "https" ? "; Secure" : ""}`,
      );
      if (req.headers["content-type"]?.includes("application/json")) {
        return res.json({ success: true, redirect: "/" });
      }
      return res.redirect("/");
    }
    const cookies = parseCookies(req.headers.cookie);
    const userLang = req.query?.lang || cookies?.agroshift_lang || "en";
    const isJson = req.headers["content-type"]?.includes("application/json");
    if (isJson) {
      return res.status(401).json({
        error:
          userLang === "en"
            ? "Invalid username or password."
            : "Usuario o contraseña incorrectos.",
      });
    }
    return res
      .status(401)
      .send(
        renderLoginPage(
          userLang === "en"
            ? "Invalid username or password. Check credentials."
            : "Usuario o contraseña incorrectos. Verificá los datos ingresados.",
          userLang,
        ),
      );
  },
);

app.get("/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "agroshift_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );
  return res.redirect("/login");
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
      return res.status(503).json({
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
    const cookies = parseCookies(req.headers.cookie);
    initialState.initialLang = cookies.agroshift_lang === "es" ? "es" : "en";
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
  res.status(error.status || 500).json({
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
