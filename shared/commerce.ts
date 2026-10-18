export const REFERENCE_MARGIN_CENTS = 10_000;
export const ORDER_STATUSES = ["preparing", "shipped", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const GUNMASTER_COUPON_CODE = "GUNMASTER26";

export type CouponEvaluation = {
  valid: boolean;
  code: string | null;
  priceAdjustmentCents: number;
  discountPercent: number;
  benefit: "ten-percent-after-markup" | null;
};

export function calculateRetailPrice(referencePriceCents: number) {
  return referencePriceCents + REFERENCE_MARGIN_CENTS;
}

/**
 * A valid code applies a ten-percent discount to the customer-facing price after
 * the catalogue majoration has been calculated.
 */
export function evaluateCoupon(input?: string | null, subtotalCents = 0): CouponEvaluation {
  const code = input?.trim().toUpperCase() || null;
  if (code === GUNMASTER_COUPON_CODE) {
    const amount = Math.round(Math.max(0, subtotalCents) * 0.1);
    return { valid: true, code, priceAdjustmentCents: -amount, discountPercent: 10, benefit: "ten-percent-after-markup" };
  }
  return { valid: false, code, priceAdjustmentCents: 0, discountPercent: 0, benefit: null };
}

export type CatalogueSeed = {
  slug: string;
  name: string;
  brand: string;
  category: "handguns" | "rifles" | "shotguns" | "accessories";
  excerpt: string;
  description: string;
  referencePriceCents: number;
  stock: number;
  caliber: string;
  material: string;
  capacity: string;
  action: string;
  barrelLength: string;
  overallLength: string;
  weight: string;
  imageUrl: string;
  gallery: string[];
  mediaSource: string;
  mediaRightsStatus: "pending" | "verified";
  subCategory?: string;
  manufacturer?: string;
  model?: string;
  specifications?: Record<string, string>;
  featured: boolean;
};

export type CatalogueProduct = CatalogueSeed & {
  priceCents: number;
};

export type CatalogueCategory = {
  slug: string;
  parentCategory: "handguns" | "rifles" | "shotguns" | "accessories";
  label: string;
  description: string;
  imageUrl: string;
  mediaSource: string;
  mediaRightsStatus: "pending" | "verified";
  position: number;
  /** Libellés trilingues pour le SEO et le rendu par langue. */
  labelI18n?: Record<"fr" | "en" | "de", string>;
  descriptionI18n?: Record<"fr" | "en" | "de", string>;
  /** Nombre de produits rattachés, utilisé pour ne pas publier de page vide. */
  productCount?: number;
};

export function createCatalogueProduct(input: CatalogueSeed): CatalogueProduct {
  return { ...input, priceCents: calculateRetailPrice(input.referencePriceCents) };
}

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus) {
  return ORDER_STATUSES.indexOf(next) >= ORDER_STATUSES.indexOf(current);
}

export type CatalogueFilters = {
  category?: string;
  brand?: string;
  caliber?: string;
  material?: string;
  inStock?: boolean;
  priceCents?: number;
  sort?: "relevance" | "price-low" | "price-high" | "stock";
};

type FilterableCatalogueItem = {
  category: string;
  brand: string;
  caliber: string;
  material: string;
  stock: number;
  priceCents: number;
  featured: boolean;
};

export function filterCatalogue<T extends FilterableCatalogueItem>(items: T[], filters: CatalogueFilters) {
  return items.filter((item) =>
    (!filters.category || item.category === filters.category)
    && (!filters.brand || item.brand === filters.brand)
    && (!filters.caliber || item.caliber === filters.caliber)
    && (!filters.material || item.material === filters.material)
    && (!filters.inStock || item.stock > 0)
    && (!filters.priceCents || item.priceCents <= filters.priceCents),
  ).sort((a, b) => {
    if (filters.sort === "price-low") return a.priceCents - b.priceCents;
    if (filters.sort === "price-high") return b.priceCents - a.priceCents;
    if (filters.sort === "stock") return b.stock - a.stock;
    return Number(b.featured) - Number(a.featured);
  });
}

export function comparisonValuesDiffer(values: unknown[]) {
  return new Set(values.map((value) => String(value ?? "—"))).size > 1;
}

export function normalizeRatingCenti(average: number) {
  return Math.round(Math.max(0, Math.min(5, average)) * 100);
}

export function isReviewImageDataUrl(value: string) {
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

export type OrderLine = {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};
