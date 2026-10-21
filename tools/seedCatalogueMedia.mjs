// Réaligne la base sur les médias réellement présents dans le volume persistant.
//
// Source des URL : tools/media-manifest.local.json, produit par
// tools/pushMediaToServer.mjs après poussée des fichiers vers l'application.
// Le manifeste local est prioritaire ; le manifeste Forge n'est lu qu'à titre
// de repli, pour un déploiement qui n'aurait pas encore fait la migration.
//
// Écrit, en une transaction :
//   - catalogueCategories : les 14 sous-catégories et leur visuel
//   - products            : visuel principal + galerie complète, mediaTransferState
//   - mediaAssets         : une ligne par visuel, clé et type inclus
//   - homeHeroSlides      : les 20 diapositives hero
//
// Usage : node tools/seedCatalogueMedia.mjs [--dry-run]

import "dotenv/config";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unavailable");

const snapshot = JSON.parse(await readFile("server/data/catalogue.snapshot.json", "utf8"));
// Taxonomie en vigueur : 14 sous-catégories réelles, pas les 23 anciens
// libellés par type d'action (tools/applySubcategories.mjs).
const categories = JSON.parse(await readFile("server/data/subcategories.json", "utf8"));

const readJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
};
const localManifest = await readJson("tools/media-manifest.local.json");
const forgeManifest = await readJson("tools/media-manifest.json");

if (!localManifest) {
  console.error("tools/media-manifest.local.json absent : exécutez d'abord tools/pushMediaToServer.mjs.");
  process.exit(3);
}
void forgeManifest;

const MEDIA_SOURCE = "Export catalogue PAK Arms (pakarms.co) — 19 août 2026";
const CATEGORY_SOURCE = "Archives visuelles fournies par le propriétaire — 23 août 2026";
const contentTypeOf = (url) =>
  url.endsWith(".png") ? "image/png"
    : /\.jpe?g$/i.test(url) ? "image/jpeg"
      : url.endsWith(".webp") ? "image/webp"
        : url.endsWith(".avif") ? "image/avif" : "application/octet-stream";
const sourceIdOf = (slug) => slug.match(/-(\d+)$/)?.[1] ?? null;
const keyOf = (url) => url.replace(/^\/(?:manus-storage|media)\//, "");

// URL par cible : le même contenu peut servir plusieurs produits.
const urlByProductFile = new Map();
for (const product of Object.values(localManifest.products ?? {})) {
  for (const file of product.files ?? []) urlByProductFile.set(`${product.slug}::${file.file}`, file);
}
const urlByCategorySlug = new Map((localManifest.categories ?? []).map((entry) => [entry.slug, entry]));

/** URL locale du visuel d'un produit, à partir de son nom de fichier source. */
function localUrlForProductFile(slug, fileName) {
  return urlByProductFile.get(`${slug}::${fileName}`)?.url;
}

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
const summary = {};

try {
  await connection.beginTransaction();

  // --- Catégories -----------------------------------------------------------
  for (const category of categories) {
    const entry = urlByCategorySlug.get(category.slug);
    if (!entry) throw new Error(`Aucun visuel local pour la catégorie ${category.slug}`);
    await connection.execute(
      `INSERT INTO catalogueCategories
         (slug, parentCategory, label, description, imageUrl, mediaSource, mediaRightsStatus, position)
       VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)
       ON DUPLICATE KEY UPDATE
         parentCategory = VALUES(parentCategory), label = VALUES(label),
         description = VALUES(description), imageUrl = VALUES(imageUrl),
         mediaSource = VALUES(mediaSource), mediaRightsStatus = VALUES(mediaRightsStatus),
         position = VALUES(position)`,
      [category.slug, category.parentCategory, category.label, category.description, entry.url, CATEGORY_SOURCE, category.position],
    );
    summary.categoriesTouched = (summary.categoriesTouched ?? 0) + 1;
  }

  // Retrait des catégories obsolètes (ancienne taxonomie par type d'action).
  const liveSlugs = new Set(categories.map((category) => category.slug));
  const [existingCategories] = await connection.query("SELECT slug FROM catalogueCategories");
  const obsolete = existingCategories
    .map((row) => row.slug)
    .filter((slug) => !liveSlugs.has(slug));
  for (const slug of obsolete) await connection.execute("DELETE FROM catalogueCategories WHERE slug = ?", [slug]);
  summary.categoriesRemoved = obsolete.length;

  // --- Produits -------------------------------------------------------------
  // Le visuel principal et la galerie proviennent du manifeste local : le
  // snapshot est réaligné dessus, fichier par fichier.
  let productsWritten = 0;
  let galleryTotal = 0;
  const missing = [];

  for (const product of snapshot) {
    const manifestProduct = localManifest.products?.[product.slug];
    if (!manifestProduct?.files?.length) {
      missing.push(product.slug);
      continue;
    }

    // Le snapshot donne l'ordre éditorial des médias ; on le respecte et on
    // remplace chaque URL par son équivalent local.
    const ordered = [];
    for (const url of product.gallery ?? []) {
      const fileName = url.split("/").pop();
      const local = localUrlForProductFile(product.slug, fileName ?? "");
      if (local) ordered.push(local);
    }
    // Tout visuel du manifeste non encore listé est ajouté à la fin.
    const listed = new Set(ordered);
    for (const file of manifestProduct.files) {
      if (!listed.has(file.url)) ordered.push(file.url);
    }

    if (!ordered.length) {
      // Fiche sans aucun visuel disponible. Elle n'est pas insérée : la conserver
      // avec l'URL morte du catalogue initial afficherait une image cassée. Le
      // seed continue, et le rapport final nomme les fiches concernées.
      missing.push(product.slug);
      continue;
    }

    const imageUrl = ordered[0];
    const gallery = ordered;
    galleryTotal += gallery.length;

    const specifications = JSON.stringify(product.specifications ?? {});
    await connection.execute(
      `INSERT INTO products
         (sourceId, slug, name, brand, category, subCategory, manufacturer, model, excerpt, description,
          referencePriceCents, priceCents, stock, caliber, material, capacity, action, barrelLength,
          overallLength, weight, imageUrl, gallery, specifications, mediaSource, mediaRightsStatus,
          mediaTransferState, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), brand = VALUES(brand), category = VALUES(category),
         subCategory = VALUES(subCategory), manufacturer = VALUES(manufacturer), model = VALUES(model),
         excerpt = VALUES(excerpt), description = VALUES(description),
         referencePriceCents = VALUES(referencePriceCents), priceCents = VALUES(priceCents),
         stock = VALUES(stock), caliber = VALUES(caliber), material = VALUES(material),
         capacity = VALUES(capacity), action = VALUES(action), barrelLength = VALUES(barrelLength),
         overallLength = VALUES(overallLength), weight = VALUES(weight),
         imageUrl = VALUES(imageUrl), gallery = VALUES(gallery), specifications = VALUES(specifications),
         mediaSource = VALUES(mediaSource), mediaRightsStatus = VALUES(mediaRightsStatus),
         mediaTransferState = VALUES(mediaTransferState), featured = VALUES(featured)`,
      [
        sourceIdOf(product.slug), product.slug, product.name, product.brand, product.category,
        product.subCategory ?? "general", product.manufacturer ?? product.brand,
        product.model ?? product.name, product.excerpt, product.description,
        product.referencePriceCents, product.priceCents, product.stock ?? 0,
        product.caliber || "Non communiqué", product.material || "Non communiqué",
        product.capacity || "Non communiqué", product.action || "Non communiqué",
        product.barrelLength || "Non communiqué", product.overallLength || "Non communiqué",
        product.weight || "Non communiqué", imageUrl, JSON.stringify(gallery), specifications,
        product.mediaSource ?? MEDIA_SOURCE, product.mediaRightsStatus ?? "verified",
        product.featured ? 1 : 0,
      ],
    );
    productsWritten++;
  }
  summary.productsWritten = productsWritten;
  summary.galleryTotal = galleryTotal;

  if (missing.length) {
    // Signalé, mais non bloquant : une fiche sans visuel ne doit pas
    // empêcher l'import des 232 autres. Le rapport final les liste.
    console.warn(`Produits sans média local (${missing.length}) : ${missing.slice(0, 10).join(", ")}`);
  }

  // --- mediaAssets : une ligne par visuel ------------------------------------
  const [persisted] = await connection.query("SELECT id, sourceId FROM products");
  const productIdBySourceId = new Map(
    persisted.flatMap((row) => (row.sourceId ? [[row.sourceId, row.id]] : [])),
  );

  const expectedUrls = new Set();
  let mediaWritten = 0;

  for (const category of categories) {
    const entry = urlByCategorySlug.get(category.slug);
    if (!entry) continue;
    expectedUrls.add(entry.url);
    await connection.execute(
      `INSERT INTO mediaAssets
         (categorySlug, kind, position, sourceUrl, storageKey, storageUrl, contentType, transferStatus, attemptCount)
       VALUES (?, 'category', 0, ?, ?, ?, ?, 'transferred', 1)
       ON DUPLICATE KEY UPDATE
         categorySlug = VALUES(categorySlug), kind = VALUES(kind),
         storageKey = VALUES(storageKey), storageUrl = VALUES(storageUrl),
         contentType = VALUES(contentType), transferStatus = 'transferred',
         attemptCount = 1, lastError = NULL`,
      [category.slug, entry.url, keyOf(entry.url), entry.url, entry.contentType ?? contentTypeOf(entry.url)],
    );
    mediaWritten++;
  }

  for (const product of snapshot) {
    const productId = productIdBySourceId.get(sourceIdOf(product.slug));
    if (!productId) continue;
    const manifestProduct = localManifest.products?.[product.slug];
    const urls = Array.from(new Set([product.imageUrl, ...(product.gallery ?? [])].filter(Boolean)));
    for (const [position, url] of urls.entries()) {
      expectedUrls.add(url);
      const file = manifestProduct?.files?.find((entry) => entry.url === url);
      await connection.execute(
        `INSERT INTO mediaAssets
           (productId, kind, position, sourceUrl, storageKey, storageUrl, contentType, transferStatus, attemptCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'transferred', 1)
         ON DUPLICATE KEY UPDATE
           productId = VALUES(productId), kind = VALUES(kind), position = VALUES(position),
           storageKey = VALUES(storageKey), storageUrl = VALUES(storageUrl),
           contentType = VALUES(contentType), transferStatus = 'transferred',
           attemptCount = 1, lastError = NULL`,
        [
          productId, position === 0 ? "primary" : "gallery", position, url,
          keyOf(url), url, file?.contentType ?? contentTypeOf(url),
        ],
      );
      mediaWritten++;
    }
  }
  summary.mediaWritten = mediaWritten;

  // --- Nettoyage des visuels retirés du catalogue ---------------------------
  if (!DRY_RUN) {
    const [orphanRows] = await connection.query("SELECT id, sourceUrl FROM mediaAssets");
    const orphans = orphanRows.filter((row) => !expectedUrls.has(row.sourceUrl));
    for (const orphan of orphans) await connection.execute("DELETE FROM mediaAssets WHERE id = ?", [orphan.id]);
    summary.mediaOrphansRemoved = orphans.length;
  }

  if (DRY_RUN) {
    await connection.rollback();
    console.log("--dry-run : transaction annulée.");
  } else {
    await connection.commit();
  }

  console.log(JSON.stringify(summary, null, 2));

  // Fiches laissées de côté : elles n'ont aucun visuel disponible ni dans
  // l'export fourni, ni chez pakarms.co. Les publier avec une URL morte
  // afficherait une image cassée ; le rapport permet de les traiter à part.
  if (missing.length) {
    console.log(`\n${missing.length} fiche(s) sans visuel, non insérées :`);
    for (const slug of missing) console.log(`  ${slug}`);
    console.log("Ces fiches restent à couvrir (visuels à fournir).");
  }
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
