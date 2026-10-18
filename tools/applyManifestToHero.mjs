// Aligne les deux listes de diapositives hero sur les objets réellement
// téléversés : `client/src/lib/homeHeroContent.ts` (rendu client) et
// `tools/seedHomepageVisuals.mjs` (seed base). Les deux fichiers portaient
// historiquement des hachages différents pour les mêmes visuels.
//
// Usage : node tools/applyManifestToHero.mjs [--check]

import { readFile, writeFile } from "node:fs/promises";

const CHECK_ONLY = process.argv.includes("--check");
const TARGETS = ["client/src/lib/homeHeroContent.ts", "tools/seedHomepageVisuals.mjs"];
const manifest = JSON.parse(await readFile("tools/media-manifest.json", "utf8"));

// Clé du manifeste à partir du nom de fichier source.
const urlByFile = new Map(manifest.hero.map((entry) => [entry.file, entry.url]));

/** « 01_Semi_Auto_Handguns_Studio_Tactical_72981e1a.png » -> nom source. */
const sourceName = (key) => {
  const base = key.split("/").pop();
  const match = /^(.*)_[0-9a-f]{8}\.[a-z0-9]+$/.exec(base);
  if (!match) return null;
  for (const extension of [".png", ".webp", ".jpg", ".jpeg"]) {
    if (urlByFile.has(`${match[1]}${extension}`)) return `${match[1]}${extension}`;
  }
  return null;
};

let totalReplaced = 0;
let unmatched = [];

for (const target of TARGETS) {
  const original = await readFile(target, "utf8");
  const replaced = [];
  let count = 0;

  // Seules les clés hero héritées (racine du bucket, préfixe numérique) sont
  // réécrites : les visuels catégories et produits portent un préfixe de dossier
  // et ne doivent pas être touchés.
  const HERO_KEY = /^\/manus-storage\/\d{2}_[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*_[0-9a-f]{8}\.[a-z0-9]+$/;
  const patched = original.replace(/\/manus-storage\/([^"'`\s]+\.[a-z0-9]+)/g, (match, key) => {
    if (key.startsWith("hero/")) return match; // déjà à jour
    if (!HERO_KEY.test(match)) return match; // catégories / produits : hors périmètre
    const file = sourceName(key);
    if (!file) {
      unmatched.push({ target, key });
      return match;
    }
    count++;
    replaced.push(`${key} -> ${urlByFile.get(file)}`);
    return `/manus-storage/${urlByFile.get(file).replace("/manus-storage/", "")}`;
  });

  totalReplaced += count;
  console.log(`${target} : ${count} URL hero réécrite(s)`);
  if (CHECK_ONLY) continue;
  if (patched !== original) await writeFile(target, patched, "utf8");
}

console.log(`\nTotal : ${totalReplaced} référence(s) hero alignée(s)`);
if (unmatched.length) {
  console.error(`\nURL non résolues (${unmatched.length}) :`);
  for (const u of unmatched) console.error(`  ${u.target} : ${u.key}`);
  process.exit(3);
}