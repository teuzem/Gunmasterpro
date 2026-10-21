// Reconstruit les URL médias du snapshot à partir du manifeste local.
//
// Le snapshot est la source de vérité du seed : il doit porter les URL /media/*
// réellement présentes dans le volume, et non les URL /manus-storage/* d'origine.
//
// L'ordre éditorial est celui du manifeste : le premier visuel est le principal.
//
// Usage : node tools/applyManifestToSnapshot.mjs [--check]

import { readFile, writeFile } from "node:fs/promises";

const CHECK_ONLY = process.argv.includes("--check");
const SNAPSHOT_PATH = "server/data/catalogue.snapshot.json";
const LOCAL_MANIFEST_PATH = "tools/media-manifest.local.json";
const FORGE_MANIFEST_PATH = "tools/media-manifest.json";
const MEDIA_SOURCE = "Export catalogue PAK Arms (pakarms.co) — 19 août 2026";

const readOptional = async (path) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
};

const localManifest = await readOptional(LOCAL_MANIFEST_PATH);
const manifest = localManifest ?? (await readOptional(FORGE_MANIFEST_PATH));
if (!manifest) throw new Error("Aucun manifeste média disponible.");
if (!localManifest) console.warn("tools/media-manifest.local.json absent : repli sur le manifeste Forge.");

const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));

let updated = 0;
const missing = [];

for (const product of snapshot) {
  const entry = manifest.products?.[product.slug];
  if (!entry?.files?.length) {
    if (product.slug.startsWith("pakarms-") || !localManifest) missing.push(product.slug);
    continue;
  }

  // Déduplication : plusieurs fichiers de l'export ont un contenu identique
  // (exports répétés) et ne doivent pas produire de doublons en base.
  const urls = [];
  for (const file of [...entry.files].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) {
    if (urls[urls.length - 1] !== file.url) urls.push(file.url);
  }

  product.imageUrl = urls[0];
  product.gallery = urls;
  product.mediaSource = MEDIA_SOURCE;
  product.mediaRightsStatus = "verified";
  updated++;
}

console.log(`Fiches mises à jour : ${updated}/${snapshot.length}`);
console.log(`Visuels référencés  : ${snapshot.reduce((n, p) => n + (p.gallery?.length ?? 0), 0)}`);

if (missing.length) {
  console.error(`\nFiche sans média (${missing.length}) :\n${missing.map((s) => `  ${s}`).join("\n")}`);
  process.exit(3);
}

// Garde-fou : aucun visuel ne doit rester hors préfixe connu.
const prefixes = ["/media/categories/", "/media/catalogue/pakarms/", "/media/catalogue/historique/"];
const legacy = snapshot.filter((p) => !prefixes.some((pre) => p.imageUrl.startsWith(pre)));
if (legacy.length) {
  console.error(`\nVisuel hors préfixe attendu (${legacy.length}) :`);
  for (const p of legacy.slice(0, 10)) console.log(`  ${p.slug} -> ${p.imageUrl}`);
  process.exit(3);
}

if (CHECK_ONLY) {
  console.log("\n--check : aucune écriture.");
} else {
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`\nSnapshot écrit : ${SNAPSHOT_PATH}`);
}