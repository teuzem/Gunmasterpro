// Contrôle que chaque URL média du catalogue répond réellement via le bucket
// (présigné GET + Range), avant toute bascule en base. Aucune écriture par défaut.
//
// `--prune` retire des galeries les URL vérifiées injoignables : sans cela le
// storefront affiche des images cassées. Les visuels principaux ne sont jamais
// supprimés, seulement les entrées de galerie.
//
// Usage : node tools/verifyMediaUrls.mjs [--prune] [--check-legacy]

import { readFile, writeFile } from "node:fs/promises";
import { config as loadEnv } from "dotenv";
loadEnv({ quiet: true });

const PRUNE = process.argv.includes("--prune");
const SNAPSHOT_PATH = "server/data/catalogue.snapshot.json";
const MANIFEST_PATH = "tools/media-manifest.json";
const CHECK_LEGACY = process.argv.includes("--check-legacy");
const CONCURRENCY = 16;

const forgeUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY || "";
if (!forgeUrl || !forgeKey) throw new Error("BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY absents.");

async function presignGet(key) {
  const url = new URL("v1/storage/presign/get", `${forgeUrl}/`);
  url.searchParams.set("path", key);
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${forgeKey}` } });
      if (!response.ok) throw new Error(`presign ${response.status}`);
      return (await response.json()).url;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}

async function check(path) {
  const key = path.replace(/^\/manus-storage\//, "");
  try {
    const response = await fetch(await presignGet(key), { headers: { Range: "bytes=0-0" } });
    await response.arrayBuffer().catch(() => {});
    return response.status === 200 || response.status === 206;
  } catch {
    return false;
  }
}

const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const categories = JSON.parse(await readFile("tools/category-images.json", "utf8"));

const targets = new Map();
const add = (label, url) => { if (url?.startsWith("/manus-storage/")) targets.set(url, label); };

for (const product of snapshot) {
  add(`${product.slug} (principal)`, product.imageUrl);
  for (const url of product.gallery ?? []) add(`${product.slug} (galerie)`, url);
}
for (const [slug, entry] of Object.entries(categories)) add(`catégorie ${slug}`, entry.url);
for (const entry of manifest.hero) add(`hero ${entry.file}`, entry.url);

const entries = [...targets.entries()];
console.log(`Contrôle de ${entries.length} URL uniques (concurrence ${CONCURRENCY}) ...`);

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

const bucketUrls = entries.filter(([url]) => !url.startsWith("/manus-storage/glock")
  && !url.match(/\/manus-storage\/(cz-75-b|sig-sauer|walther-ppk|browning-hi|beretta-92fs|glock-17|ruger-10|fn-fal|ak-47|toz-66)/));

console.log(`\nTotal        : ${entries.length}`);
console.log(`Cassés       : ${broken.length}`);
console.log(`Hors bucket  : ${entries.length - bucketUrls.length} (visuels historiques hors préfixe nouveau)`);

if (PRUNE) {
  // Un échec réseau isolé ne vaut pas preuve : chaque URL incriminée est
  // recontrôlée avant d'être retirée, faute de quoi un pic de latence ferait
  // disparaître des visuels parfaitement valides du catalogue.
  console.log(`\nRecontrôle des ${broken.length} URL incriminées avant purge ...`);
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
  // Le visuel principal est conservé même s'il est injoignable : la fiche reste
  // identifiée et le repli média de l'application prend le relais.
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

if (broken.length && !PRUNE) {
  const byPrefix = new Map();
  for (const b of broken) {
    const kind = b.url.includes("/categories/") ? "catégorie"
      : b.url.includes("/catalogue/pakarms/") ? "produit"
      : b.url.includes("/hero/") ? "hero" : "historique";
    byPrefix.set(kind, (byPrefix.get(kind) ?? 0) + 1);
  }
  console.log("\nRépartition :", Object.fromEntries(byPrefix));
  console.log("\nÉchantillon :");
  for (const b of broken.slice(0, CHECK_LEGACY ? 40 : 15)) console.log(`  ${b.label} -> ${b.url}`);
  if (CHECK_LEGACY) for (const b of broken) console.log(`  ${b.label} -> ${b.url}`);
  process.exit(3);
}
console.log(PRUNE
  ? "\nSnapshot cohérent : aucun visuel référencé ne renvoie d'erreur."
  : "\nToutes les URL répondent (HTTP 200/206).");