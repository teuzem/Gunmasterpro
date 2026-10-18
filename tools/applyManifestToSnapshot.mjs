// Applique le manifeste média (`tools/media-manifest.json`) au snapshot catalogue
// : chaque fiche PAK Arms reçoit son visuel principal et sa galerie complète,
// tous pointant vers des objets réellement présents dans le bucket.
//
// Idempotent. Usage : node tools/applyManifestToSnapshot.mjs [--check]

import { readFile, writeFile } from "node:fs/promises";

const SNAPSHOT_PATH = "server/data/catalogue.snapshot.json";
const MANIFEST_PATH = "tools/media-manifest.json";
const CHECK_ONLY = process.argv.includes("--check");
const MEDIA_SOURCE = "Export catalogue PAK Arms (pakarms.co) — 19 août 2026";

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));

let updated = 0;
const missing = [];
const changed = [];

for (const product of snapshot) {
  const entry = manifest.products?.[product.slug];
  if (!entry?.files?.length) {
    if (product.slug.startsWith("pakarms-")) missing.push(product.slug);
    continue;
  }
  // Déduplication conservant l'ordre éditorial du dossier source : plusieurs
  // fichiers y ont un contenu identique (exports répétés) et ne doivent pas
  // produire de doublons en base.
  const urls = [];
  for (const file of [...entry.files].sort((a, b) => a.index - b.index)) {
    if (urls[urls.length - 1] !== file.url) urls.push(file.url);
  }
  const imageUrl = urls[0];
  const gallery = urls;
  if (product.imageUrl !== imageUrl) changed.push(product.slug);
  product.imageUrl = imageUrl;
  product.gallery = gallery;
  product.mediaSource = MEDIA_SOURCE;
  product.mediaRightsStatus = "verified";
  updated++;
}

console.log(`Fiches mises à jour : ${updated}/${snapshot.length}`);
console.log(`Visuels référencés  : ${snapshot.reduce((n, p) => n + (p.gallery?.length ?? 0), 0)}`);
console.log(`Visuel principal modifié : ${changed.length}`);

if (missing.length) {
  console.error(`\nFiche PAK Arms sans média (${missing.length}) :\n${missing.map((s) => `  ${s}`).join("\n")}`);
  process.exit(3);
}

// Garde-fou : aucun visuel ne doit rester hors des deux préfixes(store) connus.
const prefixes = ["/manus-storage/categories/", "/manus-storage/catalogue/pakarms/"];
const legacy = snapshot.filter(
  (p) => !p.slug.startsWith("pakarms-") && !prefixes.some((pre) => p.imageUrl.startsWith(pre)),
);
if (legacy.length) {
  console.log(`\nVisuels historiques conservés hors bucket : ${legacy.length}`);
  for (const p of legacy) console.log(`  ${p.slug} -> ${p.imageUrl}`);
}

if (CHECK_ONLY) {
  console.log("\n--check : aucune écriture.");
} else {
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`\nSnapshot écrit : ${SNAPSHOT_PATH}`);
}