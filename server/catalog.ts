import { CatalogueCategory, CatalogueProduct, CatalogueSeed, createCatalogueProduct } from "../shared/commerce";

import catalogueSnapshot from "./data/catalogue.snapshot.json";
import subCategorySeed from "./data/subcategories.json";

/** Snapshot public résilient : utilisé localement et comme repli lorsque la base Manus est indisponible. */
export const catalogueSeed: CatalogueProduct[] = catalogueSnapshot as unknown as CatalogueProduct[];

/**
 * Sous-categories : taxonomie réelle de l'export PAK Arms (pakarms.co), et non
 * une liste de types d'arme imaginée. Les 14 catégories sont toutes alimentées ;
 * une catégorie sans produit produirait une page vide, donc du contenu mince,
 * que les moteurs pénalisent — `tools/applySubcategories.mjs` refuse d'en écrire
 * une dans ce cas.
 */
export const categorySeed: CatalogueCategory[] = (subCategorySeed as unknown as CatalogueCategory[]).map((category) => ({
  ...category,
  mediaSource: category.mediaSource ?? "Export catalogue PAK Arms (pakarms.co) — 19 août 2026",
  mediaRightsStatus: category.mediaRightsStatus ?? "verified",
}));

/** Slugs de sous-catégories indexables (toutes ont au moins un produit). */
export const subCategorySlugs = new Set(categorySeed.map((category) => category.slug));

/** Index rapide pour les métadonnées de catégorie côté serveur et SSR. */
export const subCategoryBySlug = new Map(categorySeed.map((category) => [category.slug, category]));