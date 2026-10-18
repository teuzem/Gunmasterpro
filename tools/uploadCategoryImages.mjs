// Téléverse les visuels de `public/images categories` dans le bucket de stockage
// (Forge/S3 via URL pré-signée PUT) et produit le manifeste slug -> clé / URL
// `/manus-storage/{clé}` consommé par le seed.
//
// Idempotent : un lot déjà enregistré dans le manifeste et encore lisible dans le
// bucket n'est pas ré-téléversé (relancer ne crée pas de doublon). `--force`
// renumérote les clés, `--verify-only` se limite au contrôle des URLs.
//
// Usage:
//   node tools/uploadCategoryImages.mjs [--force] [--verify-only] [--dir=<chemin>]

import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";

loadEnv();

const IMAGE_DIR = path.resolve(
  process.cwd(),
  process.argv.find((a) => a.startsWith("--dir="))?.slice(6) || "public/images categories",
);
const MANIFEST_PATH = path.resolve(process.cwd(), "tools/category-images.json");
const FORCE = process.argv.includes("--force");
const VERIFY_ONLY = process.argv.includes("--verify-only");

const IMAGE_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png", ".avif", ".gif", ".svg"]);
const CONTENT_TYPES = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** Fichier de `public/images categories` -> slug `catalogueCategories`. */
const CATEGORY_SLUGS = {
  "Semi Auto Handguns": "semi-auto-handguns",
  Revolvers: "revolvers",
  "Single Shot Handguns": "single-shot-handguns",
  "Other Handguns": "other-handguns",
  "Semi Auto Rifles": "semi-auto-rifles",
  "Bolt Action Rifles": "bolt-action-rifles",
  "Lever Action Rifles": "lever-action-rifles",
  "Pump Action Rifles": "pump-action-rifles",
  "Single Shot Rifles": "single-shot-rifles",
  "Other Rifles": "other-rifles",
  "Semi Auto Shotguns": "semi-auto-shotguns",
  "Pump Action Shotguns": "pump-action-shotguns",
  "Side by Side Shotguns": "side-by-side-shotguns",
  "Over Under Shotguns": "over-under-shotguns",
  "Single Shot Shotguns": "single-shot-shotguns",
  "Other Shotguns": "other-shotguns",
  Accessories: "accessories",
  Magazines: "magazines",
  Optics: "optics",
  Suppressors: "suppressors",
  "Collectible Firearms": "collectible-firearms",
  "Black Powder And Muzzleloaders": "black-powder-muzzleloaders",
  "Other Accessories": "other-accessories",
};

const forgeUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY || "";
if (!forgeUrl || !forgeKey) {
  throw new Error("BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY absents — bucket inaccessible.");
}

async function presignPut(key) {
  const url = new URL("v1/storage/presign/put", `${forgeUrl}/`);
  url.searchParams.set("path", key);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!response.ok) {
    throw new Error(`presign PUT ${response.status} pour « ${key} » : ${await response.text().catch(() => "")}`);
  }
  const { url: uploadUrl } = await response.json();
  if (!uploadUrl) throw new Error(`URL de téléversement vide pour « ${key} »`);
  return uploadUrl;
}

async function presignGet(key) {
  const url = new URL("v1/storage/presign/get", `${forgeUrl}/`);
  url.searchParams.set("path", key);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!response.ok) {
    throw new Error(`presign GET ${response.status} pour « ${key} » : ${await response.text().catch(() => "")}`);
  }
  return (await response.json()).url;
}

// Les clés doivent être sûres pour une URL : le pré-signage GET renvoie une URL
// CloudFront dont le chemin est recopié tel quel, donc un espace dans la clé
// produit une signature invalide (HTTP 403). On encode donc le slug en minuscules
// et on préfixe par `categories/`, comme le reste du stock média du projet.
function storageKeyFor(slug, extension) {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  return `categories/${slug}_${hash}${extension}`;
}

async function exists(key) {
  try {
    const url = await presignGet(key);
    // URL pré-signée S3 : signée pour GET, donc lecture partielle via Range.
    const response = await fetch(url, { headers: { Range: "bytes=0-0" } });
    await response.arrayBuffer().catch(() => {});
    return response.status === 200 || response.status === 206;
  } catch {
    return false;
  }
}

async function upload(key, data, contentType) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(key)) {
    throw new Error(`Clé de stockage non sûre pour une URL : « ${key} »`);
  }
  const uploadUrl = await presignPut(key);
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Blob([data], { type: contentType }),
  });
  if (!response.ok) throw new Error(`PUT S3 ${response.status} pour « ${key} »`);
  return `/manus-storage/${key}`;
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

const entries = (await readdir(IMAGE_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => {
    const extension = path.extname(entry.name);
    const slug = CATEGORY_SLUGS[path.basename(entry.name, extension)];
    if (!slug) throw new Error(`Aucun slug catalogue pour le fichier « ${entry.name} » — ajouter l'entrée dans CATEGORY_SLUGS.`);
    return { file: entry.name, slug, extension: extension.toLowerCase(), baseName: path.basename(entry.name, extension) };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const missingSlugs = Object.values(CATEGORY_SLUGS).filter(
  (slug) => !entries.some((entry) => entry.slug === slug),
);
if (missingSlugs.length) throw new Error(`Aucun visuel pour les catégories : ${missingSlugs.join(", ")}`);

const manifest = await readManifest();
const uploaded = [];
let reused = 0;

for (const entry of entries) {
  const contentType = CONTENT_TYPES[entry.extension];
  const data = await readFile(path.join(IMAGE_DIR, entry.file));
  const sha256 = createHash("sha256").update(data).digest("hex");
  const previous = manifest[entry.slug];

  if (
    !FORCE &&
    previous?.key &&
    previous.sha256 === sha256 &&
    (await exists(previous.key))
  ) {
    reused++;
    uploaded.push({ ...previous, file: entry.file, reused: true });
    continue;
  }

  if (VERIFY_ONLY) {
    uploaded.push({
      slug: entry.slug, file: entry.file, key: previous?.key ?? null,
      url: previous?.url ?? null, contentType, bytes: data.length, sha256,
      verified: previous?.key ? await exists(previous.key) : false, reused: false,
    });
    continue;
  }

  const key = storageKeyFor(entry.slug, entry.extension);
  const url = await upload(key, data, contentType);
  const record = { slug: entry.slug, file: entry.file, key, url, contentType, bytes: data.length, sha256 };
  manifest[entry.slug] = record;
  uploaded.push({ ...record, reused: false });
  console.log(`↑ ${entry.file} -> ${url}`);
}

if (!VERIFY_ONLY) {
  const ordered = Object.fromEntries(uploaded.map((entry) => [entry.slug, entry]));
  await writeFile(MANIFEST_PATH, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");
}

const failures = [];
for (const entry of uploaded) {
  if (!entry.url) {
    failures.push(`${entry.slug}: aucune URL`);
    continue;
  }
  if (!(await exists(entry.key))) failures.push(`${entry.slug}: objet non lisible (${entry.url})`);
}

console.log(`\nLot: ${uploaded.length} visuels (${reused} réutilisés, ${uploaded.length - reused} téléversés)`);
console.log(`Bucket: ${forgeUrl}`);
console.log(`Manifeste: ${path.relative(process.cwd(), MANIFEST_PATH)}`);
for (const entry of uploaded) console.log(`  ${entry.slug.padEnd(32)} ${entry.url}`);
console.log(`OK: ${uploaded.length - failures.length}/${uploaded.length}`);
if (failures.length) {
  console.error(`ÉCHECS:\n${failures.join("\n")}`);
  process.exit(3);
}