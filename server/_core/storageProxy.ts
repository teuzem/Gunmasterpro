import fs from "node:fs";
import path from "node:path";
import type { Express, Response } from "express";
import { ENV } from "./env";
import { LOCAL_MEDIA_URL_PREFIX, isLocalStorage, localMediaPath } from "../storage";

const LOCAL_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".avif": "image/avif",
  ".gif": "image/gif",
};

function serveLocalFile(res: Response, relKey: string): boolean {
  let filePath: string;
  try {
    filePath = localMediaPath(relKey);
  } catch {
    return false;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  res.sendFile(filePath, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": LOCAL_CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    },
  });
  return true;
}

export function registerStorageProxy(app: Express) {
  // Médias auto-hébergés : /media/* sur le volume persistant du conteneur.
  app.get(`${LOCAL_MEDIA_URL_PREFIX}*`, async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || !serveLocalFile(res, key)) res.status(404).send("Media not found");
  });

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Migration progressive : un fichier local homonyme prime sur le cloud.
    if (serveLocalFile(res, key)) return;

    // Mode local : aucun service externe n'est configuré, l'objet n'existe pas
    // localement, donc 404 honnête plutôt qu'une erreur 500.
    if (isLocalStorage() || !ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(404).send("Media not found");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
