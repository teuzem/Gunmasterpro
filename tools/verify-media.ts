import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Vérifie que tous les visuels référencés dans category-images.json existent
// physiquement dans le stockage local (/app/data/media).
// À lancer depuis le conteneur `app` après le seed.
async function main() {
  const manifest = JSON.parse(await readFile("tools/category-images.json", "utf8"));
  const mediaDir = "/app/data/media";
  let missing = 0;

  for (const [slug, entry] of Object.entries(manifest)) {
    const filePath = path.join(mediaDir, entry.key);
    try {
      await readFile(filePath);
    } catch {
      console.log(`MISSING: ${filePath}`);
      missing++;
    }
  }

  if (missing === 0) {
    console.log("Tous les visuels sont présents dans le bucket local.");
  } else {
    console.error(`\n${missing} fichier(s) manquant(s) dans le stockage local !`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
