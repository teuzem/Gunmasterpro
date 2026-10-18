import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";

const origin = typeof window !== "undefined" ? window.location.origin : "https://gunmaster-pro.com";
const defaults: Record<string, { title: string; description: string }> = {
  "/": { title: "GunsMasterPro | Catalogue européen de produits de tir", description: "Catalogue européen de produits de tir, médias vérifiés et demande encadrée." },
  "/catalogue": { title: "Catalogue de produits de tir | GunsMasterPro", description: "Explorez le catalogue GunsMasterPro par familles, disponibilités, calibres et caractéristiques vérifiées." },
};

function upsert(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!element) { element = document.createElement(selector.startsWith("link") ? "link" : "meta"); document.head.appendChild(element); }
  Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
}

export function SeoHead() {
  const [location] = useLocation();
  const slug = location.match(/^\/produit\/([^/]+)/)?.[1];
  const product = trpc.catalogue.bySlug.useQuery({ slug: slug ?? "seo-placeholder" }, { enabled: Boolean(slug) });
  useEffect(() => {
    const fallback = defaults[location] ?? { title: `GunsMasterPro | ${location.startsWith("/categorie/") ? "Catégorie" : "Informations"}`, description: "Informations et catalogue GunsMasterPro." };
    const title = product.data ? `${product.data.name} | GunsMasterPro` : fallback.title;
    const description = product.data ? product.data.excerpt : fallback.description;
    const canonical = `${origin}${location}`;
    document.title = title;
    upsert('meta[name="description"]', { name: "description", content: description });
    upsert('link[rel="canonical"]', { rel: "canonical", href: canonical });
    upsert('meta[property="og:title"]', { property: "og:title", content: title });
    upsert('meta[property="og:description"]', { property: "og:description", content: description });
    upsert('meta[property="og:url"]', { property: "og:url", content: canonical });
    if (product.data?.imageUrl) upsert('meta[property="og:image"]', { property: "og:image", content: product.data.imageUrl.startsWith("http") ? product.data.imageUrl : `${origin}${product.data.imageUrl}` });
  }, [location, product.data]);
  return null;
}
