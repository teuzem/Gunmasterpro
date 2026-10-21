// Télécharge les visuels des fiches historiques absentes de l'export PAK Arms.
//
// Ces sept références (CZ 75 B, SIG P226 Legion, Walther PPK/S, Browning
// Hi-Power, Ruger 10/22, FN FAL, TOZ-66) ne sont vendues ni dans l'export
// fourni ni chez pakarms.co. Les visuels retenus proviennent de Wikimedia
// Commons, sous licence libre (CC BY, CC BY-SA) : ce sont les seules sources
// compatibles avec un usage commercial sans accord préalable.
//
// Les licences CC BY et CC BY-SA imposent l'attribution et, pour BY-SA, le
// partage dans les mêmes conditions. L'attribution est donc conservée dans
// server/data/media-credits.json et restituée sur la fiche produit.
//
// Usage : node tools/fetchHistoricalMedia.mjs [--apply]

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const DEST = "public/historical-media";
const CREDITS_PATH = "server/data/media-credits.json";
const API = "https://commons.wikimedia.org/w/api.php";
// Wikimedia exige un User-Agent descriptif, avec un moyen de contact.
const USER_AGENT = "GunsMasterProMediaImport/1.0 (https://gunmaster-pro.com; catalogue media import)";

/** Fichiers retenus pour chaque fiche, avec la licence et l'auteur vérifiés. */
const SELECTION = {
  "cz-75-b": [
    { file: "CZ75B-p1030137.jpg", author: "Rama", license: "CC BY-SA 2.0 FR" },
    { file: "CZ75B-p1030137 (cropped).jpg", author: "Rama", license: "CC BY-SA 2.0 FR" },
    { file: "CZ-75B Rude.jpg", author: "Rude", license: "CC BY-SA 3.0" },
  ],
  "sig-sauer-p226-legion": [
    { file: "SIG P226 Legion .jpg", author: "Dustywaffles", license: "CC BY-SA 4.0" },
    { file: "Sig Sauer P226 Legion 1.jpg", author: "IrrationalBeing", license: "CC BY-SA 4.0" },
    { file: "Sig Sauer P226 Legion 2.jpg", author: "IrrationalBeing", license: "CC BY-SA 4.0" },
  ],
  "walther-ppk-s": [
    { file: "Walther PPK .380 S101598 L DSC7734.jpg", author: "Self Loader", license: "CC BY-SA 4.0" },
    { file: "Walther PPK .380 S101598 R DSC7737.jpg", author: "Self Loader", license: "CC BY-SA 4.0" },
    { file: "Walther PPK-S 9mm kurz .380ACP.jpg", author: "Judson Guns", license: "CC BY-SA 4.0" },
    { file: "Classic Walther PPK.jpg", author: "Tomascastelazo", license: "CC BY-SA 4.0" },
  ],
  "browning-hi-power": [
    { file: "FN Browning Hi Power 9mm.jpg", author: "DrunkDriver", license: "CC BY-SA 3.0" },
    { file: "Flickr - ~Steve Z~ - Browning Hi Power.jpg", author: "Stephen Z", license: "CC BY-SA 2.0" },
    { file: "Browning Hi Power SFS.jpg", author: "KevlarSix", license: "CC BY-SA 3.0" },
  ],
  "ruger-10-22": [
    { file: "Ruger 1022 rifle (picture 1).jpg", author: "Nekator", license: "CC BY-SA 4.0" },
    { file: "Ruger-1022.jpg", author: "Dictouray", license: "CC BY-SA 3.0" },
    { file: "Ruger 10-22 (36612280570).jpg", author: "James Case", license: "CC BY 2.0" },
    { file: "Ruger-10-22-white01.jpg", author: "MathKnight and BigBattles", license: "CC BY 4.0" },
  ],
  "fn-fal": [
    { file: "FN FAL (Fusil Automatique Léger - Light Automatic Rifle).jpg", author: "Bouillant Achille", license: "CC BY-SA 4.0" },
    { file: "Century Arms FN FAL.jpg", author: "Snark", license: "CC BY-SA 3.0" },
    { file: "FN FAL 1959 001-1.jpg", author: "Armémuseum (Swedish Army Museum)", license: "CC BY 4.0" },
    { file: "FN FAL 1959 001-2.jpg", author: "Armémuseum (Swedish Army Museum)", license: "CC BY 4.0" },
  ],
  "toz-66": [
    { file: "TOZ-66 Shotgun.jpg", author: "DTKCEKDRK", license: "CC BY-SA 4.0" },
  ],
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function imageInfo(file) {
  const url = `${API}?action=query&titles=${encodeURIComponent(`File:${file}`)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.status === 429) { await pause(4000 * attempt); continue; }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const page = Object.values((await response.json())?.query?.pages ?? {})[0];
    if (!page || page.missing !== undefined) throw new Error("fichier absent");
    return page.imageinfo[0];
  }
  throw new Error("débit API dépassé");
}

/**
 * Wikimedia limite fortement le débit par IP : on espace les requêtes et on
 * réessaie avec un recul croissant. Le script est reprenable : un fichier déjà
 * présent est réutilisé, seule son attribution est reconstruite.
 */
async function download(url) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (response.status === 429) {
        const wait = Math.min(60000, 6000 * attempt);
        console.log(`    (limite de débit, nouvelle tentative dans ${Math.round(wait / 1000)} s)`);
        await pause(wait);
        continue;
      }
      if (!response.ok) throw new Error(`téléchargement HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 6) throw error;
      await pause(Math.min(45000, 4000 * attempt));
    }
  }
  throw new Error("débit API dépassé");
}

/** Fichiers déjà téléchargés lors d'un essai précédent. */
async function existingFiles(slug) {
  const directory = path.join(DEST, slug);
  if (!existsSync(directory)) return new Set();
  const names = await readdir(directory);
  return new Set(names);
}

const credits = {};
let downloaded = 0;
let reused = 0;
let failed = 0;

for (const [slug, files] of Object.entries(SELECTION)) {
  console.log(`\n=== ${slug} ===`);
  credits[slug] = [];
  await mkdir(path.join(DEST, slug), { recursive: true });
  const already = await existingFiles(slug);

  for (const [index, entry] of files.entries()) {
    const fileName = `${String(index + 1).padStart(2, "0")}.tmp`;
    const target = path.join(DEST, slug, fileName.replace(".tmp", ".jpg"));

    try {
      const info = await imageInfo(entry.file);
      const source = info.url.split("?")[0];
      // L'extension suit le format réellement servi, pas le nom du fichier.
      const extension = /\.png($|\?)/i.test(source) ? "png" : "jpg";
      const finalName = `${String(index + 1).padStart(2, "0")}.${extension}`;
      const finalTarget = path.join(DEST, slug, finalName);

      let buffer;
      if (already.has(finalName) && existsSync(finalTarget)) {
        buffer = null;
        reused++;
        console.log(`  ${finalName}  déjà présent`);
      } else {
        buffer = await download(source);
        if (APPLY) await writeFile(finalTarget, buffer);
        downloaded++;
        console.log(`  ${finalName}  ${Math.round(buffer.length / 1024)} Ko  ${entry.license}  ${entry.author}`);
      }

      credits[slug].push({
        file: finalName,
        sourceFile: entry.file,
        title: (info.extmetadata?.ObjectName?.value ?? entry.file).replace(/<[^>]+>/g, ""),
        author: entry.author,
        license: entry.license,
        source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(entry.file)}`,
      });
    } catch (error) {
      failed++;
      console.error(`  ÉCHEC ${entry.file} : ${error.message}`);
    }
    await pause(2500);
  }
}

if (APPLY) {
  await writeFile(CREDITS_PATH, `${JSON.stringify(credits, null, 2)}\n`, "utf8");
  console.log(`\nAttributions écrites : ${CREDITS_PATH}`);
}
console.log(`\nTéléchargés : ${downloaded}, échecs : ${failed}`);