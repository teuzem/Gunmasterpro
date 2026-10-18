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
});
