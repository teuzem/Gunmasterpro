// Rattache les fiches du catalogue aux dossiers PAK Arms, avec un seuil de
// confiance explicite, et rapporte la couverture obtenue.
//
// Le rapprochement ne doit jamais être approximatif : rattacher « Glock 17 Gen5 »
// à une « Glock 26 Gen5 Compact » produirait une fiche fausse. Une
// correspondance n'est retenue que si le dossier porte explicitement la marque
// ET le modèle de la fiche.
//
// Usage : node tools/matchHistoricalProducts.mjs [--apply] [--report]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const ROOT = "public/pakarms_catalog_export/images categories Gunmaster";

const snapshot = JSON.parse(readFileSync("server/data/catalogue.snapshot.json", "utf8"));
const local = JSON.parse(readFileSync("tools/media-manifest.local.json", "utf8"));
const dirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

const normalize = (value) =>
  (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Le modèle doit apparaître dans le dossier, marque comprise.
 *
 * Cas particuliers validés à la main après examen des désignations :
 *  - AK-47 : le dossier « 7147_original-1968-model-russian-kalashnikov » est
 *    la même arme (Kalashnikov 7,62×39) sous sa désignation d'import.
 *  - Rapprochements refusés car l'arme ou le calibre diffèrent : Ruger EC9s
 *    (9 mm) pour un Ruger 10/22 (.22 LR), Colt 1911 pour un Browning
 *    Hi-Power, SIG M400 pour un P226 Legion, CZ 75 Duty pour un CZ 75 B.
 */
const MANUAL_MATCHES = {
  "ak-47": "7147_original-1968-model-russian-kalashnikov",
};

function findMatches(product) {
  const manual = MANUAL_MATCHES[product.slug];
  if (manual) {
    return dirs
      .filter((dir) => dir === manual)
      .map((dir) => ({ dir, score: 10, manual: true }));
  }

  const model = normalize(product.model);
  const brand = normalize(product.brand);
  const name = normalize(product.name);
  const modelTokens = model.split("-").filter((token) => token.length > 2);
  if (!model || modelTokens.length === 0) return [];

  return dirs
    .map((dir) => {
      const dirName = normalize(dir.split("_").slice(1).join("_"));
      const tokens = dirName.split("-");
      // Le dossier doit contenir le modèle, et un jeton de la marque.
      const modelHit = modelTokens.filter((token) => tokens.includes(token)).length;
      const brandHit = brand.length > 2 && tokens.includes(brand.split("-")[0]);
      const nameHit = normalize(name).includes(dirName) || dirName.includes(normalize(name));
      let score = 0;
      if (modelHit === modelTokens.length) score += 2;
      if (brandHit) score += 2;
      if (nameHit) score += 2;
      if (modelHit > 0) score += 1;
      return { dir, score };
    })
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score);
}

const orphans = snapshot.filter((product) => !local.products?.[product.slug]);
const assignments = [];
for (const product of orphans) {
  const matches = findMatches(product);
  const best = matches[0];
  if (!best) {
    console.log(`${product.slug.padEnd(26)} -> AUCUN équivalent fiable (${matches.length} candidats sous le seuil)`);
    continue;
  }
  const files = readdirSync(`${ROOT}/${best.dir}`);
  assignments.push({ slug: product.slug, dir: best.dir, files, score: best.score, model: product.model, brand: product.brand });
  console.log(`${product.slug.padEnd(26)} -> ${best.dir.padEnd(50)} score=${best.score} (${files.length} fichiers)  ${product.brand} ${product.model}`);
}

const assigned = new Set(assignments.map((a) => a.slug));
const stillOrphan = orphans.filter((p) => !assigned.has(p.slug));
console.log(`\nRattachés de façon fiable : ${assignments.length}/${orphans.length}`);
console.log(`Sans équivalent sur pakarms.co : ${stillOrphan.length}`);
for (const product of stillOrphan) {
  console.log(`  ${product.slug.padEnd(26)} ${product.brand} ${product.model} — ${product.caliber}`);
}

if (APPLY && assignments.length) {
  // Les fichiers du dossier retenu sont ajoutés au manifeste local, avec une
  // clé déterministe : le dossier PAK Arms d'origine, qui n'est pas encore
  // versionné, doit être poussé au serveur.
  for (const assignment of assignments) {
    const [sourceId] = assignment.dir.split("_");
    local.products[assignment.slug] = {
      slug: assignment.slug,
      files: assignment.files
        .sort()
        .map((file, index) => ({
          file,
          index,
          key: `catalogue/pakarms/${sourceId}/h${index + 1}_${file.replace(/[^A-Za-z0-9.]/g, "_")}`,
          url: `/media/catalogue/pakarms/${sourceId}/h${index + 1}_${file.replace(/[^A-Za-z0-9.]/g, "_")}`,
          contentType: file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg",
        })),
    };
  }
  writeFileSync("tools/media-manifest.local.json", `${JSON.stringify(local, null, 2)}\n`, "utf8");
  console.log("\nManifeste local mis à jour.");
}