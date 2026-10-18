// Rattachement des produits aux sous-catégories RÉELLES de l'export PAK Arms,
// et génération de la taxonomie correspondante.
//
// Principe : la catégorie de rattachement est la catégorie **source** du produit
// (taxonomie pakarms.co), pas une déduction par mots-clés. Les 16 produits sans
// catégorie source sont des chargeurs et pièces : ils sont affectés par une règle
// explicite, jamais par supposition. Les 9 produits historiques hors export
// restent sans sous-catégorie.
//
// Écrit : server/data/catalogue.snapshot.json (subCategory)
// Écrit : server/data/subcategories.json (14 catégories, libellés trilingues,
//         image de tête prise parmi les visuels de produits déjà téléversés)

import { readFile, writeFile } from "node:fs/promises";

const SNAPSHOT_PATH = "server/data/catalogue.snapshot.json";
const SUBCATEGORIES_PATH = "server/data/subcategories.json";
const WOO_PATH = "public/pakarms_catalog_export/raw/woocommerce_store_products.json";

const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
const woo = JSON.parse(await readFile(WOO_PATH, "utf8"));
const wooById = new Map(woo.map((p) => [p.id, p]));

/**
 * Taxonomie des 14 catégories de pakarms.co, avec la famille dominante
 * mesurée (tools/analyseFamilles.mjs) et des libellés FR/EN/DE.
 */
const TAXONOMY = {
  "original-imported": { family: "handguns", label: { fr: "Importations originales", en: "Original imports", de: "Originalimporte" } },
  "30-bore-7-shot-762mm": { family: "handguns", label: { fr: "Pistolets 30 Bore 7 coups", en: "30 Bore 7-shot pistols", de: "30-Bore-7-Schuss-Pistolen" } },
  "glock": { family: "handguns", label: { fr: "Glock", en: "Glock", de: "Glock" } },
  "beretta": { family: "handguns", label: { fr: "Beretta", en: "Beretta", de: "Beretta" } },
  "colt-1911": { family: "handguns", label: { fr: "Colt 1911", en: "Colt 1911", de: "Colt 1911" } },
  "zigana": { family: "handguns", label: { fr: "Zigana", en: "Zigana", de: "Zigana" } },
  "taurus": { family: "handguns", label: { fr: "Taurus", en: "Taurus", de: "Taurus" } },
  "small-weapons": { family: "handguns", label: { fr: "Autres armes de poing", en: "Other handguns", de: "Weitere Kurzwaffen" } },
  "assault-rifles": { family: "rifles", label: { fr: "Fusils d'assaut", en: "Assault rifles", de: "Sturmgewehre" } },
  "223-bore": { family: "rifles", label: { fr: "Carabines 223 Bore", en: "223 Bore rifles", de: "223-Bore-Büchsen" } },
  "heavy-machine-guns": { family: "rifles", label: { fr: "Mitrailleuses", en: "Heavy machine guns", de: "Schwere Maschinengewehre" } },
  "12-bore": { family: "shotguns", label: { fr: "Fusils 12 Bore", en: "12 Bore shotguns", de: "12-Bore-Flinten" } },
  "ammunition": { family: "accessories", label: { fr: "Munitions", en: "Ammunition", de: "Munition" } },
  "pistol-accessories": { family: "accessories", label: { fr: "Accessoires pour pistolet", en: "Pistol accessories", de: "Pistolenzubehör" } },
};

/** Règles explicites pour les produits PAK Arms sans catégorie source. */
const FALLBACK_RULES = [
  [/magazine|chargeur/, "pistol-accessories"],
  [/fire[\s-]?pin|buttock|interior[\s-]?parts|grip/, "pistol-accessories"],
  [/\bm4[\s-]?carbine\b/, "assault-rifles"],
];

const sourceIdOf = (slug) => slug.match(/-(\d+)$/)?.[1] ?? null;

const counts = new Map();
const bySlug = new Map();
const unattached = [];
const byRule = [];

for (const product of snapshot) {
  const sourceId = sourceIdOf(product.slug);
  const source = sourceId ? wooById.get(Number(sourceId)) : undefined;
  let slug = source?.categories?.[0]?.slug ?? null;

  if (!slug && source) {
    // Produit PAK Arms sans catégorie dans l'export : règles explicites.
    const text = product.slug.toLowerCase();
    slug = FALLBACK_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
    if (slug) byRule.push(product.slug);
  }

  if (!slug || !(slug in TAXONOMY)) {
    // Produit sans catégorie de référence : toute valeur de subCategory
    // existante vient de l'ancienne taxonomie libre (« pistolets-semi-auto »…)
    // et doit disparaître. Laisser une valeur non déclarée produirait des
    // rattachements incohérents et des liens morts côté navigation.
    delete product.subCategory;
    unattached.push(product.slug);
    continue;
  }

  product.subCategory = slug;
  counts.set(slug, (counts.get(slug) ?? 0) + 1);
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(product);
}

// Image de tête par catégorie : premier visuel produit réellement téléversé.
const categories = Object.entries(TAXONOMY).map(([slug, meta], index) => {
  const members = bySlug.get(slug) ?? [];
  const withImage = members.find((p) => p.imageUrl?.startsWith("/manus-storage/"));
  return {
    slug,
    parentCategory: meta.family,
    label: meta.label.fr,
    labelI18n: meta.label,
    description: `${meta.label.fr} : références vérifiées du catalogue GunsMasterPro, médias documentés et demande encadrée.`,
    descriptionI18n: {
      fr: `${meta.label.fr} : références vérifiées du catalogue GunsMasterPro, médias documentés et demande encadrée.`,
      en: `${meta.label.en}: verified GunsMasterPro references, documented media and a guided enquiry process.`,
      de: `${meta.label.de}: geprüfte GunsMasterPro-Referenzen, dokumentierte Medien und begleitete Anfrage.`,
    },
    imageUrl: withImage?.imageUrl ?? "",
    mediaSource: "Export catalogue PAK Arms (pakarms.co) — 19 août 2026",
    mediaRightsStatus: "verified",
    position: index + 1,
    productCount: members.length,
  };
});

const empty = categories.filter((c) => !c.productCount);
if (empty.length) {
  // Une catégorie sans produit produirait une page vide : contenu mince,
  // pénalisé. Mieux vaut refuser de publier que publier du vide.
  throw new Error(`Catégories sans produit, à ne pas publier : ${empty.map((c) => c.slug).join(", ")}`);
}

await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
await writeFile(SUBCATEGORIES_PATH, `${JSON.stringify(categories, null, 2)}\n`, "utf8");

console.log(`Produits rattachés        : ${snapshot.filter((p) => p.subCategory && p.subCategory in TAXONOMY).length}/${snapshot.length}`);
console.log(`  par catégorie source   : ${snapshot.length - byRule.length - unattached.length - 9}`);
console.log(`  par règle explicite    : ${byRule.length}`);
console.log(`  sans sous-catégorie    : ${unattached.length} (${unattached.join(", ")})`);
console.log(`\nCatégories générées       : ${categories.length}`);
for (const c of categories) {
  console.log(`  ${c.slug.padEnd(24)} ${String(c.productCount).padStart(3)} produit(s)  ${c.imageUrl || "(sans image)"}`);
}