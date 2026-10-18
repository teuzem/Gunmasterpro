import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { subCategoryBySlug } from "../../../server/catalog";
import { trpc } from "@/lib/trpc";

export type HeadMeta = {
  title: string;
  description: string;
  /** 3 à 8 mots-clés ciblés, séparés par virgules. Plafond strict : jamais <3 ni >8. */
  keywords?: string;
  canonicalPath?: string;
  ogType?: "website" | "product";
  ogImage?: string;
  ogImageAlt?: string;
  noindex?: boolean;
  notFound?: boolean;
  jsonLd?: Record<string, unknown>[];
};

type RouterOutput = inferRouterOutputs<AppRouter>;
export type SsrPrefetch = {
  catalogueList: (input?: { search?: string }) => Promise<RouterOutput["catalogue"]["list"]>;
  catalogueBySlug: (input: { slug: string }) => Promise<RouterOutput["catalogue"]["bySlug"]>;
  categoriesList: () => Promise<RouterOutput["categories"]["list"]>;
  heroSlides: () => Promise<RouterOutput["homepage"]["heroSlides"]>;
  reviewsList: (input: { productId: number }) => Promise<RouterOutput["reviews"]["list"]>;
};

const SITE_NAME = "GunsMasterPro";
const SITE_DESCRIPTION = "Catalogue européen de produits de tir, médias traçables et demandes encadrées.";
// Mots-clés trilingues FR/EN/DE + domination locale Europe/USA (8 max strict, ≤200 car.).
const HOME_KEYWORDS = "catalogue tir Europe USA, firearms catalogue USA, Waffenkatalog Europa, handguns pistolets 9mm, rifles carabines 7.62, shotguns fusils cal.12, Kurzwaffen Büchsen Flinten, optics Zubehör 18+";
const CATALOGUE_KEYWORDS = "catalogue tir européen, European firearms catalogue USA, europäischer Waffenkatalog, handguns rifles shotguns, pistolets carabines fusils, Kurzwaffen Büchsen Flinten, comparateur";
const CATEGORY_KEYWORDS: Record<string, string> = {
  handguns: "armes de poing, handguns pistols revolvers, Kurzwaffen Pistolen Revolver, 9mm 45ACP 22LR, catalogue Europe USA, comparateur",
  rifles: "carabines, rifles Büchsen, Selbstladebüchse Repetierbüchse, 7.62x39 223Rem 308Win, catalogue Europe USA, comparateur",
  shotguns: "fusils, shotguns Flinten, Bockflinte Doppelflinte, calibre 12 pump semi-auto, catalogue Europe USA, comparateur",
  accessories: "accessoires tir, firearms accessories optics, Waffenzubehör Optik Schalldämpfer, magazines chargeurs Magazine, catalogue Europe USA, comparateur",
};
// Limite stricte : 3 à 8 mots-clés max. Tronque à 8, complète si <3.
function clampKeywords(raw: string, fallback: string): string {
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  const base = parts.length ? parts : fallback.split(",").map((part) => part.trim()).filter(Boolean);
  return base.slice(0, 8).join(", ");
}
const CALIBER_STOP = /^(à confirmer|to be confirmed|non renseigné|—|-)$/i;
function shortCaliber(raw?: string | null): string {
  const value = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!value || CALIBER_STOP.test(value)) return "";
  return value.slice(0, 24);
}
function trilingualCategory(category: string): string {
  if (category === "handguns") return "handguns pistolets Kurzwaffen";
  if (category === "rifles") return "rifles carabines Büchsen";
  if (category === "shotguns") return "shotguns fusils Flinten";
  return "accessories accessoires Zubehör";
}
function productKeywords(product: { name: string; brand: string; category: string; caliber?: string | null; model?: string | null }): string {
  const caliber = shortCaliber(product.caliber);
  const model = (product.model ?? "").replace(/\s+/g, " ").trim().slice(0, 32);
  const candidates = [product.brand.trim(), caliber, trilingualCategory(product.category), model, "firearms catalogue Europe USA", "18+ demande encadrée"]
    .map((value) => (value ?? "").trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const candidate of candidates) {
    if (!unique.some((item) => item.toLowerCase() === candidate.toLowerCase())) unique.push(candidate);
    if (unique.length >= 6) break;
  }
  while (unique.length < 3) unique.push("catalogue tir européen");
  return clampKeywords(unique.join(", "), HOME_KEYWORDS);
}
const staticPages: Record<string, { title: string; description: string }> = {
  "/a-propos": { title: `À propos · ${SITE_NAME}`, description: "Découvrez la démarche documentaire et les repères éditoriaux de GunsMasterPro." },
  "/aide": { title: `Centre d’aide · ${SITE_NAME}`, description: "Aide, informations pratiques et réponses aux questions fréquentes GunsMasterPro." },
  "/confidentialite": { title: `Confidentialité · ${SITE_NAME}`, description: "Informations relatives à la confidentialité et aux données personnelles." },
  "/mentions-legales": { title: `Mentions légales · ${SITE_NAME}`, description: "Mentions légales de GunsMasterPro." },
  "/conditions": { title: `Conditions · ${SITE_NAME}`, description: "Conditions d’utilisation et de demande GunsMasterPro." },
  "/conformite": { title: `Conformité · ${SITE_NAME}`, description: "Informations de conformité et cadre de demande GunsMasterPro." },
  "/conseiller": { title: `Conseiller · ${SITE_NAME}`, description: "Préparez une demande documentée avec l’accompagnement GunsMasterPro." },
  "/comparateur": { title: `Comparateur · ${SITE_NAME}`, description: "Comparez les caractéristiques disponibles des références GunsMasterPro." },
};

const categories = new Set(["handguns", "rifles", "shotguns", "accessories"]);
const categoryLabels: Record<string, string> = { handguns: "Armes de poing", rifles: "Carabines", shotguns: "Fusils", accessories: "Accessoires" };

/** Libellé de famille dans la langue demandée, pour le fil d'Ariane. */
const FAMILY_I18N: Record<string, Record<Locale, string>> = {
  handguns: { fr: "Armes de poing", en: "Handguns", de: "Kurzwaffen" },
  rifles: { fr: "Carabines", en: "Rifles", de: "Büchsen" },
  shotguns: { fr: "Fusils", en: "Shotguns", de: "Flinten" },
  accessories: { fr: "Accessoires", en: "Accessories", de: "Zubehör" },
};

type Locale = "fr" | "en" | "de";

/** Les URLs sont monolingues : la langue se déduit du segment racine. */
function localeFromPath(path: string): Locale {
  const [, segment] = path.split("/");
  return segment === "en" || segment === "de" ? segment : "fr";
}
const siteSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: "/",
  logo: "/favicon.png",
  sameAs: [],
  contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", availableLanguage: ["fr", "en", "de"] }],
};
// FAQ visible sur / (FAQSection FR/EN/DE) : FAQPage trilingue pour capter le trafic Europe + monde.
const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Comment explorer le catalogue ?", acceptedAnswer: { "@type": "Answer", text: "La recherche globale accepte les noms de catégories, marques, calibres et mots-clés. Les filtres resserrent ensuite la sélection par disponibilité, matériau, capacité ou budget." } },
    { "@type": "Question", name: "Puis-je demander depuis l’Europe ?", acceptedAnswer: { "@type": "Answer", text: "Vous pouvez préparer une demande depuis le site. Âge 18+, autorisations, disponibilité et conditions applicables à la catégorie et au territoire sont examinés avant toute suite." } },
    { "@type": "Question", name: "Les prix sont-ils confirmés ?", acceptedAnswer: { "@type": "Answer", text: "Prix et indicateurs de stock facilitent la sélection. Ils sont revérifiés avec la référence exacte, les quantités et les conditions applicables avant confirmation." } },
    { "@type": "Question", name: "Comment suivre ma demande ?", acceptedAnswer: { "@type": "Answer", text: "Après enregistrement, une référence unique permet de consulter l’avancement avec l’adresse e-mail fournie, sans exposition publique du panier." } },
    { "@type": "Question", name: "Que couvre la conformité ?", acceptedAnswer: { "@type": "Answer", text: "Les exigences diffèrent selon pays, catégories et situations. Examen préalable 18+, territoire et règles applicables. Ceci n’est pas un avis juridique." } },
    { "@type": "Question", name: "Puis-je comparer des modèles ?", acceptedAnswer: { "@type": "Answer", text: "Oui. Ajoutez jusqu’à trois références pour comparer caractéristiques, spécifications et différences utiles." } },
    { "@type": "Question", name: "How do I browse the firearms catalogue?", acceptedAnswer: { "@type": "Answer", text: "Global search accepts handguns, rifles, shotguns, brands, calibers and keywords. Filters narrow by availability, material, capacity or budget." } },
    { "@type": "Question", name: "Can I enquire from Europe or worldwide?", acceptedAnswer: { "@type": "Answer", text: "You can prepare an enquiry online. Age 18+, authorisation, availability and territory conditions for firearms are reviewed before any next step." } },
    { "@type": "Question", name: "Are firearms prices confirmed?", acceptedAnswer: { "@type": "Answer", text: "Prices and stock guide selection for handguns, rifles, shotguns and optics. They are rechecked against reference, quantity and applicable rules before confirmation." } },
    { "@type": "Question", name: "What does firearms compliance cover?", acceptedAnswer: { "@type": "Answer", text: "Requirements differ by country, category and situation. Prior review of age, territory and permits applies. This is general information, not legal advice." } },
    { "@type": "Question", name: "Wie durchsuche ich den Waffenkatalog?", acceptedAnswer: { "@type": "Answer", text: "Die Suche erkennt Kurzwaffen, Büchsen, Flinten, Marken, Kaliber und Stichwörter. Filter grenzen nach Verfügbarkeit, Material, Kapazität oder Budget ein." } },
    { "@type": "Question", name: "Kann ich aus Europa anfragen?", acceptedAnswer: { "@type": "Answer", text: "Sie können online anfragen. Alter 18+, Berechtigung, Verfügbarkeit und Gebietsbedingungen für Schusswaffen werden vor weiteren Schritten geprüft." } },
    { "@type": "Question", name: "Was umfasst Compliance bei Schusswaffen?", acceptedAnswer: { "@type": "Answer", text: "Anforderungen unterscheiden sich nach Land, Kategorie und Situation. Vorprüfung von Alter, Gebiet und Erlaubnissen. Keine Rechtsberatung." } },
  ],
};

function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((entry, index) => ({ "@type": "ListItem", position: index + 1, name: entry.name, item: entry.path })),
  };
}

function productListSchema(products: Array<{ name: string; slug: string }>, listName: string, listPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    url: listPath,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 12).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/produit/${product.slug}`,
      name: product.name,
    })),
  };
}

function seed(queryClient: QueryClient, key: unknown, data: unknown) {
  (queryClient as { setQueryData: (queryKey: unknown, value: unknown) => void }).setQueryData(key, data);
}

function cleanPath(url: string) {
  let path = url.split("?")[0] || "/";
  try { path = decodeURI(path); } catch { /* conserver la valeur non décodable */ }
  return path.replace(/\/+$/, "") || "/";
}

function productSchema(product: NonNullable<RouterOutput["catalogue"]["bySlug"]>) {
  const availability = product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const withRating = product as typeof product & { reviewCount?: number; ratingCenti?: number };
  const ratingValue = withRating.reviewCount && withRating.ratingCenti ? Number((withRating.ratingCenti / 100).toFixed(1)) : undefined;
  const gallery = Array.from(new Set([product.imageUrl, ...((product as { gallery?: string[] }).gallery ?? [])].filter(Boolean))).slice(0, 8);
  const additionalProperty = [
    product.caliber ? { "@type": "PropertyValue", name: "caliber", value: product.caliber } : null,
    product.material ? { "@type": "PropertyValue", name: "material", value: product.material } : null,
    product.capacity ? { "@type": "PropertyValue", name: "capacity", value: product.capacity } : null,
    product.manufacturer ? { "@type": "PropertyValue", name: "manufacturer", value: product.manufacturer } : null,
    product.model ? { "@type": "PropertyValue", name: "model", value: product.model } : null,
  ].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.excerpt,
    inLanguage: ["fr", "en", "de"],
    image: gallery,
    sku: product.sourceId || product.slug,
    mpn: product.slug,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    audience: { "@type": "PeopleAudience", suggestedMinAge: 18 },
    ...(additionalProperty.length ? { additionalProperty } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: (product.priceCents / 100).toFixed(2),
      availability,
      url: `/produit/${product.slug}`,
      itemCondition: "https://schema.org/NewCondition",
      availableDeliveryMethod: "https://schema.org/OnSitePickup",
    },
    ...(ratingValue !== undefined
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue, reviewCount: withRating.reviewCount, bestRating: 5, worstRating: 1 } }
      : {}),
  };
}

export async function prefetchForPath(url: string, queryClient: QueryClient, prefetch: SsrPrefetch): Promise<HeadMeta> {
  const path = cleanPath(url);
  const categoryData = await prefetch.categoriesList();
  seed(queryClient, getQueryKey(trpc.categories.list, undefined, "query"), categoryData);

  if (path === "/") {
    // Résilience : si la BD hero est indisponible, l'accueil se rend avec les slides statiques.
    const [products, heroSlides] = await Promise.all([prefetch.catalogueList(), prefetch.heroSlides().catch(() => [])]);
    seed(queryClient, getQueryKey(trpc.catalogue.list, undefined, "query"), products);
    seed(queryClient, getQueryKey(trpc.homepage.heroSlides, undefined, "query"), heroSlides);
    const catalogue = (products ?? []) as Array<{ name: string; slug: string }>;
    const slides = (heroSlides ?? []) as Array<{ imageUrl: string }>;
    const heroImage = slides[0]?.imageUrl;
    return {
      title: `${SITE_NAME} | Catalogue européen de produits de tir`,
      description: SITE_DESCRIPTION,
      keywords: HOME_KEYWORDS,
      canonicalPath: "/",
      ogType: "website",
      ogImage: heroImage,
      ogImageAlt: "GunsMasterPro — catalogue européen armes à feu handguns rifles shotguns",
      jsonLd: [
        siteSchema,
        { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, alternateName: ["GunsMasterPro firearms", "GunsMasterPro Waffen"], url: "/", inLanguage: ["fr", "en", "de"], publisher: { "@type": "Organization", name: SITE_NAME, logo: "/favicon.png" }, potentialAction: { "@type": "SearchAction", target: "/catalogue?q={search_term_string}", "query-input": "required name=search_term_string" } },
        { "@context": "https://schema.org", "@type": "WebPage", name: `${SITE_NAME} | Catalogue européen de produits de tir`, url: "/", description: SITE_DESCRIPTION, inLanguage: ["fr", "en", "de"], audience: { "@type": "PeopleAudience", suggestedMinAge: 18 }, isPartOf: { "@type": "WebSite", name: SITE_NAME, url: "/" } },
        breadcrumbSchema([{ name: "Accueil", path: "/" }]),
        homeFaqSchema,
        ...(catalogue.length ? [productListSchema(catalogue, `Sélection ${SITE_NAME}`, "/")] : []),
      ],
    };
  }

  if (path === "/catalogue" || path.startsWith("/categorie/")) {
    const queryString = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
    const search = new URLSearchParams(queryString).get("q")?.trim() || undefined;
    const input = search ? { search } : undefined;
    const products = await prefetch.catalogueList(input);
    seed(queryClient, getQueryKey(trpc.catalogue.list, input, "query"), products);
    const category = path.startsWith("/categorie/") ? path.split("/")[2] : undefined;
    const locale = localeFromPath(path);
    const subCategory = category ? subCategoryBySlug.get(category) : undefined;

    if (category && !categories.has(category) && !subCategory) {
      return { title: `${SITE_NAME} | Référence introuvable`, description: SITE_DESCRIPTION, keywords: HOME_KEYWORDS, notFound: true };
    }

    // Sous-catégorie : les libellés viennent de la taxonomie réelle, donc
    // l'URL, le titre et la description restent alignés sur le contenu réel.
    if (subCategory) {
      const label = subCategory.labelI18n?.[locale] ?? subCategory.label;
      const description = subCategory.descriptionI18n?.[locale] ?? subCategory.description;
      const family = FAMILY_I18N[subCategory.parentCategory]?.[locale] ?? subCategory.parentCategory;
      const members = ((products ?? []) as Array<{ subCategory?: string; name: string; slug: string }>)
        .filter((product) => product.subCategory === subCategory.slug);
      return {
        title: `${label} — ${SITE_NAME}`,
        description,
        keywords: `${label}, ${family}, ${SITE_NAME} catalogue`,
        canonicalPath: path,
        ogType: "website",
        ogImage: subCategory.imageUrl,
        ogImageAlt: `${label} — ${family}`,
        noindex: Boolean(search),
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${label} · ${SITE_NAME}`,
            url: path,
            description,
            inLanguage: ["fr", "en", "de"],
            audience: { "@type": "PeopleAudience", suggestedMinAge: 18 },
            isPartOf: { "@type": "WebSite", name: SITE_NAME, url: "/" },
            mainEntity: {
              "@type": "ItemList",
              name: label,
              numberOfItems: members.length,
              itemListElement: members.slice(0, 24).map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `/produit/${product.slug}`,
                name: product.name,
              })),
            },
          },
          breadcrumbSchema([
            { name: locale === "de" ? "Startseite" : "Accueil", path: "/" },
            { name: locale === "de" ? "Katalog" : "Catalogue", path: "/catalogue" },
            { name: family, path: `/categorie/${subCategory.parentCategory}` },
            { name: label, path },
          ]),
        ],
      };
    }

    const label = category ? categoryLabels[category] : "Catalogue";
    const catalogue = (products ?? []) as Array<{ name: string; slug: string }>;
    const categoryKeywords = category && CATEGORY_KEYWORDS[category]
      ? clampKeywords(CATEGORY_KEYWORDS[category]!, CATALOGUE_KEYWORDS)
      : CATALOGUE_KEYWORDS;
    return {
      title: `${label} | ${SITE_NAME}`,
      description: category ? `Explorez les références ${label.toLowerCase()} du catalogue GunsMasterPro.` : "Explorez le catalogue GunsMasterPro par familles, disponibilités, calibres et caractéristiques publiées.",
      keywords: categoryKeywords,
      canonicalPath: path,
      ogType: "website",
      noindex: Boolean(search),
      jsonLd: [
        { "@context": "https://schema.org", "@type": "CollectionPage", name: `${label} · ${SITE_NAME}`, url: path, description: category ? `Références ${label.toLowerCase()} du catalogue GunsMasterPro.` : SITE_DESCRIPTION, inLanguage: ["fr", "en", "de"], audience: { "@type": "PeopleAudience", suggestedMinAge: 18 }, isPartOf: { "@type": "WebSite", name: SITE_NAME, url: "/" } },
        breadcrumbSchema(category ? [{ name: "Accueil", path: "/" }, { name: "Catalogue", path: "/catalogue" }, { name: label, path }] : [{ name: "Accueil", path: "/" }, { name: label, path }]),
        ...(catalogue.length && !search ? [productListSchema(catalogue, `${label} · ${SITE_NAME}`, path)] : []),
      ],
    };
  }

  const productMatch = path.match(/^\/produit\/([^/]+)$/);
  if (productMatch) {
    const product = await prefetch.catalogueBySlug({ slug: productMatch[1] });
    if (!product) return { title: `${SITE_NAME} | Référence introuvable`, description: SITE_DESCRIPTION, keywords: HOME_KEYWORDS, notFound: true };
    seed(queryClient, getQueryKey(trpc.catalogue.bySlug, { slug: productMatch[1] }, "query"), product);
    const reviews = await prefetch.reviewsList({ productId: product.id });
    seed(queryClient, getQueryKey(trpc.reviews.list, { productId: product.id }, "query"), reviews);
    const categoryLabel = categoryLabels[product.category] ?? product.category;
    return {
      title: `${product.name} | ${SITE_NAME}`,
      description: product.excerpt || SITE_DESCRIPTION,
      keywords: productKeywords(product),
      canonicalPath: path,
      ogType: "product",
      ogImage: product.imageUrl,
      ogImageAlt: `${product.name} — ${product.brand}`,
      jsonLd: [
        siteSchema,
        productSchema(product),
        breadcrumbSchema([{ name: "Accueil", path: "/" }, { name: "Catalogue", path: "/catalogue" }, { name: categoryLabel, path: `/categorie/${product.category}` }, { name: product.name, path }]),
      ],
    };
  }

  if (staticPages[path]) {
    const page = staticPages[path];
    const pageKeywords = clampKeywords(`${page.title.split("·")[0].trim()}, firearms compliance Europe USA, Waffen Konformität Europa, 18+ demande encadrée`, HOME_KEYWORDS);
    const isCompliance = ["/conformite", "/conditions", "/mentions-legales", "/confidentialite"].includes(path);
    return {
      ...page,
      keywords: pageKeywords,
      canonicalPath: path,
      ogType: "website",
      jsonLd: [
        siteSchema,
        { "@context": "https://schema.org", "@type": "WebPage", name: page.title, url: path, description: page.description, inLanguage: ["fr", "en", "de"], ...(isCompliance ? { audience: { "@type": "PeopleAudience", suggestedMinAge: 18 } } : {}), isPartOf: { "@type": "WebSite", name: SITE_NAME, url: "/" } },
        breadcrumbSchema([{ name: "Accueil", path: "/" }, { name: page.title.split("·")[0].trim(), path }]),
      ],
    };
  }
  if (["/panier", "/favoris", "/suivi", "/administration"].includes(path)) return { title: SITE_NAME, description: SITE_DESCRIPTION, keywords: HOME_KEYWORDS, noindex: true };
  return { title: `${SITE_NAME} | Référence introuvable`, description: SITE_DESCRIPTION, keywords: HOME_KEYWORDS, notFound: true };
}
