// Stockage des médias.
//
// Deux modes, choisis par les variables d'environnement :
//
//  - LOCAL (défaut) : les fichiers sont écrits sur le disque du conteneur,
//    dans LOCAL_MEDIA_DIR (volume persistant Coolify), et servis par le proxy
//    /media/*. Aucune dépendance externe : ni S3, ni Manus, ni Forge.
//    C'est le mode utilisé en production.
//
//  - FORGE : le mode historique, qui délègue le stockage à Manus Forge/S3 via
//    des URL pré-signées. Sélectionné uniquement si BUILT_IN_FORGE_API_URL et
//    BUILT_IN_FORGE_API_KEY sont renseignés ET MEDIA_STORAGE_MODE n'est pas
//    explicitement « local ».
//
// Le mode local est prioritaire quand MEDIA_STORAGE_MODE=local : c'est ce qu'un
// déploiement auto-hébergé souhaite, même si des variables Forge traînent dans
// l'environnement.

import fs from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";

export const LOCAL_MEDIA_URL_PREFIX = "/media/";
export const localMediaDir = () => process.env.LOCAL_MEDIA_DIR || "./data/media";

/**
 * Mode de stockage effectif.
 * - "local"  : disque du conteneur (volume persistant), servi via /media/*
 * - "forge"  : Manus Forge / S3, servi via /manus-storage/*
 */
export function storageMode(): "local" | "forge" {
  const forced = (process.env.MEDIA_STORAGE_MODE || "").trim().toLowerCase();
  if (forced === "local") return "local";
  if (forced === "forge") return "forge";
  return ENV.forgeApiUrl && ENV.forgeApiKey ? "forge" : "local";
}

export const isLocalStorage = () => storageMode() === "local";
export const isForgeConfigured = () => storageMode() === "forge";

/** Préfixe d'URL public correspondant au mode courant. */
export const mediaUrlPrefix = () => (isLocalStorage() ? LOCAL_MEDIA_URL_PREFIX : "/manus-storage/");

function sanitizeLocalKey(relKey: string): string {
  const key = normalizeKey(relKey).replace(/\\/g, "/");
  if (!key || key.startsWith("/") || key.split("/").includes("..")) {
    throw new Error("Clé de stockage invalide.");
  }
  return key;
}

export function localMediaPath(relKey: string): string {
  return path.resolve(process.cwd(), localMediaDir(), sanitizeLocalKey(relKey));
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Écrit un média sur le disque local et renvoie son URL publique /media/*.
 * La clé est normalisée (pas d'espace ni de caractère accentué : ces caractères
 *cassent l'URL et le pré-signage).
 */
export async function putLocalMedia(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const key = sanitizeLocalKey(relKey);
  const filePath = localMediaPath(key);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array));
  return { key, url: `${LOCAL_MEDIA_URL_PREFIX}${key}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  // Mode local : écriture directe sur le volume persistant.
  if (isLocalStorage()) {
    const key = appendHashSuffix(sanitizeLocalKey(relKey));
    return putLocalMedia(key, data, contentType);
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `${mediaUrlPrefix()}${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  if (isLocalStorage()) {
    // En mode local, l'URL publique est directe : pas de signature à produire.
    return `${mediaUrlPrefix()}${normalizeKey(relKey)}`;
  }
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
