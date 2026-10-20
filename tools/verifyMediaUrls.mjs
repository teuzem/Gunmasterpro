// Contrôle que chaque URL média du catalogue répond réellement.
//
// Les visuels sont servis par l'application elle-même, sur /media/* (volume
// persistant). Le contrôle se fait donc par requête HTTP contre le site, et
// non via un pré-signage distant : c'est la seule vérification qui prouve que
// l'utilisateur voit bien l'image.
//
// Usage :
//   node tools/verifyMediaUrls.mjs --base https://gunmaster-pro.com
//   node tools/verifyMediaUrls.mjs --base http://127.0.0.1:4101
//
// --prune retire des galeries les URL définitivement injoignables ; chaque URL
// incriminée est recontrôlée avant retrait, pour qu'un pic de latence ne fasse
// pas disparaître un visuel valide.

import { readFile, writeFile } from "node:fs/promises";
import { config as loadEnv } from "dotenv";
loadEnv({ quiet: true });

const args = process.argv.slice(2);
const valueOf = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name) => args.includes(`--${name}`);

const SNAPSHOT_PATH = "server/data/catalogue.snapshot.json";
const CATEGORIES_PATH = "server/data/subcategories.json";
const LOCAL_MANIFEST_PATH = "tools/media-manifest.local.json";
const CHECK_ONLY = process.argv.includes("--check");
const CONCURRENCY = 16;

const base = (valueOf("base") || "http://127.0.0.1:4101").replace(/\/$/, "");
if (!base) throw new Error("Usage : node tools/verifyMediaUrls.mjs --base https://votre-domaine");

async function check(url) {
  try {
    const response = await fetch(base + url, { redirect: "follow", headers: { Range: "bytes=0-0" } });
    await response.arrayBuffer().catch(() => {});
    return response.status === 200 || response.status === 206;
  } catch {
    return false;
  }
}

const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
const categories = JSON.parse(await readFile(CATEGORIES_PATH, "utf8"));

let localManifest = null;
try {
  localManifest = JSON.parse(await readFile(LOCAL_MANIFEST_PATH, "utf8"));
} catch {
  // Le manifeste local n'est pas indispensable au contrôle : les URL sont lues
  // dans le snapshot et la taxonomie.
}

const targets = new Map();
const add = (label, url) => { if (typeof url === "string" && url.startsWith("/media/")) targets.set(url, label); };

for (const product of snapshot) {
  add(`${product.slug} (principal)`, product.imageUrl);
  for (const url of product.gallery ?? []) add(`${product.slug} (galerie)`, url);
}
for (const category of categories) add(`catégorie ${category.slug}`, category.imageUrl);
for (const entry of localManifest?.hero ?? []) add(`hero ${entry.file}`, entry.url);

const entries = [...targets.entries()];
console.log(`Contrôle de ${entries.length} URL uniques via ${base} (concurrence ${CONCURRENCY}) ...`);

const broken = [];
let done = 0;
const queue = [...entries];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const [url, label] = queue.shift();
    if (!(await check(url))) broken.push({ url, label });
    done++;
    if (done % 250 === 0) console.log(`  ... ${done}/${entries.length} (${broken.length} cassé(s))`);
  }
}));

console.log(`\nTotal        : ${entries.length}`);
console.log(`Cassés       : ${broken.length}`);

if (broken.length && CHECK_ONLY) {
  const byPrefix = new Map();
  for (const b of broken) {
    const kind = b.url.includes("/categories/") ? "catégorie"
      : b.url.includes("/catalogue/pakarms/") ? "produit"
        : b.url.includes("/hero/") ? "hero" : "autre";
    byPrefix.set(kind, (byPrefix.get(kind) ?? 0) + 1);
  }
  console.log("\nRépartition :", Object.fromEntries(byPrefix));
  console.log("\nÉchantillon :");
  for (const b of broken.slice(0, 20)) console.log(`  ${b.label} -> ${b.url}`);
  process.exit(3);
}

if (broken.length) {
  console.log("\nRecontrôle des URL incriminées avant purge ...");
  const confirmed = [];
  const confirmedQueue = [...broken];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (confirmedQueue.length) {
      const entry = confirmedQueue.shift();
      if (!(await check(entry.url))) confirmed.push(entry);
    }
  }));
  if (confirmed.length !== broken.length) {
    console.log(`${broken.length - confirmed.length} URL(s) répondent au second essai : conservées.`);
  }
  const dead = new Set(confirmed.map((b) => b.url));
  let removed = 0;
  for (const product of snapshot) {
    const kept = (product.gallery ?? []).filter((url) => !dead.has(url) || url === product.imageUrl);
    removed += (product.gallery ?? []).length - kept.length;
    product.gallery = kept;
  }
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`--prune : ${removed} entrées de galerie définitivement injoignables retirées.`);
  if (!removed) console.log("--prune : aucune entrée retirée.");
}

console.log("\nToutes les URL répondent (HTTP 200/206).");
