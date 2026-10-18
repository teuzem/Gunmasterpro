import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import superjson from "superjson";
import { buildSsrPrefetch } from "./ssrCaller";
import type { HeadMeta } from "../../client/src/ssr/prefetch";

const canonicalOrigin = () => (process.env.CANONICAL_ORIGIN || "https://gunspro-manu-bcfvkwwp.manus.space").replace(/\/$/, "");
const siteName = () => process.env.SITE_NAME || "GunsMasterPro";
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const clamp = (value: string, limit: number) => value.replace(/\s+/g, " ").trim().slice(0, limit);
const absoluteUrl = (value?: string) => value ? value.startsWith("http") ? value : `${canonicalOrigin()}${value.startsWith("/") ? value : `/${value}`}` : undefined;
const absoluteJson = (value: unknown): unknown => {
  if (typeof value === "string" && value.startsWith("/")) return absoluteUrl(value);
  if (Array.isArray(value)) return value.map(absoluteJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, absoluteJson(item)]));
  return value;
};

const DEFAULT_KEYWORDS = "catalogue tir Europe USA, firearms catalogue USA, Waffenkatalog Europa, handguns pistolets 9mm, rifles carabines 7.62, shotguns fusils cal.12, Kurzwaffen Büchsen Flinten, optics Zubehör 18+";
function clampKeywordsTag(raw: string | undefined): string {
  const parts = (raw || DEFAULT_KEYWORDS).split(",").map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.some((item) => item.toLowerCase() === part.toLowerCase())) unique.push(part);
    if (unique.length >= 8) break;
  }
  while (unique.length < 3) for (const fallback of DEFAULT_KEYWORDS.split(",").map((s) => s.trim())) {
    if (unique.length >= 3) break;
    if (!unique.some((item) => item.toLowerCase() === fallback.toLowerCase())) unique.push(fallback);
  }
  return unique.slice(0, 8).join(", ").slice(0, 200);
}

function buildHeadTags(head: HeadMeta) {
  // Plafonds stricts : titre ≤70, description ≤160, keywords 3-8 termes et ≤200 caractères.
  const title = escapeHtml(clamp(head.title || siteName(), 70));
  const description = escapeHtml(clamp(head.description || "Catalogue européen de produits de tir.", 160));
  const keywords = escapeHtml(clampKeywordsTag(head.keywords));
  const canonical = head.canonicalPath ? `${canonicalOrigin()}${head.canonicalPath}` : undefined;
  const image = absoluteUrl(head.ogImage);
  const imageAlt = escapeHtml(clamp(head.ogImageAlt || head.title || siteName(), 120));
  const canonicalPath = head.canonicalPath ?? "/";
  const langVariant = (lang: string) => `${canonicalOrigin()}${canonicalPath}${canonicalPath.includes("?") ? "&" : "?"}lang=${lang}`;
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="keywords" content="${keywords}" />`,
    `<meta name="author" content="${escapeHtml(siteName())}" />`,
    `<meta name="theme-color" content="#071015" />`,
    `<meta http-equiv="content-language" content="fr, en, de" />`,
    `<meta property="og:type" content="${head.ogType === "product" ? "product" : "website"}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteName())}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:locale:alternate" content="en_US" />`,
    `<meta property="og:locale:alternate" content="en_GB" />`,
    `<meta property="og:locale:alternate" content="de_DE" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ];
  if (canonical) {
    tags.push(
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      `<link rel="alternate" hreflang="fr" href="${escapeHtml(canonical)}" />`,
      `<link rel="alternate" hreflang="en" href="${escapeHtml(langVariant("en"))}" />`,
      `<link rel="alternate" hreflang="de" href="${escapeHtml(langVariant("de"))}" />`,
      `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}" />`,
    );
  }
  if (image) {
    tags.push(`<link rel="preload" as="image" href="${escapeHtml(image)}" fetchpriority="high" />`);
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`, `<meta property="og:image:alt" content="${imageAlt}" />`, `<meta name="twitter:image" content="${escapeHtml(image)}" />`, `<meta name="twitter:image:alt" content="${imageAlt}" />`);
  }
  if (head.noindex || head.notFound) tags.push(`<meta name="robots" content="noindex, follow" />`);
  else tags.push(`<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`);
  for (const schema of head.jsonLd ?? []) tags.push(`<script type="application/ld+json">${JSON.stringify(absoluteJson(schema)).replace(/</g, "\\u003c")}</script>`);
  return tags.join("\n");
}

function composeHtml(template: string, appHtml: string, head: HeadMeta, dehydratedState: unknown) {
  const state = JSON.stringify(superjson.serialize(dehydratedState)).replace(/</g, "\\u003c");
  return template
    .replace("</body>", () => `<script>window.__RQ_STATE__ = ${state}</script></body>`)
    .replace("<!--app-head-->", () => buildHeadTags(head))
    .replace("<!--app-html-->", () => appHtml);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/entry-client.tsx"`, `src="/src/entry-client.tsx?v=${nanoid()}"`);
      template = await vite.transformIndexHtml(url, template);
      template = template.replace("</head>", `<link rel="stylesheet" href="/src/index.css?direct" data-ssr-dev-css></head>`);
      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const prefetch = await buildSsrPrefetch(req, res);
      const result = await render(url, prefetch);
      res.status(result.head.notFound ? 404 : 200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(composeHtml(template, result.html, result.head, result.dehydratedState));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const configuredStaticDir = process.env.STATIC_DIR;
  const distPath = configuredStaticDir
    ? path.resolve(process.cwd(), configuredStaticDir)
    : process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use((req, res, next) => {
    if (req.path === "/index.html") return res.redirect(301, "/");
    if (req.path !== "/" && (/\/+$/).test(req.path)) return res.redirect(301, req.path.replace(/\/+$/, "") || "/");
    next();
  });
  // Core Web Vitals : assets Vite hashés Garr cache long immutable, HTML SSR reste no-cache.
  app.use(express.static(distPath, {
    index: false,
    redirect: false,
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
  }));
  const templatePath = path.resolve(distPath, "index.html");
  const serverEntryPath = configuredStaticDir
    ? path.resolve(process.cwd(), path.dirname(configuredStaticDir), "server-ssr", "entry-server.js")
    : path.resolve(import.meta.dirname, "server-ssr", "entry-server.js");
  app.use("*", async (req, res) => {
    try {
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const { render } = await import(serverEntryPath);
      const prefetch = await buildSsrPrefetch(req, res);
      const result = await render(req.originalUrl, prefetch);
      res.status(result.head.notFound ? 404 : 200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(composeHtml(template, result.html, result.head, result.dehydratedState));
    } catch (error) {
      console.error("[SSR] render failed, serving shell:", error);
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const fallback: HeadMeta = { title: siteName(), description: "Catalogue européen de produits de tir.", keywords: DEFAULT_KEYWORDS };
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(composeHtml(template, "", fallback, {}));
    }
  });
}
