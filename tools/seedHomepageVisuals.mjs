import "dotenv/config";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unavailable");

// Seed des diapositives hero uniquement. Les catégories sont écrites par
// tools/seedCatalogueMedia.mjs depuis server/data/subcategories.json
// (taxonomie réelle de pakarms.co).
//
// --skip-hero permet de ne rien écrire côté hero (par exemple pour rejouer le
// seed catalogue seul). Les visuels hero sont désormais présents dans le
// bucket : aucune slide n'est insérée avec une URL morte.
const skipHero = process.argv.includes("--skip-hero");



const keyFromUrl = (url) => url.replace("/manus-storage/", "");
const contentType = (url) => url.endsWith(".png") ? "image/png" : url.endsWith(".jpg") ? "image/jpeg" : "image/webp";
const heroCopy = (label) => ({
  altText: { fr: `Présentation de la catégorie ${label}`, en: `Presentation of the ${label} category`, de: `Präsentation der Kategorie ${label}` },
  eyebrow: { fr: "Sélection GunsMasterPro", en: "GunsMasterPro selection", de: "GunsMasterPro Auswahl" },
  title: { fr: label, en: label, de: label },
  description: {
    fr: "Explorez les repères de catalogue, les médias documentés et les informations essentielles de cette catégorie.",
    en: "Explore the catalogue guidance, documented media and essential information for this category.",
    de: "Entdecken Sie Kataloghinweise, dokumentierte Medien und wesentliche Angaben zu dieser Kategorie.",
  },
  ctaLabel: { fr: "Découvrir la catégorie", en: "Discover the category", de: "Kategorie entdecken" },
});

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
try {
  await connection.beginTransaction();
  const [categories] = await connection.query("SELECT slug, label, parentCategory, position FROM catalogueCategories ORDER BY position");
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

  // Les catégories ne sont plus semées ici : la taxonomie en vigueur est celle
  // de `server/data/subcategories.json` (14 catégories réelles), et c'est
  // `tools/seedCatalogueMedia.mjs` qui les écrit avec leurs visuels.

  // Les diapositives hero sont rattachées aux 4 familles curationnées, qui
  // restent des pages valides : les anciens slugs par type d'action ont disparu
  // et ne doivent plus être référencés.
  const familyByImage = {
    1: "handguns", 2: "handguns", 3: "handguns", 4: "handguns",
    5: "rifles", 6: "rifles", 7: "rifles", 8: "rifles", 9: "rifles", 10: "rifles",
    11: "shotguns", 12: "shotguns", 13: "shotguns", 14: "shotguns", 15: "shotguns",
    16: "accessories", 17: "accessories", 18: "accessories", 19: "accessories", 20: "accessories",
  };
  const familyLabels = { handguns: "Armes de poing", rifles: "Carabines", shotguns: "Fusils", accessories: "Accessoires" };

  // Les URL proviennent du manifeste local (poussée vers le volume
  // persistant) : /media/hero/… et non plus /manus-storage/hero/….
  const localHero = JSON.parse(await readFile("tools/media-manifest.local.json", "utf8"));
  const localHeroUrls = (localHero.hero ?? []).map((entry) => entry.url);
  if (!localHeroUrls.length) {
    throw new Error("tools/media-manifest.local.json est vide — lancez tools/pushMediaToServer.mjs.");
  }

  for (const [index, imageUrl] of localHeroUrls.entries()) {
    if (skipHero) break;
    const family = familyByImage[index + 1] ?? "accessories";
    const copy = heroCopy(familyLabels[family]);
    await connection.execute(
      "INSERT INTO homeHeroSlides (position, categorySlug, targetPath, storageKey, imageUrl, altText, eyebrow, title, description, ctaLabel, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true) ON DUPLICATE KEY UPDATE categorySlug = VALUES(categorySlug), targetPath = VALUES(targetPath), storageKey = VALUES(storageKey), imageUrl = VALUES(imageUrl), altText = VALUES(altText), eyebrow = VALUES(eyebrow), title = VALUES(title), description = VALUES(description), ctaLabel = VALUES(ctaLabel), isActive = true",
      [index + 1, null, `/categorie/${family}`, keyFromUrl(imageUrl), imageUrl, JSON.stringify(copy.altText), JSON.stringify(copy.eyebrow), JSON.stringify(copy.title), JSON.stringify(copy.description), JSON.stringify(copy.ctaLabel)],
    );
  }

  await connection.commit();
  console.log(JSON.stringify({
    heroSlides: skipHero ? 0 : localHeroUrls.length,
    skippedHero: skipHero,
  }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
