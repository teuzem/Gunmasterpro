// Téléverse l'intégralité des médias du catalogue (hero + produits PAK Arms) dans
// le bucket de stockage via URL pré-signée PUT, puis écrit un manifeste
// exploitable par le seed (`tools/media-manifest.json`).
//
// Clés de stockage volontairement sûres pour une URL : le pré-signage GET
// recopie le chemin de la clé dans l'URL CloudFront, donc un espace produit une
// signature invalide (HTTP 403). Aucun nom de fichier d'origine n'est réutilisé.
//
// Idempotent : un objet déjà au manifeste, au bon sha256 et encore lisible dans
// le bucket n'est pas retéléversé. `--force` renumérote tout.
//
// Usage:
//   node tools/uploadProductMedia.mjs [--force] [--hero|--products] [--limit=N]

import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";

loadEnv({ quiet: true });

const HERO_DIR = "public/images hero section";
const PRODUCT_ROOT = "public/pakarms_catalog_export/images";
const SNAPSHOT_PATH = "server/data/catalogue.snapshot.json";
const MANIFEST_PATH = "tools/media-manifest.json";
const FORCE = process.argv.includes("--force");
const ONLY_HERO = process.argv.includes("--hero");
const ONLY_PRODUCTS = process.argv.includes("--products");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) || 0);
const CONCURRENCY = 8;

const CONTENT_TYPES = {
  ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".avif": "image/avif", ".gif": "image/gif",
};
const EXTENSIONS = new Set(Object.keys(CONTENT_TYPES));

const forgeUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY || "";
if (!forgeUrl || !forgeKey) throw new Error("BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY absents.");

const RETRIES = 5;

/** Rejoue `fn` avec backoff exponentiel : les pré-signages et les PUT S3 échouent
 *  transitoirement sous forte concurrence (réseau, 502/503). */
async function retry(label, fn) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === RETRIES) break;
      const delay = 500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      console.log(`  ! ${label} — échec ${attempt}/${RETRIES} (${String(error.message ?? error).slice(0, 80)}), nouvel essai dans ${delay} ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${label} : ${String(lastError.message ?? lastError)}`);
}

async function presign(op, key) {
  return retry(`presign ${op} ${key}`, async () => {
    const url = new URL(`v1/storage/presign/${op}`, `${forgeUrl}/`);
    url.searchParams.set("path", key);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${forgeKey}` } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} : ${(await response.text().catch(() => "")).slice(0, 120)}`);
    }
    const { url: signed } = await response.json();
    if (!signed) throw new Error("URL pré-signée vide");
    return signed;
  });
}

async function exists(key) {
  try {
    // Les URL pré-signées S3 sont signées pour GET : lecture partielle via Range.
    const response = await fetch(await presign("get", key), { headers: { Range: "bytes=0-0" } });
    await response.arrayBuffer().catch(() => {});
    return response.status === 200 || response.status === 206;
  } catch {
    return false;
  }
}

async function upload(key, data, contentType) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(key)) throw new Error(`Clé non sûre pour une URL : « ${key} »`);
  return retry(`PUT ${key}`, async () => {
    const response = await fetch(await presign("put", key), {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: new Blob([data], { type: contentType }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return `/manus-storage/${key}`;
  });
}

const hashSuffix = () => randomUUID().replace(/-/g, "").slice(0, 8);

const persist = () => writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

// Un lot produits dure plus d'une heure : le manifeste est donc vidé régulièrement
// pour qu'une interruption ne fasse pas perdre les téléversements déjà faits.
function flusher(interval = 25) {
  let pending = 0;
  let writing = null;
  return async () => {
    if (++pending < interval) return;
    pending = 0;
    while (writing) await writing;
    writing = persist();
    await writing;
    writing = null;
  };
}

/** Exécute `worker` sur `items` avec une concurrence bornée. */
async function pool(items, worker, concurrency = CONCURRENCY, afterEach) {
  const queue = [...items];
  const failures = [];
  let done = 0;
  async function run() {
    while (queue.length) {
      const item = queue.shift();
      try {
        await worker(item);
      } catch (error) {
        failures.push(String(error.message ?? error));
      }
      done++;
      if (afterEach) await afterEach();
      if (done % 100 === 0 || done === items.length) {
        console.log(`  ... ${done}/${items.length} (${failures.length} échec(s))`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return failures;
}

const manifest = { hero: [], products: {} };
try {
  Object.assign(manifest, JSON.parse(await readFile(MANIFEST_PATH, "utf8")));
} catch { /* premier passage */ }
manifest.hero ??= [];
manifest.products ??= {};

// --- Visuels hero -----------------------------------------------------------
// Un fichier par diapositive, numéroté dans l'ordre éditorial attendu.
if (!ONLY_PRODUCTS) {
  const heroFiles = (await readdir(HERO_DIR, { withFileTypes: true }))
    .filter((e) => e.isFile() && EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();

  console.log(`Hero: ${heroFiles.length} visuels`);
  const failures = await pool(heroFiles.map((name) => ({ name })), async ({ name }) => {
    const extension = path.extname(name).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    const data = await readFile(path.join(HERO_DIR, name));
    const sha256 = createHash("sha256").update(data).digest("hex");
    const previous = manifest.hero.find((h) => h.file === name);

    if (!FORCE && previous?.key && previous.sha256 === sha256 && (await exists(previous.key))) return;
    const key = `hero/${path.basename(name, extension)}_${hashSuffix()}${extension}`;
    const url = await upload(key, data, contentType);
    const record = { file: name, key, url, contentType, bytes: data.length, sha256 };
    manifest.hero = manifest.hero.filter((h) => h.file !== name).concat(record);
    console.log(`  ↑ ${name} (${Math.round(data.length / 1024)} Ko) -> ${url}`);
  }, 4);
  manifest.hero.sort((a, b) => a.file.localeCompare(b.file));
  await persist();
  if (failures.length) throw new Error(`Hero — ${failures.length} échec(s) :\n${failures.slice(0, 5).join("\n")}`);
}

// --- Visuels produits -------------------------------------------------------
if (!ONLY_HERO) {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  const products = snapshot.filter((p) => p.slug.startsWith("pakarms-"));

  // Le dossier porte l'identifiant Drive en préfixe, le slug du snapshot en
  // suffixe. Les noms de dossier sont parfois tronqués dans l'export : seul
  // l'identifiant est fiable pour l'appariement.
  const dirBySourceId = new Map();
  for (const entry of await readdir(PRODUCT_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const id = /^(\d+)_/.exec(entry.name)?.[1];
    if (id) dirBySourceId.set(id, entry.name);
  }

  // Dossiers sans fiche catalogue : exclus, conformément à media-migration-audit.md.
  const orphans = [...dirBySourceId.values()].filter(
    (dir) => !products.some((p) => p.slug.endsWith(`-${dir.split("_")[0]}`)),
  );

  const jobs = [];
  for (const product of products) {
    const id = /-(\d+)$/.exec(product.slug)?.[1];
    const dir = id ? dirBySourceId.get(id) : undefined;
    if (!dir) throw new Error(`Aucune image pour le produit ${product.slug}`);
    const files = (await readdir(path.join(PRODUCT_ROOT, dir)))
      .filter((f) => EXTENSIONS.has(path.extname(f).toLowerCase()))
      .sort();
    if (!files.length) throw new Error(`Dossier vide pour ${product.slug} (${dir})`);
    files.forEach((file, index) => jobs.push({ slug: product.slug, id, dir, file, index }));
  }
  if (LIMIT) jobs.splice(LIMIT);

  const byContent = new Map(); // sha256 -> clé, pour ne pas dupliquer dans le bucket
  console.log(`Produits: ${products.length} fiches, ${jobs.length} images à traiter`);
  console.log(`Dossiers orphelins exclus : ${orphans.join(", ") || "aucun"}`);

  const failures = await pool(jobs, async ({ slug, id, dir, file, index }) => {
    const extension = path.extname(file).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    const data = await readFile(path.join(PRODUCT_ROOT, dir, file));
    const sha256 = createHash("sha256").update(data).digest("hex");

    let key = byContent.get(sha256);
    if (!key) {
      const previous = manifest.products[slug];
      const previousEntry = previous?.files?.find((f) => f.sha256 === sha256);
      if (!FORCE && previousEntry?.key && (await exists(previousEntry.key))) {
        key = previousEntry.key;
      } else {
        // Index 1-based pour une lecture directe dans le manifeste.
        key = `catalogue/pakarms/${id}/${index + 1}_${hashSuffix()}${extension}`;
        await upload(key, data, contentType);
      }
      byContent.set(sha256, key);
    }

    const url = `/manus-storage/${key}`;
    const record = manifest.products[slug] ?? { slug, files: [] };
    record.files = record.files.filter((f) => f.file !== file).concat({ file, index, key, url, contentType, sha256 });
    record.files.sort((a, b) => a.index - b.index);
    manifest.products[slug] = record;
  }, CONCURRENCY, flusher());

  if (failures.length) {
    await persist();
    throw new Error(`Produits — ${failures.length} échec(s) :\n${failures.slice(0, 8).join("\n")}`);
  }
}

await persist();
console.log(`\nHero      : ${manifest.hero.length} visuels`);
console.log(`Produits  : ${Object.keys(manifest.products).length} fiches`);
console.log(`Manifeste : ${MANIFEST_PATH}`);