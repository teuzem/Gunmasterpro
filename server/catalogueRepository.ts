import { asc, eq, like, or, sql } from "drizzle-orm";
import { catalogueCategories, mediaAssets, products } from "../drizzle/schema";
import { categorySeed, catalogueSeed } from "./catalog";
import { getDb } from "./db";

export const MEDIA_FALLBACK_URL = "/media-fallback.svg";
const sourceIdFromSlug = (slug: string) => slug.match(/-(\d+)$/)?.[1] ?? null;

export const withMediaFallback = <T extends { imageUrl: string; gallery?: string[]; mediaTransferState?: string }>(record: T) => {
  // Les visuels /media/ sont servis depuis le disque local auto-hébergé :
  // par construction déjà transférés, jamais remplacés par le repli.
  if (record.mediaTransferState === "complete" || record.imageUrl.startsWith("/media/")) return record;
  return { ...record, imageUrl: MEDIA_FALLBACK_URL, gallery: [MEDIA_FALLBACK_URL], mediaFallback: true };
};

const mediaRows = () => {
  const seen = new Set<string>();
  return catalogueSeed.flatMap((product) => {
    const sourceId = sourceIdFromSlug(product.slug);
    const all = [product.imageUrl, ...product.gallery];
    return all.flatMap((sourceUrl, index) => {
      if (!sourceUrl || seen.has(sourceUrl)) return [];
      seen.add(sourceUrl);
      return [{
        productSourceId: sourceId,
        kind: index === 0 ? "primary" as const : "gallery" as const,
        position: index,
        sourceUrl,
      }];
    });
  });
};

const productRows = () => catalogueSeed.map((product) => ({
  sourceId: sourceIdFromSlug(product.slug),
  slug: product.slug,
  name: product.name,
  brand: product.brand,
  category: product.category,
  subCategory: product.subCategory ?? "general",
  manufacturer: product.manufacturer ?? product.brand,
  model: product.model ?? product.name,
  excerpt: product.excerpt,
  description: product.description,
  referencePriceCents: product.referencePriceCents,
  priceCents: product.priceCents,
  stock: product.stock,
  caliber: product.caliber || "Non communiqué",
  material: product.material || "Non communiqué",
  capacity: product.capacity || "Non communiqué",
  action: product.action || "Non communiqué",
  barrelLength: product.barrelLength || "Non communiqué",
  overallLength: product.overallLength || "Non communiqué",
  weight: product.weight || "Non communiqué",
  imageUrl: product.imageUrl,
  gallery: product.gallery,
  specifications: product.specifications ?? {},
  mediaSource: product.mediaSource,
  mediaRightsStatus: product.mediaRightsStatus,
  mediaTransferState: "pending" as const,
  featured: product.featured,
}));

export async function ensureCatalogueImported() {
  const db = await getDb();
  if (!db) return false;
  // Une base injoignable ne doit pas faire tomber le rendu SSR : sans ce
  // garde-fou, la requête de comptage remonte jusqu'à prefetchForPath et
  // renvoie un HTTP 500 pour tout le site, y compris les pages publiques.
  let count: number;
  try {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(products);
    count = Number(row?.count ?? 0);
  } catch (error) {
    console.warn("[Catalogue] base indisponible, import ignoré :", (error as Error)?.message);
    return false;
  }
  if (count >= catalogueSeed.length) return true;

  await db.transaction(async (tx) => {
    await tx.insert(catalogueCategories).values(categorySeed.map((category) => ({
      ...category,
      mediaRightsStatus: category.mediaRightsStatus,
    }))).onDuplicateKeyUpdate({
      set: { label: sql`VALUES(label)`, description: sql`VALUES(description)`, imageUrl: sql`VALUES(imageUrl)`, mediaSource: sql`VALUES(mediaSource)`, mediaRightsStatus: sql`VALUES(mediaRightsStatus)`, position: sql`VALUES(position)` },
    });

    await tx.insert(products).values(productRows()).onDuplicateKeyUpdate({
      set: {
        name: sql`VALUES(name)`, brand: sql`VALUES(brand)`, category: sql`VALUES(category)`, subCategory: sql`VALUES(subCategory)`, manufacturer: sql`VALUES(manufacturer)`, model: sql`VALUES(model)`, excerpt: sql`VALUES(excerpt)`, description: sql`VALUES(description)`, referencePriceCents: sql`VALUES(referencePriceCents)`, priceCents: sql`VALUES(priceCents)`, stock: sql`VALUES(stock)`, caliber: sql`VALUES(caliber)`, material: sql`VALUES(material)`, capacity: sql`VALUES(capacity)`, action: sql`VALUES(action)`, barrelLength: sql`VALUES(barrelLength)`, overallLength: sql`VALUES(overallLength)`, weight: sql`VALUES(weight)`, imageUrl: sql`VALUES(imageUrl)`, gallery: sql`VALUES(gallery)`, specifications: sql`VALUES(specifications)`, mediaSource: sql`VALUES(mediaSource)`, mediaRightsStatus: sql`VALUES(mediaRightsStatus)`, featured: sql`VALUES(featured)`,
      },
    });

    const persisted = await tx.select({ id: products.id, sourceId: products.sourceId }).from(products);
    const productIdBySourceId = new Map(persisted.flatMap((product) => product.sourceId ? [[product.sourceId, product.id] as const] : []));
    const references = mediaRows().flatMap((media) => {
      const productId = media.productSourceId ? productIdBySourceId.get(media.productSourceId) : undefined;
      if (!productId) return [];
      return [{ productId, kind: media.kind, position: media.position, sourceUrl: media.sourceUrl, transferStatus: "pending" as const, attemptCount: 0 }];
    });
    if (references.length) {
      await tx.insert(mediaAssets).values(references).onDuplicateKeyUpdate({
        set: { productId: sql`VALUES(productId)`, kind: sql`VALUES(kind)`, position: sql`VALUES(position)` },
      });
    }
  });
  return true;
}

export async function listCatalogueProducts(search?: string) {
  const db = await getDb();
  if (!db) return undefined;
  if (!await ensureCatalogueImported()) return undefined;
  const term = search?.trim();
  const expression = `%${term}%`;
  try {
    if (!term) return (await db.select().from(products).orderBy(asc(products.name))).map(withMediaFallback);
    return (await db.select().from(products).where(or(like(products.name, expression), like(products.brand, expression), like(products.slug, expression))).orderBy(asc(products.name))).map(withMediaFallback);
  } catch (error) {
    console.warn("[Catalogue] lecture produits impossible :", (error as Error)?.message);
    return undefined;
  }
}

export async function getCatalogueProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  if (!await ensureCatalogueImported()) return undefined;
  try {
    const record = (await db.select().from(products).where(eq(products.slug, slug)).limit(1))[0];
    return record ? withMediaFallback(record) : undefined;
  } catch (error) {
    console.warn("[Catalogue] lecture produit impossible :", (error as Error)?.message);
    return undefined;
  }
}

export async function listCatalogueCategories() {
  const db = await getDb();
  if (!db) return undefined;
  if (!await ensureCatalogueImported()) return undefined;
  try {
    return (await db.select().from(catalogueCategories).orderBy(asc(catalogueCategories.position))).map((category) => category.mediaRightsStatus === "verified"
      ? { ...category, mediaFallback: false }
      : { ...category, imageUrl: MEDIA_FALLBACK_URL, mediaFallback: true });
  } catch (error) {
    console.warn("[Catalogue] lecture catégories impossible :", (error as Error)?.message);
    return undefined;
  }
}

export async function catalogueSummary() {
  const db = await getDb();
  if (!db) return { products: 0, categories: 0, media: { pending: 0, transferred: 0, failed: 0 } };
  await ensureCatalogueImported();
  const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const [categoryCount] = await db.select({ count: sql<number>`count(*)` }).from(catalogueCategories);
  const media = await db.select({ status: mediaAssets.transferStatus, count: sql<number>`count(*)` }).from(mediaAssets).groupBy(mediaAssets.transferStatus);
  const states = { pending: 0, transferred: 0, failed: 0 };
  for (const row of media) states[row.status] = Number(row.count);
  return { products: Number(productCount.count), categories: Number(categoryCount.count), media: states };
}
