// Contrôle : comment les 14 catégories réelles de l'export se répartissent-elles
// sur les 4 familles curées (`products.category`) ? AUCUNE ÉCRITURE.

import { readFile } from "node:fs/promises";

const snapshot = JSON.parse(await readFile("server/data/catalogue.snapshot.json", "utf8"));
const woo = JSON.parse(await readFile("public/pakarms_catalog_export/raw/woocommerce_store_products.json", "utf8"));
const wooById = new Map(woo.map((p) => [p.id, p]));

const rows = snapshot.map((product) => {
  const id = Number(product.slug.match(/-(\d+)$/)?.[1]);
  const source = wooById.get(id);
  return {
    slug: product.slug,
    family: product.category,
    source: source?.categories?.[0]?.slug ?? null,
    sourceName: source?.categories?.[0]?.name ?? null,
    all: (source?.categories ?? []).map((c) => c.slug),
  };
});

const withSource = rows.filter((r) => r.source);
const withoutSource = rows.filter((r) => !r.source);

console.log(`Produits avec catégorie source : ${withSource.length}`);
console.log(`Produits sans catégorie source: ${withoutSource.length}`);
console.log(`  -> ${withoutSource.map((r) => r.slug).join(", ")}\n`);

console.log("Répartition famille x catégorie source :");
const table = new Map();
for (const row of withSource) {
  const key = row.source;
  if (!table.has(key)) table.set(key, { name: row.sourceName, counts: new Map(), total: 0 });
  const entry = table.get(key);
  entry.counts.set(row.family, (entry.counts.get(row.family) ?? 0) + 1);
  entry.total++;
}

const FAMILIES = ["handguns", "rifles", "shotguns", "accessories"];
console.log("catégorie".padEnd(24), "total".padStart(6), "  handguns rifles shotguns accessories   dominant");
for (const [slug, entry] of [...table.entries()].sort((a, b) => b[1].total - a[1].total)) {
  const dominant = [...entry.counts.entries()].sort((a, b) => b[1] - a[1])[0];
  console.log(
    slug.padEnd(24),
    String(entry.total).padStart(6),
    "  ",
    FAMILIES.map((f) => String(entry.counts.get(f) ?? 0).padStart(7)).join("  "),
    `   ${dominant[0]} (${dominant[1]}/${entry.total})`,
  );
}

console.log("\nCatégories traversant plusieurs familles :");
for (const [slug, entry] of table) {
  if (entry.counts.size > 1) console.log(`  ${slug} : ${[...entry.counts.entries()].map(([f, n]) => `${f}=${n}`).join(", ")}`);
}

const multiCat = withSource.filter((r) => r.all.length > 1);
console.log(`\nProduits ayant >1 catégorie source (secondaire conservable) : ${multiCat.length}`);