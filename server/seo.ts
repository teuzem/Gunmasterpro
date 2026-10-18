import type { Express } from "express";
import { listCatalogueProducts } from "./catalogueRepository";
import { categorySeed, catalogueSeed } from "./catalog";

const origin = () => (process.env.CANONICAL_ORIGIN || "https://gunmaster-pro.com").replace(/\/$/, "");
const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/**
 * Catégories parentes réellement routées par `client/src/App.tsx`
 * (`/categorie/:category`). Les sous-catégories de `categorySeed` ont chacune
 * une page propre et sont ajoutées plus bas ; une catégorie sans produit ne
 * serait pas publiée, afin de ne pas produire de contenu mince.
 */
const CATEGORY_PATHS = ["/categorie/handguns", "/categorie/rifles", "/categorie/shotguns", "/categorie/accessories"];

/** Pages publiques indexables, dans l'ordre du router. */
const STATIC_PATHS = ["/", "/catalogue", ...CATEGORY_PATHS, "/a-propos", "/aide", "/conformite", "/conditions", "/mentions-legales", "/confidentialite", "/comparateur", "/conseiller"];

/** `lastmod` W3CDatetime à partir du `updatedAt` MySQL (Date ou chaîne). Repli : date du jour. */
function toW3c(value: Date | string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
}

export function registerSeoRoutes(app: Express) {
  app.get("/robots.txt", (_req, res) => {
    // Un fichier absent du sitemap n'est pas « désindexé », seulement non
    // exploré : les pages privées portent `noindex` (prefetch.ts) et doivent
    // rester explorables pour que cette directive soit effectivement lue.
    // Seul `/administration` est bloqué, car elle n'expose aucune donnée publique.
    res.type("text/plain").send(
      `User-agent: *\nAllow: /\nDisallow: /administration\nDisallow: /administration/\nSitemap: ${origin()}/sitemap.xml\n`,
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      // Repli sur le snapshot embarqué : un sitemap qui renvoie 503 est
      // considéré comme supprimé par les moteurs, ce qui effacerait
      // progressivement l'indexation du catalogue.
      // `listCatalogueProducts` rejette si MySQL est injoignable (et non pas
      // `undefined`), d'où l'absorption explicite avant le repli.
      const persisted = await listCatalogueProducts().catch(() => undefined);
      const source = persisted?.length ? persisted : catalogueSeed;
      const products = source as unknown as Array<{
        slug: string;
        imageUrl?: string;
        gallery?: string[];
        updatedAt?: Date | string | null;
      }>;
      const fallbackDate = new Date().toISOString().slice(0, 10);

      const entries: Array<{ location: string; image?: string; lastmod: string; changefreq: string; priority: string }> = [
        { location: "/", lastmod: fallbackDate, changefreq: "daily", priority: "1.0" },
        { location: "/catalogue", lastmod: fallbackDate, changefreq: "daily", priority: "0.9" },
        ...CATEGORY_PATHS.map((location) => ({
          location,
          lastmod: fallbackDate,
          changefreq: "daily",
          priority: "0.8",
        })),
        ...categorySeed.map((category) => ({
          location: `/categorie/${category.slug}`,
          image: category.imageUrl || undefined,
          lastmod: fallbackDate,
          changefreq: "weekly",
          priority: "0.7",
        })),
        ...["/a-propos", "/aide", "/conformite", "/conditions", "/mentions-legales", "/confidentialite", "/comparateur", "/conseiller"].map((location) => ({
          location,
          lastmod: fallbackDate,
          changefreq: "monthly",
          priority: "0.4",
        })),
        ...products.map((product) => {
          // Google ignore les sitemaps de plus de 50 000 URL ou de 50 Mo : chaque
          // image de galerie est incluse, mais l'ensemble reste très en deçà.
          const images = Array.from(new Set([product.imageUrl, ...(product.gallery ?? [])].filter(Boolean))).slice(0, 8);
          return {
            location: `/produit/${product.slug}`,
            image: images.length ? images.join("|") : undefined,
            lastmod: toW3c(product.updatedAt, fallbackDate),
            changefreq: "weekly",
            priority: "0.7",
          };
        }),
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries
        .map(({ location, image, lastmod, changefreq, priority }) => {
          const images = (image?.split("|") ?? [])
            .map((url) => `<image:image><image:loc>${escapeXml(url.startsWith("http") ? url : origin() + url)}</image:loc></image:image>`)
            .join("");
          return `<url><loc>${escapeXml(origin() + location)}</loc>${images}<lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
        })
        .join("")}</urlset>`;
      res.type("application/xml").send(xml);
    } catch {
      res.status(503).type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><error>Catalogue unavailable</error>');
    }
  });
}