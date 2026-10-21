// Intègre les visuels des fiches historiques au manifeste local, afin qu'ils
// soient poussés vers le volume de l'application comme les autres.
//
// Les clés suivent la convention du reste du catalogue : un chemin sans espace
// ni caractère accentué, lisible et déterministe.
//
// Usage : node tools/applyHistoricalMedia.mjs [--apply]

import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const SOURCE = "public/historical-media";
const MANIFEST = "tools/media-manifest.local.json";
const CREDITS = "server/data/media-credits.json";

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const credits = JSON.parse(await readFile(CREDITS, "utf8"));

if (!existsSync(SOURCE)) {
  console.error(`${SOURCE} absent : lancez d'abord tools/fetchHistoricalMedia.mjs --apply`);
  process.exit(3);
}

let added = 0;
for (const [slug, entries] of Object.entries(credits)) {
  const directory = path.join(SOURCE, slug);
  if (!existsSync(directory)) { console.log(`${slug} : aucun dossier, ignoré`); continue; }
  const onDisk = new Set(await readdir(directory));

  const files = entries
    .filter((entry) => onDisk.has(entry.file))
    .map((entry, index) => {
      const key = `catalogue/historique/${slug}/${String(index + 1).padStart(2, "0")}${path.extname(entry.file)}`;
      return {
        file: entry.file,
        index,
        key,
        url: `/media/${key}`,
        contentType: entry.file.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
        credit: { author: entry.author, license: entry.license, source: entry.source, title: entry.title },
      };
    });

  if (!files.length) { console.log(`${slug} : aucun visuel, ignoré`); continue; }

  const existing = manifest.products?.[slug];
  // Les visuels historiques remplacent ceux d'un éventuel rattachement PAK Arms
  // antérieur : la fiche n'a qu'une seule galerie.
  manifest.products[slug] = { slug, files: existing?.files?.length ? files : [...(existing?.files ?? []), ...files] };
  added += files.length;
  console.log(`${slug.padEnd(24)} ${files.length} visuels`);
}

console.log(`\nVisuels intégrés au manifeste : ${added}`);

if (APPLY) {
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Manifeste écrit : ${MANIFEST}`);
}