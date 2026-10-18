export type SearchableProduct = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  caliber: string;
  imageUrl?: string;
  priceCents?: number;
  stock?: number;
  ratingCenti?: number | null;
};

export type SearchableCategory = { slug: string; label: string; description: string; parentCategory: string };
export type GlobalSearchSuggestion = {
  kind: "product" | "category";
  title: string;
  detail: string;
  href: string;
  imageUrl?: string;
  priceCents?: number;
  stock?: number;
  ratingCenti?: number | null;
};

export function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function productRank(product: SearchableProduct, term: string) {
  const fields = [product.name, product.brand, product.caliber, product.category].map(normalizeSearchText);
  if (fields.some((field) => field === term)) return 0;
  if (fields.some((field) => field.startsWith(term))) return 1;
  if (normalizeSearchText(product.name).includes(term)) return 2;
  return 3;
}

export function getGlobalSearchSuggestions(query: string, products: SearchableProduct[], categories: SearchableCategory[]): GlobalSearchSuggestion[] {
  const term = normalizeSearchText(query);
  if (term.length < 2) return [];
  const contains = (value: string) => normalizeSearchText(value).includes(term);
  const productMatches = products
    .filter((product) => [product.name, product.brand, product.category, product.caliber].some(contains))
    .sort((left, right) => productRank(left, term) - productRank(right, term) || left.name.localeCompare(right.name))
    .slice(0, 6)
    .map((product) => ({ kind: "product" as const, title: product.name, detail: `${product.brand} · ${product.caliber}`, href: `/produit/${product.slug}`, imageUrl: product.imageUrl, priceCents: product.priceCents, stock: product.stock, ratingCenti: product.ratingCenti }));
  const categoryMatches = categories
    .filter((category) => [category.label, category.description, category.parentCategory, category.slug].some(contains))
    .slice(0, 3)
    .map((category) => ({ kind: "category" as const, title: category.label, detail: category.parentCategory, href: `/catalogue?category=${encodeURIComponent(category.parentCategory)}` }));
  return [...productMatches, ...categoryMatches].slice(0, 8);
}
