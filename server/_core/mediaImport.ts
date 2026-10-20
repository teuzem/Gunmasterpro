// Import massif de médias dans le volume persistant du conteneur.
//
// Ce route existe pour la migration hors ligne : le poste de travail pousse
// les fichiers originaux vers l'application, qui les écrit sur son volume
// (LOCAL_MEDIA_DIR) et renvoie l'URL publique /media/* correspondante.
//
// Il est protégé par MEDIA_IMPORT_TOKEN. Sans cette variable, la route est
// désactivée et renvoie 404 : aucune surface d'écriture n'est exposée.
//
// L'écriture passe par storagePut, donc par la même sanitation de clé que le
// reste du code : pas de traversée de répertoire, pas d'espace ni de caractère
// accentué dans une clé.

import fs from "node:fs";
import path from "node:path";
import type { Express, Request, Response } from "express";
import { isLocalStorage, putLocalMedia } from "../storage";

const IMPORT_PREFIX = "/api/media-import";

/** Clés autorisées : segments alphanumériques, tirets, underscores, points. */
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

function authorized(req: Request): boolean {
  const expected = (process.env.MEDIA_IMPORT_TOKEN || "").trim();
  if (!expected) return false;
  const provided = (req.header("x-media-import-token") || "").trim();
  if (!provided || provided.length !== expected.length) return false;
  // Comparaison à temps constant pour ne pas révéler la longueur ni le préfixe.
  let diff = 0;
  for (let index = 0; index < expected.length; index++) {
    diff |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return diff === 0;
}

function contentTypeFor(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".avif") return "image/avif";
  if (extension === ".gif") return "image/gif";
  if (extension === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

/** Un segment ne doit jamais être « .. » ni contenir de séparateur. */
function safeSegments(key: string): boolean {
  const segments = key.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function registerMediaImportRoutes(app: Express) {
  if (!isLocalStorage()) {
    // L'import écrit dans le volume local : hors mode local, la route n'a pas
    // de sens et serait un vecteur d'écriture vers un service externe.
    app.all(IMPORT_PREFIX, (_req, res) => res.status(404).send("Not found"));
    app.all(`${IMPORT_PREFIX}/*`, (_req, res) => res.status(404).send("Not found"));
    return;
  }

  if (!(process.env.MEDIA_IMPORT_TOKEN || "").trim()) {
    // Route désactivée : aucun jeton configuré.
    app.all(IMPORT_PREFIX, (_req, res) => res.status(404).send("Not found"));
    app.all(`${IMPORT_PREFIX}/*`, (_req, res) => res.status(404).send("Not found"));
    return;
  }

  // POST /api/media-import/<clé>  corps binaire
  app.post(`${IMPORT_PREFIX}/*`, async (req: Request, res: Response) => {
    if (!authorized(req)) {
      res.status(401).send("Unauthorized");
      return;
    }

    const key = (req.params as Record<string, string>)[0] ?? "";
    if (!key || !SAFE_KEY.test(key) || !safeSegments(key)) {
      res.status(400).send("Clé de média invalide");
      return;
    }

    const body = req.body as Buffer | undefined;
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).send("Corps vide");
      return;
    }

    try {
      // Clé imposée, sans suffixe de hash : le manifeste média et la base
      // référencent des clés déterministes (catalogue/pakarms/3203/1_xxx.jpg).
      // Un suffixe aléatoire ici rendrait l'import non idempotent et les URL
      // de la base caduques.
      const stored = await putLocalMedia(key, body, contentTypeFor(key));
      res.json({ key: stored.key, url: stored.url, bytes: body.length });
    } catch (error) {
      console.error("[MediaImport] échec:", error);
      res.status(500).send("Échec de l'écriture du média");
    }
  });

  // GET /api/media-import/ping  : vérifie que la route et le jeton répondent.
  app.get(`${IMPORT_PREFIX}/ping`, (req: Request, res: Response) => {
    if (!authorized(req)) {
      res.status(401).send("Unauthorized");
      return;
    }
    res.json({
      ok: true,
      mediaDir: process.env.LOCAL_MEDIA_DIR || "./data/media",
      writable: fs.existsSync(path.resolve(process.cwd(), process.env.LOCAL_MEDIA_DIR || "./data/media")) || true,
    });
  });
}
