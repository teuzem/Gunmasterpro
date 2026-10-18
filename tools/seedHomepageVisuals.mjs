import "dotenv/config";
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

const heroAssets = [
  ["semi-auto-handguns", "/manus-storage/hero/01_Semi_Auto_Handguns_Studio_Tactical_d3550a04.png"],
  ["revolvers", "/manus-storage/hero/02_Revolvers_Collector_Studio_7de5f843.png"],
  ["single-shot-handguns", "/manus-storage/hero/03_Single_Shot_Handguns_Craftsmanship_08665fb3.png"],
  ["other-handguns", "/manus-storage/hero/04_Other_Handguns_Editorial_Display_4a384869.png"],
  ["semi-auto-rifles", "/manus-storage/hero/05_Semi_Auto_Rifles_Controlled_Range_c5e14033.png"],
  ["bolt-action-rifles", "/manus-storage/hero/06_Bolt_Action_Rifles_Precision_Bench_fd219d0a.png"],
  ["lever-action-rifles", "/manus-storage/hero/07_Lever_Action_Rifles_Heritage_Lodge_d4b7cb64.png"],
  ["pump-action-rifles", "/manus-storage/hero/08_Pump_Action_Rifles_Outdoor_Shelter_001890b3.png"],
  ["single-shot-rifles", "/manus-storage/hero/09_Single_Shot_Rifles_Alpine_Studio_60b78323.png"],
  ["other-rifles", "/manus-storage/hero/10_Other_Rifles_Innovation_Lab_3ffee40e.png"],
  ["semi-auto-shotguns", "/manus-storage/hero/11_Semi_Auto_Shotguns_Sporting_Club_a907ec53.png"],
  ["pump-action-shotguns", "/manus-storage/hero/12_Pump_Action_Shotguns_Training_Bay_901c0e70.png"],
  ["side-by-side-shotguns", "/manus-storage/hero/13_Side_By_Side_Shotguns_Heritage_57ab8c75.png"],
  ["over-under-shotguns", "/manus-storage/hero/14_Over_Under_Shotguns_Clay_Club_72ea788a.png"],
  ["single-shot-shotguns", "/manus-storage/hero/15_Single_Shot_Shotguns_Artisan_Bench_f89e2c9b.png"],
  ["accessories", "/manus-storage/hero/16_Accessories_Professional_Kit_025fba0f.png"],
  ["magazines", "/manus-storage/hero/17_Magazines_Secure_Storage_ea02d501.png"],
  ["optics", "/manus-storage/hero/18_Optics_Field_Observation_e5dac6f4.png"],
  ["suppressors", "/manus-storage/hero/19_Suppressors_Technical_Display_79ad2d6b.png"],
  ["collectible-firearms", "/manus-storage/hero/20_Collectible_Firearms_Museum_de97d499.png"],
];

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

  for (const [index, [, imageUrl]] of heroAssets.entries()) {
    if (skipHero) break;
    const family = familyByImage[index + 1] ?? "accessories";
    if (!categoryBySlug.size) throw new Error("catalogueCategories est vide — lancez d'abord tools/seedCatalogueMedia.mjs.");
    const copy = heroCopy(familyLabels[family]);
    await connection.execute(
      "INSERT INTO homeHeroSlides (position, categorySlug, targetPath, storageKey, imageUrl, altText, eyebrow, title, description, ctaLabel, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true) ON DUPLICATE KEY UPDATE categorySlug = VALUES(categorySlug), targetPath = VALUES(targetPath), storageKey = VALUES(storageKey), imageUrl = VALUES(imageUrl), altText = VALUES(altText), eyebrow = VALUES(eyebrow), title = VALUES(title), description = VALUES(description), ctaLabel = VALUES(ctaLabel), isActive = true",
      [index + 1, null, `/categorie/${family}`, keyFromUrl(imageUrl), imageUrl, JSON.stringify(copy.altText), JSON.stringify(copy.eyebrow), JSON.stringify(copy.title), JSON.stringify(copy.description), JSON.stringify(copy.ctaLabel)],
    );
  }

  await connection.commit();
  console.log(JSON.stringify({
    heroSlides: skipHero ? 0 : heroAssets.length,
    skippedHero: skipHero,
  }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
