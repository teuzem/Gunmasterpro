import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const project = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(project, relativePath), "utf8");

describe("contrat SEO SSR", () => {
  it("prévoit un shell SSR avec hydratation client", () => {
    const html = read("client/index.html");
    const entry = read("client/src/entry-client.tsx");
    expect(html).toContain("<!--app-head-->");
    expect(html).toContain("<!--app-html-->");
    expect(html).toContain("/src/entry-client.tsx");
    expect(entry).toContain("hydrateRoot");
  });

  it("génère des métadonnées, un sitemap et des exclusions robots", () => {
    const prefetch = read("client/src/ssr/prefetch.ts");
    const seo = read("server/seo.ts");
    const vite = read("server/_core/vite.ts");
    expect(prefetch).toContain('"@type": "Product"');
    expect(prefetch).toContain('"@type": "BreadcrumbList"');
    expect(seo).toContain('app.get("/sitemap.xml"');
    expect(seo).toContain('app.get("/robots.txt"');
    expect(seo).toContain("Disallow: /administration");
    expect(vite).toContain("buildHeadTags");
    expect(vite).toContain("result.head.notFound ? 404 : 200");
  });

  it("n'a dans index.html aucune URL d'asset que Vite traiterait comme un chemin local", () => {
    // Vite transforme les attributs src/href des <link> et <script> en assets à
    // empaqueter. Une valeur "/" est résolue comme un répertoire et fait échouer
    // le build (EISDIR). De même, un placeholder %VITE_* non résolu reste
    // littéral et est traité comme un chemin local.
    // Ces deux cas ont fait échouer le build Docker sans que `pnpm check` ni
    // `pnpm test` ne les détectent : seule l'étape `pnpm build` les voyait.
    const html = read("client/index.html");

    const assetAttributes = [...html.matchAll(/<(?:script|link)\b[^>]*?\s(?:src|href)\s*=\s*"([^"]*)"/gi)].map((match) => match[1]);

    expect(assetAttributes.length).toBeGreaterThan(0);
    for (const value of assetAttributes) {
      expect(value, `URL d'asset invalide dans index.html : "${value}"`).not.toMatch(/%VITE_[A-Z_]+%/);
      expect(value, `URL d'asset invalide dans index.html : "${value}"`).not.toBe("/");
    }
  });
});
