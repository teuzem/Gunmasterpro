// Mesure (AUCUNE ÉCRITURE) du rattachement des 239 produits vers les
// sous-catégories.
//
// Deux corrections par rapport à une classification libre :
//
//  1. Contrainte de famille — un produit ne peut être rattaché qu'à une
//     sous-catégorie de la famille qui lui est déjà attribuée
//     (`products.category`). Sans cela, une règle sur un nom de marque
//     contredit la famille curée (59 cas mesurés).
//  2. L'export PAK Arms ne contient que 14 catégories, basées marque/calibre,
//     et aucune donnée d'action. Les sous-catégories par action (verrou, levier,
//     pompe, superposé, mono-coup) ne sont donc pas déductibles des données.

import { readFile } from "node:fs/promises";

const snapshot = JSON.parse(await readFile("server/data/catalogue.snapshot.json", "utf8"));
const woo = JSON.parse(await readFile("public/pakarms_catalog_export/raw/woocommerce_store_products.json", "utf8"));
const wooById = new Map(woo.map((p) => [p.id, p]));

const FAMILY = {
  handguns: ["semi-auto-handguns", "revolvers", "single-shot-handguns", "other-handguns"],
  rifles: ["semi-auto-rifles", "bolt-action-rifles", "lever-action-rifles", "pump-action-rifles", "single-shot-rifles", "other-rifles"],
  shotguns: ["semi-auto-shotguns", "pump-action-shotguns", "side-by-side-shotguns", "over-under-shotguns", "single-shot-shotguns", "other-shotguns"],
  accessories: ["accessories", "magazines", "optics", "suppressors", "collectible-firearms", "black-powder-muzzleloaders", "other-accessories"],
};
const PARENT = Object.fromEntries(Object.entries(FAMILY).flatMap(([family, slugs]) => slugs.map((slug) => [slug, family])));

/** Règles par famille, testées dans l'ordre sur libellé + slug produit. */
const RULES = {
  handguns: [
    ["revolvers", /\brevolver|\b357\b|\b38\s*special|\bmagnum\b|\bs&w\b|\brauser\b/],
    ["single-shot-handguns", /single[\s-]?shot[\s-]?(pistol|handgun)?|mono[\s-]?coup/],
    ["other-handguns", /\bp226\b|\bppk\b|\b10\/22\b|\bpp\b|\bmodel\s*1911\b|\bp226\b|\bwalther\b|\bsig[\s-]?sauer\b|\bpk[\s-]?walther\b|\bhk[\s-]?p30\b/],
    ["semi-auto-handguns", /\bpistol|\bhandgun|\bglock|\bberetta|\bcolt|\btaurus|\bzigana|\bh&k|\bhs9|\bm9\b|\b92fs\b|\b1911\b|\bpx9\b|\bk100\b|\bkr9\b|\bgrand\s*power\b|\bmakarov\b|\bbrowning[\s-]?hi|\btokarev\b|\bsr9\b|\bp226\b/],
  ],
  rifles: [
    ["lever-action-rifles", /lever[\s-]?action|\blever[\s-]?action|\bunderlever\b|\brepeater[\s-]?ak\b|\bmartin\b|\bwinchester\b/],
    ["bolt-action-rifles", /\bbolt[\s-]?action|\bm98\b|\bm14\b|\b98k\b|\bprecision[\s-]?bench\b|\bsv98\b|\btactical[\s-]?rifle\b/],
    ["single-shot-rifles", /single[\s-]?shot[\s-]?rifle|mono[\s-]?coup[\s-]?rifle/],
    ["pump-action-rifles", /pump[\s-]?action[\s-]?rifle|\bpump[\s-]?rifle\b/],
    ["other-rifles", /\bm249\b|\bmag[\s-]?pul|\bminimi\b|\bmachine[\s-]?gun|\bbren\b|\bm60\b|\bmk12\b/],
    ["semi-auto-rifles", /\brifle|\bcarabine|\bkalashnikov|\bakk?47|\bar15|\bar\b|\bm4\b|\bvepr\b|\bsaiga\b|\bamd65\b|\bsv-?98|\bm16\b|\bm4a1\b|\bunderfold\b|\bpak[\s-]?made[\s-]?rifle|\bfn[\s-]?fal\b|\bfal\b|\bmk12\b/],
  ],
  shotguns: [
    ["side-by-side-shotguns", /side[\s-]?by[\s-]?side|\bdouble[\s-]?barrel\b|\b2[\s-]?barrel\b|\bsbs\b/],
    ["over-under-shotguns", /over[\s-]?under|\bbockflinte\b|\bo\/u\b/],
    ["pump-action-shotguns", /pump/],
    ["single-shot-shotguns", /single[\s-]?shot[\s-]?shotgun|solo[\s-]?coup/],
    ["semi-auto-shotguns", /semi[\s-]?auto[\s-]?shotgun|self[\s-]?loading[\s-]?shotgun|\bsaiga[\s-]?s?\b.*12|\b12k\b|\bbenelli\b|\bstoeger\b|\bkaiga\b/],
    ["other-shotguns", /shotgun|flinten|\bfusil\b|\bshot\b|\b12\s?bore\b|\b12[\s-]?gauge\b/],
  ],
  accessories: [
    ["magazines", /\bmagazine|\bmagzine\b|\bcharger\b|\bclip\b/],
    ["optics", /\boptic|red[\s-]?dot|\bscope\b|night[\s-]?vision|boresight|\blaser\b|\bcollimator\b/],
    ["suppressors", /suppressor|silencer|modérateur|moderator/],
    ["collectible-firearms", /collectible|collection|sammler|antique|\bmuseum\b/],
    ["black-powder-muzzleloaders", /black[\s-]?powder|muzzleloader|percussion/],
    ["accessories", /\bammo\b|\bammunition\b|\bbullet|\bcartridge|\brefill\b|\bkit\b|\bcleaning\b|\bparts\b|\bpin\b|\bbuttock\b|\bstock\b|\bgrip\b|\binterior\b|\bbipod\b|\bsling\b|\bcase\b/],
    ["other-accessories", /\baccessor|\bzubehör\b/],
  ],
};

const classify = (family, text) => {
  const haystack = text.toLowerCase();
  for (const [slug, pattern] of RULES[family]) {
    if (slug in PARENT && PARENT[slug] === family && pattern.test(haystack)) return slug;
  }
  return null;
};

const rows = snapshot.map((product) => {
  const id = Number(product.slug.match(/-(\d+)$/)?.[1]);
  const source = wooById.get(id);
  return {
    slug: product.slug,
    name: product.name,
    family: product.category,
    sourceCategory: source?.categories?.[0]?.slug ?? null,
    guessed: classify(product.category, `${product.slug} ${product.name}`),
  };
});

const counts = new Map();
const unclassified = [];
for (const row of rows) {
  if (row.guessed) counts.set(row.guessed, (counts.get(row.guessed) ?? 0) + 1);
  else unclassified.push(row);
}
const classified = rows.length - unclassified.length;

console.log(`Produits                : ${rows.length}`);
console.log(`Classés (dans leur famille) : ${classified} (${Math.round((classified / rows.length) * 100)} %)`);
console.log(`Non classés             : ${unclassified.length}\n`);

console.log("Sous-catégories alimentées :");
const populated = [];
const empty = [];
for (const [family, slugs] of Object.entries(FAMILY)) {
  console.log(`\n  ${family}`);
  for (const slug of slugs) {
    const n = counts.get(slug) ?? 0;
    if (n === 0) empty.push(slug);
    else populated.push([slug, n, family]);
    console.log(`    ${slug.padEnd(30)} ${String(n).padStart(4)}${n === 0 ? "   <-- VIDE" : ""}`);
  }
}

console.log(`\nAlimentées : ${populated.length}/23   Vides : ${empty.length}/23`);
console.log(`Produits dans une sous-catégorie vide : ${rows.filter((r) => !r.guessed).length}`);

console.log("\nNon classés (échantillon) :");
for (const r of unclassified.slice(0, 20)) console.log(`  [${r.family}] ${r.slug}   (source: ${r.sourceCategory})`);

const big = populated.filter(([, n]) => n < 3);
if (big.length) console.log(`\nSous-categories avec moins de 3 produits : ${big.map(([s, n]) => `${s}(${n})`).join(", ")}`);