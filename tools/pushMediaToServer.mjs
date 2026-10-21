// Pousse tous les médias locaux vers le volume persistant de l'application.
//
// L'application reçoit chaque fichier sur POST /api/media-import/<clé> et
// répond avec l'URL publique /media/* correspondante. Ce script reconstitue
// ensuite, pour les 239 produits, la galerie complète et les visuels de
// catégorie, puis écrit un manifeste exploitable par le seed.
//
// Le manifeste produit conserve les MÊMES clés que la version Forge
// (categories/…, hero/…, catalogue/pakarms/<sourceId>/…) : seule l'URL change,
// ce qui rend l'opération réversible et les URL lisibles.
//
// Usage (depuis le poste de travail) :
//   node tools/pushMediaToServer.mjs --base https://gunmaster-pro.com --token <TOKEN>
//
// Options :
//   --base=<url>      origine de l'application (obligatoire)
//   --token=<token>   MEDIA_IMPORT_TOKEN configuré côté serveur
//   --dry-run         n'envoie rien, affiche le plan
//   --only=hero|categories|products   ne traiter qu'une famille

import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);

/**
 * Analyse d'arguments tolérante : accepte --nom=valeur, --nom valeur, et un
 * jeton passé en positionnel (forme naturelle : « --base https://… <TOKEN> »).
 */
function parseArgs(argv) {
  const flags = new Set();
  const options = new Map();
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      positional.push(argument);
      continue;
    }
    const equals = argument.indexOf("=");
    if (equals !== -1) {
      options.set(argument.slice(2, equals), argument.slice(equals + 1));
      continue;
    }
    const name = argument.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      options.set(name, next);
      index++;
    } else {
      flags.add(name);
    }
  }
  return { flags, options, positional };
}

const { flags, options, positional } = parseArgs(args);
const valueOf = (name) => options.get(name);
const has = (name) => flags.has(name);

const BASE = (valueOf("base") || "").replace(/\/$/, "");
// Le jeton peut venir de --token, de la variable d'environnement, ou être passé
// en dernier argument positionnel.
const TOKEN = valueOf("token") || process.env.MEDIA_IMPORT_TOKEN || positional[0] || "";
const DRY_RUN = has("dry-run");
const ONLY = valueOf("only");
const CONCURRENCY = 6;

const PRODUCT_ROOT = "public/pakarms_catalog_export/images categories Gunmaster";
const CATEGORY_DIR = "public/images categories";
const HERO_DIR = "public/images hero section";
const HISTORICAL_DIR = "public/historical-media";
const OUTPUT = "tools/media-manifest.local.json";

if (!BASE && !DRY_RUN) {
  throw new Error(
    "Usage : node tools/pushMediaToServer.mjs --base https://votre-domaine --token <TOKEN>\n" +
    "   ou : node tools/pushMediaToServer.mjs --base https://votre-domaine <TOKEN>",
  );
}
if (!TOKEN && !DRY_RUN) {
  throw new Error(
    "Jeton manquant : précisez --token <TOKEN>, ou définissez MEDIA_IMPORT_TOKEN.\n" +
    "Le jeton doit correspondre à MEDIA_IMPORT_TOKEN configuré sur la ressource application.",
  );
}
if (TOKEN && !/^[A-Za-z0-9._-]+$/.test(TOKEN)) {
  throw new Error("Le jeton ne doit contenir que des lettres, chiffres, point, tiret et underscore.");
}

/**
 * Les fichiers sources vivent sur le poste de travail : ils sont
 * volontairement exclus de l'image Docker (voir .dockerignore). Lancer ce script
 * depuis le conteneur est donc impossible, et l'erreur de lecture de dossier
 * serait trompeuse. On le dit explicitement, avant toute lecture.
 */
const REQUIRED_PATHS = [
  { path: "tools/media-manifest.json", label: "manifeste média" },
  { path: "tools/media-manifest.local.json", label: "manifeste média local" },
  { path: "tools/category-images.json", label: "manifeste des catégories" },
  { path: PRODUCT_ROOT, label: "visuels produits (export PAK Arms)" },
  { path: CATEGORY_DIR, label: "visuels de catégories" },
  { path: HERO_DIR, label: "visuels hero" },
];
const missingPaths = REQUIRED_PATHS.filter((entry) => !existsSync(entry.path));
if (missingPaths.length) {
  console.error("Les originaux ne sont pas accessibles depuis ce répertoire :\n");
  for (const entry of missingPaths) console.error(`  - ${entry.path}  (${entry.label})`);
  console.error(
    "\nCe script s'exécute depuis le poste de travail, là où se trouvent les fichiers originaux.\n" +
    "Dans le conteneur, ces dossiers sont absents : le .dockerignore exclut public/ pour ne pas\n" +
    "embarquer près d'un giga-octet d'originaux dans l'image.\n" +
    "Revenez sur votre machine et relancez la commande depuis la racine du dépôt.",
  );
  process.exit(3);
}

const manifest = JSON.parse(await readFile("tools/media-manifest.json", "utf8"));
const categoryManifest = JSON.parse(await readFile("tools/category-images.json", "utf8"));
// Le manifeste local fait autorité : il porte les clés définitives, y compris
// celles des visuels historiques ajoutés après coup. Le manifeste Forge sert
// seulement de repli pour retrouver les chemins d'origine.
const existingManifest = JSON.parse(await readFile("tools/media-manifest.local.json", "utf8"));

// --- Constitution du plan ---------------------------------------------------
// Chaque entrée : { target, localPath, contentType, family, meta }
const plan = [];

for (const entry of manifest.hero) {
  plan.push({
    target: entry.key,
    localPath: path.join(HERO_DIR, entry.file),
    contentType: entry.contentType,
    family: "hero",
    meta: { file: entry.file },
  });
}

for (const [slug, entry] of Object.entries(categoryManifest)) {
  plan.push({
    target: entry.key,
    localPath: path.join(CATEGORY_DIR, entry.file),
    contentType: entry.contentType,
    family: "categories",
    meta: { slug, file: entry.file },
  });
}

const productDirs = new Map(
  (await readdir(PRODUCT_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name.split("_")[0], entry.name]),
);
for (const [slug, product] of Object.entries(manifest.products)) {
  const sourceId = slug.match(/-(\d+)$/)?.[1];
  const dir = sourceId ? productDirs.get(sourceId) : undefined;
  if (!dir) throw new Error(`Dossier local introuvable pour ${slug}`);
  for (const file of product.files) {
    plan.push({
      target: file.key,
      localPath: path.join(PRODUCT_ROOT, dir, file.file),
      contentType: file.contentType,
      family: "products",
      meta: { slug, file: file.file, index: file.index },
    });
  }
}

// Visuels historiques : fiches absentes de l'export, visuels issus de
// Wikimedia Commons. Le manifeste local en porte les clés définitives.
for (const [slug, product] of Object.entries(existingManifest.products ?? {})) {
  for (const file of product.files ?? []) {
    if (!file.key.startsWith("catalogue/historique/")) continue;
    const localName = file.key.split("/").slice(-1)[0];
    const index = Number(localName.replace(/\D/g, "")) - 1;
    const source = (product.files ?? []).find((entry) => entry.index === index);
    if (!source) continue;
    plan.push({
      target: file.key,
      localPath: path.join(HISTORICAL_DIR, slug, source.file),
      contentType: file.contentType,
      family: "historical",
      meta: { slug, file: source.file, index: file.index },
    });
  }
}

const selected = plan.filter((entry) => !ONLY || entry.family === ONLY);
const count = (family) => selected.filter((entry) => entry.family === family).length;
console.log(
  `Plan : ${selected.length} fichiers (hero ${count("hero")}, catégories ${count("categories")}, produits ${count("products")}, historiques ${count("historical")})`,
);
if (DRY_RUN) {
  let bytes = 0;
  for (const entry of selected) bytes += (await stat(entry.localPath)).size;
  console.log(`Volume total : ${(bytes / 1024 / 1024).toFixed(1)} Mo`);
  console.log(`Destination  : ${BASE}/api/media-import/<clé>`);
  process.exit(0);
}

// --- Envoi ------------------------------------------------------------------
const results = new Map();
let done = 0;
let failed = 0;
let bytesSent = 0;
const queue = [...selected];

/**
 * Taille maximale d'un fragment. Le reverse proxy (Traefik) coupe une requête
 * au bout de 60 s : à 50 ko/s observés, un visuel hero de 7 Mo n'arrive jamais.
 * En fractionnant, chaque requête tient largement sous le plafond.
 */
const CHUNK_BYTES = 512 * 1024;

async function postWithRetry(url, buffer, headers, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { method: "POST", headers, body: buffer });
      if (response.ok) return response;
      const text = await response.text().catch(() => "");
      // 5xx : erreur serveur transitoire, on réessaie. 4xx : requête invalide,
      // réessayer serait inutile.
      if (response.status < 500) {
        throw new Error(`HTTP ${response.status} : ${text.slice(0, 200)}`);
      }
      lastError = new Error(`HTTP ${response.status} : ${text.slice(0, 200)}`);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /HTTP 4\d\d/.test(error.message)) throw error;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
  throw lastError;
}

async function uploadOne(entry) {
  const buffer = await readFile(entry.localPath);
  const headers = {
    "Content-Type": entry.contentType,
    "x-media-import-token": TOKEN,
  };

  if (buffer.length <= CHUNK_BYTES) {
    const response = await postWithRetry(`${BASE}/api/media-import/${entry.target}`, buffer, headers);
    const payload = await response.json().catch(() => ({}));
    results.set(entry.target, payload.url);
  } else {
    // Envoi fragmenté, puis assemblage par un POST final vide.
    const chunks = Math.ceil(buffer.length / CHUNK_BYTES);
    for (let index = 0; index < chunks; index++) {
      const slice = buffer.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
      await postWithRetry(`${BASE}/api/media-import/${entry.target}`, slice, {
        ...headers,
        "x-media-part": String(index),
      });
    }
    const response = await postWithRetry(`${BASE}/api/media-import/${entry.target}`, Buffer.alloc(0), headers);
    const payload = await response.json().catch(() => ({}));
    results.set(entry.target, payload.url);
  }

  bytesSent += buffer.length;
  done++;
  if (done % 50 === 0) console.log(`  ${done}/${selected.length} (${(bytesSent / 1024 / 1024).toFixed(0)} Mo)`);
}

async function worker() {
  while (queue.length) {
    const entry = queue.shift();
    try {
      await uploadOne(entry);
    } catch (error) {
      failed++;
      console.error(`  ÉCHEC ${entry.target} : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

console.log(`Envoi vers ${BASE} …`);
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, selected.length) }, worker));
console.log(`Envoyé : ${done}, échec : ${failed}, ${(bytesSent / 1024 / 1024).toFixed(1)} Mo`);

if (failed) {
  console.error("Import incomplet : certaines URL resteront absentes.");
  process.exit(3);
}

// --- Reconstitution du manifeste --------------------------------------------
const localManifest = { hero: [], categories: [], products: {} };

for (const entry of plan) {
  const url = results.get(entry.target);
  if (!url) continue;
  if (entry.family === "hero") {
    localManifest.hero.push({ ...entry.meta, key: entry.target, url, contentType: entry.contentType });
  } else if (entry.family === "categories") {
    localManifest.categories.push({ ...entry.meta, key: entry.target, url, contentType: entry.contentType });
  } else {
    const product = (localManifest.products[entry.meta.slug] ??= { slug: entry.meta.slug, files: [] });
    product.files.push({ ...entry.meta, key: entry.target, url, contentType: entry.contentType });
  }
}

for (const product of Object.values(localManifest.products)) {
  product.files.sort((a, b) => a.index - b.index);
}

await writeFile(OUTPUT, `${JSON.stringify(localManifest, null, 2)}\n`, "utf8");
console.log(`\nManifeste écrit : ${OUTPUT}`);
console.log(`Hero : ${localManifest.hero.length} | Catégories : ${localManifest.categories.length} | Produits : ${Object.keys(localManifest.products).length}`);

// Contrôle : toutes les URL doivent être relatives et servies par l'application.
const invalid = [...results.values()].filter((url) => !url.startsWith("/media/"));
if (invalid.length) {
  console.error(`${invalid.length} URL hors préfixe /media/ : ${invalid.slice(0, 3)}`);
  process.exit(3);
}
console.log("Toutes les URL sont relatives et servies par l'application.");
