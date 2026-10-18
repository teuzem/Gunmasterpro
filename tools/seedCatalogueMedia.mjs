// Seed média complet et transactionnel : réaligne le catalogue en base sur le
// snapshot (visuels réellement téléversés) et sur les manifestes.
//
// Couvre ce que `pnpm db:seed` ne fait pas :
//   - rafraîchit les lignes existantes (ensureCatalogueImported court-circuite
//     quand le compte de produits est déjà complet) ;
//   - écrit les mediaAssets avec storageKey / storageUrl / contentType en
//     'transferred', l'import applicatif ne renseignant que sourceUrl 'pending' ;
//   - supprime les mediaAssets orphelins dont l'URL n'existe plus dans le bucket.
//
// Toutes les URL ont été contrôlées beforehand par tools/verifyMediaUrls.mjs.
// Usage : node tools/seedCatalogueMedia.mjs [--dry-run]

import "dotenv/config";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unavailable");

const snapshot = JSON.parse(await readFile("server/data/catalogue.snapshot.json", "utf8"));
const manifest = JSON.parse(await readFile("tools/media-manifest.json", "utf8"));
// Taxonomie en vigueur : 14 sous-catégories réelles, pas les 23 anciens
// libellés par type d'action (tools/applySubcategories.mjs).
const categories = JSON.parse(await readFile("server/data/subcategories.json", "utf8"));

const MEDIA_SOURCE = "Export catalogue PAK Arms (pakarms.co) — 19 août 2026";
const CATEGORY_SOURCE = "Archives visuelles fournies par le propriétaire — 23 août 2026";
const contentTypeOf = (url) =>
  url.endsWith(".png") ? "image/png"
    : /\.jpe?g$/i.test(url) ? "image/jpeg"
      : url.endsWith(".webp") ? "image/webp"
        : url.endsWith(".avif") ? "image/avif" : "application/octet-stream";
const sourceIdOf = (slug) => slug.match(/-(\d+)$/)?.[1] ?? null;
const keyOf = (url) => url.replace(/^\/manus-storage\//, "");

// Le manifest média donne, pour chaque URL, la clé et le type réellement
// téléversés ; à défaut, on retombe sur l'URL elle-même.
const assetByUrl = new Map();
for (const product of Object.values(manifest.products ?? {})) {
  for (const file of product.files ?? []) assetByUrl.set(file.url, { key: file.key, contentType: file.contentType });
}

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
const summary = {};

try {
  await connection.beginTransaction();

  // --- Catégories -----------------------------------------------------------
  // Les 14 sous-catégories sont insérées (et non mis à jour) : la taxonomie a
  // changé, les anciennes lignes par type d'action doivent disparaître, sinon
  // le storefront afficherait des catégories sans produit.
  for (const category of categories) {
    await connection.execute(
      `INSERT INTO catalogueCategories
         (slug, parentCategory, label, description, imageUrl, mediaSource, mediaRightsStatus, position)
       VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)
       ON DUPLICATE KEY UPDATE
         parentCategory = VALUES(parentCategory), label = VALUES(label),
         description = VALUES(description), imageUrl = VALUES(imageUrl),
         mediaSource = VALUES(mediaSource), mediaRightsStatus = VALUES(mediaRightsStatus),
         position = VALUES(position)`,
      [
        category.slug, category.parentCategory, category.label, category.description,
        category.imageUrl, CATEGORY_SOURCE, category.position,
      ],
    );
    summary.categoriesTouched = (summary.categoriesTouched ?? 0) + 1;
  }

  // Retrait des catégories obsolètes (ancienne taxonomie par type d'action).
  const obsolete = ["semi-auto-handguns", "revolvers", "single-shot-handguns", "other-handguns", "semi-auto-rifles", "bolt-action-rifles", "lever-action-rifles", "pump-action-rifles", "single-shot-rifles", "other-rifles", "semi-auto-shotguns", "pump-action-shotguns", "side-by-side-shotguns", "over-under-shotguns", "single-shot-shotguns", "other-shotguns", "accessories", "magazines", "optics", "suppressors", "collectible-firearms", "black-powder-muzzleloaders", "other-accessories"];
  const liveSlugs = new Set(categories.map((c) => c.slug));
  const toRemove = obsolete.filter((slug) => !liveSlugs.has(slug));
  for (const slug of toRemove) await connection.execute("DELETE FROM catalogueCategories WHERE slug = ?", [slug]);
  summary.categoriesRemoved = toRemove.length;

  // --- Produits -------------------------------------------------------------
  let productsTouched = 0;
  for (const product of snapshot) {
    const gallery = JSON.stringify(Array.isArray(product.gallery) ? product.gallery : []);
    const specifications = JSON.stringify(product.specifications ?? {});
    const [result] = await connection.execute(
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
        product.weight || "Non communiqué", product.imageUrl, gallery, specifications,
        product.mediaSource ?? MEDIA_SOURCE, product.mediaRightsStatus ?? "verified",
        product.featured ? 1 : 0,
      ],
    );
    productsTouched += result.affectedRows ? 1 : 0;
  }
  summary.productsWritten = productsTouched;

  // --- mediaAssets : une ligne par visuel, clé et type inclus ---------------
  const [persisted] = await connection.query("SELECT id, sourceId FROM products");
  const productIdBySourceId = new Map(
    persisted.flatMap((row) => (row.sourceId ? [[row.sourceId, row.id]] : [])),
  );

  const expectedUrls = new Set();
  let mediaWritten = 0;
  for (const category of categories) {
    if (!category.imageUrl) continue;
    expectedUrls.add(category.imageUrl);
    await connection.execute(
      `INSERT INTO mediaAssets
         (categorySlug, kind, position, sourceUrl, storageKey, storageUrl, contentType, transferStatus, attemptCount)
       VALUES (?, 'category', 0, ?, ?, ?, ?, 'transferred', 1)
       ON DUPLICATE KEY UPDATE
         categorySlug = VALUES(categorySlug), kind = VALUES(kind),
         storageKey = VALUES(storageKey), storageUrl = VALUES(storageUrl),
         contentType = VALUES(contentType), transferStatus = 'transferred',
         attemptCount = 1, lastError = NULL`,
      [category.slug, category.imageUrl, keyOf(category.imageUrl), category.imageUrl, contentTypeOf(category.imageUrl)],
    );
    mediaWritten++;
  }

  for (const product of snapshot) {
    const productId = productIdBySourceId.get(sourceIdOf(product.slug));
    if (!productId) continue;
    const urls = Array.from(new Set([product.imageUrl, ...(product.gallery ?? [])]));
    for (const [position, url] of urls.entries()) {
      expectedUrls.add(url);
      const asset = assetByUrl.get(url);
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
          keyOf(url), url, asset?.contentType ?? contentTypeOf(url),
        ],
      );
      mediaWritten++;
    }
  }
  summary.mediaWritten = mediaWritten;

  // --- Nettoyage des visuels retirés du catalogue --------------------------
  if (!DRY_RUN) {
    const [orphanRows] = await connection.query("SELECT id, sourceUrl FROM mediaAssets");
    const orphans = orphanRows.filter((row) => !expectedUrls.has(row.sourceUrl));
    for (const orphan of orphans) {
      await connection.execute("DELETE FROM mediaAssets WHERE id = ?", [orphan.id]);
    }
    summary.mediaOrphansRemoved = orphans.length;
  }

  if (DRY_RUN) {
    await connection.rollback();
    console.log("--dry-run : transaction annulée.");
  } else {
    await connection.commit();
  }

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}