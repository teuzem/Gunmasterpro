export type CatalogueNavigationState = {
  category: string;
  brands: readonly string[];
  calibers: readonly string[];
  materials: readonly string[];
  actions: readonly string[];
  inStock: boolean;
  stockStatus: "all" | "available" | "limited" | "out";
  minRating: number;
  price: number;
  featured: boolean;
  sort: "relevance" | "price-low" | "price-high" | "stock" | "rating";
};

export function getCategoryPath(category: string) {
  return category === "all" ? "/catalogue" : `/categorie/${encodeURIComponent(category)}`;
}

export function buildCatalogueUrl({ filters, search, maxPrice, view, gridColumns }: { filters: CatalogueNavigationState; search: string; maxPrice: number; view: "grid" | "list"; gridColumns: 3 | 4 }) {
  const next = new URLSearchParams();
  if (search) next.set("q", search);
  if (filters.brands.length) next.set("brands", filters.brands.join(","));
  if (filters.calibers.length) next.set("calibers", filters.calibers.join(","));
  if (filters.materials.length) next.set("materials", filters.materials.join(","));
  if (filters.actions.length) next.set("actions", filters.actions.join(","));
  if (filters.inStock) next.set("stock", "1");
  if (filters.stockStatus && filters.stockStatus !== "all") next.set("availability", filters.stockStatus);
  if (filters.featured) next.set("featured", "1");
  if (filters.minRating) next.set("rating", String(filters.minRating));
  if (filters.price < maxPrice) next.set("price", String(filters.price));
  if (filters.sort !== "relevance") next.set("sort", filters.sort);
  if (view !== "grid") next.set("view", view);
  if (gridColumns !== 3) next.set("columns", String(gridColumns));
  const base = getCategoryPath(filters.category);
  return next.size ? `${base}?${next}` : base;
}
