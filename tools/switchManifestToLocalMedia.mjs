// Bascule les URL du snapshot et de la taxonomie vers le stockage local.
//
// Le préfixe /manus-storage/ désigne le bucket S3 de Manus, désormais
// inaccessible (compte perdu). Les mêmes clés sont réutilisées telles quelles :
// seule la racine change, de /manus-storage/ vers /media/. Les fichiers
// correspondants sont écrits dans le volume persistant par
// tools/pushMediaToServer.mjs.
//
// Les galeries sont réordonnées pour que le premier visuel reste le principal.
//
// Usage : node tools/switchManifestToLocalMedia.mjs [--check]

import { readFile, writeFile } from "node:fs/promises";

const CHECK_ONLY = process.argv.includes("--check");
const LOCAL_PREFIX = "/media/";
const REMOTE_PREFIX = "/manus-storage/";

const snapshotPath = "server/data/catalogue.snapshot.json";
const categoriesPath = "server/data/subcategories.json";

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const categories = JSON.parse(await readFile(categoriesPath, "utf8"));

const toLocal = (url) => (typeof url === "string" && url.startsWith(REMOTE_PREFIX) ? LOCAL_PREFIX + url.slice(REMOTE_PREFIX.length) : url);

let productsChanged = 0;
let galleryChanged = 0;

for (const product of snapshot) {
  const imageUrl = toLocal(product.imageUrl);
  if (imageUrl !== product.imageUrl) productsChanged++;
  product.imageUrl = imageUrl;

  const gallery = Array.isArray(product.gallery) ? product.gallery : [];
  let touched = false;
  product.gallery = gallery.map((url) => {
    const local = toLocal(url);
    if (local !== url) touched = true;
    return local;
  });
  if (touched) galleryChanged++;
}

let categoriesChanged = 0;
for (const category of categories) {
  const imageUrl = toLocal(category.imageUrl);
  if (imageUrl !== category.imageUrl) categoriesChanged++;
  category.imageUrl = imageUrl;
}

const remaining = snapshot.filter((product) => product.imageUrl.startsWith(REMOTE_PREFIX)).length;
const remainingGallery = snapshot.reduce(
  (total, product) => total + (product.gallery ?? []).filter((url) => url.startsWith(REMOTE_PREFIX)).length,
  0,
);

console.log(`Produits retypés        : ${productsChanged}/${snapshot.length}`);
console.log(`Galeries retypées       : ${galleryChanged}`);
console.log(`Catégories retypées     : ${categoriesChanged}/${categories.length}`);
console.log(`URL /manus-storage/ restantes : ${remaining} (produits), ${remainingGallery} (galeries)`);

if (remaining || remainingGallery) {
  console.error("Bascule incomplète.");
  process.exit(3);
}

if (CHECK_ONLY) {
  console.log("--check : aucune écriture.");
} else {
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(categoriesPath, `${JSON.stringify(categories, null, 2)}\n`, "utf8");
  console.log("\nSnapshot et taxonomie écrits.");
}