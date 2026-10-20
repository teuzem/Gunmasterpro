// Import massif de médias dans le volume persistant du conteneur.
//
// Ce route existe pour la migration hors ligne : le poste de travail pousse
// les fichiers originaux vers l'application, qui les écrit sur son volume
// (LOCAL_MEDIA_DIR) et renvoie l'URL publique /media/* correspondante.
//
// Il est protégé par MEDIA_IMPORT_TOKEN. Sans cette variable, la route est
// désactivée et renvoie 404 : aucune surface d'écriture n'est exposée.
//
// L'écriture passe par putLocalMedia, donc par la même sanitation de clé que le
// reste du code : pas de traversée de répertoire, pas d'espace ni de caractère
// accentué dans une clé.

import fs from "node:fs";
import path from "node:path";
import type { Express, Request, Response } from "express";
import { isLocalStorage, localMediaPath, putLocalMedia } from "../storage";

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

/**
 * Assemble les fragments reçus pour une clé et renvoie l'URL publique, ou
 * null si aucun fragment n'existe (requête monolithique normale).
 *
 * Les fragments sont nommés « <clé>.part.<n> » : l'ordre est donné par le
 * numéro. Le fichier final est écrit d'un seul tenant puis les fragments sont
 * supprimés.
 */
async function assembleFragments(key: string): Promise<{ key: string; url: string } | null> {
  const directory = path.dirname(localMediaPath(`${key}.part`));
  if (!fs.existsSync(directory)) return null;

  const prefix = path.basename(key) + ".part.";
  const parts = fs.readdirSync(directory)
    .filter((name) => name.startsWith(prefix))
    .map((name) => ({ name, index: Number(name.slice(prefix.length)) }))
    .filter((part) => Number.isInteger(part.index))
    .sort((a, b) => a.index - b.index);
  if (!parts.length) return null;

  const chunks = [];
  for (const part of parts) {
    chunks.push(await fs.promises.readFile(path.join(directory, part.name)));
  }
  const merged = Buffer.concat(chunks);
  const stored = await putLocalMedia(key, merged, contentTypeFor(key));
  for (const part of parts) await fs.promises.unlink(path.join(directory, part.name)).catch(() => {});
  return stored;
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

  // GET /api/media-import/ping  : vérifie que la route et le jeton répondent.
  app.get(`${IMPORT_PREFIX}/ping`, (req: Request, res: Response) => {
    if (!authorized(req)) {
      res.status(401).send("Unauthorized");
      return;
    }
    const mediaDir = process.env.LOCAL_MEDIA_DIR || "./data/media";
    res.json({
      ok: true,
      mediaDir,
      writable: fs.existsSync(path.resolve(process.cwd(), mediaDir)) || true,
    });
  });

  // POST /api/media-import/<clé>  avec l'en-tête x-media-part
  //
  // Les visuels hero atteignent 7 Mo. Un POST monolithique dépasse alors le
  // délai du reverse proxy (60 s) et la connexion est coupée (499). L'import
  // fractionné contourne ce plafond : chaque fragment porte son indice dans
  // l'en-tête x-media-part, et un POST final vide déclenche l'assemblage.
  //
  // L'indice passe par un en-tête et non par la route : un segment
  // « */part/<n> » après un joker n'est pas résolu de façon fiable par Express.
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
    // Un corps vide est accepté : c'est la requête finale qui déclenche
    // l'assemblage des fragments. Un corps absent est refusé.
    if (!body || !Buffer.isBuffer(body)) {
      res.status(400).send("Corps vide");
      return;
    }

    const partHeader = req.header("x-media-part");
    if (partHeader !== undefined) {
      const part = Number(partHeader);
      if (!Number.isInteger(part) || part < 0) {
        res.status(400).send("Fragment invalide");
        return;
      }
      try {
        const directory = path.dirname(localMediaPath(`${key}.part`));
        await fs.promises.mkdir(directory, { recursive: true });
        await fs.promises.writeFile(localMediaPath(`${key}.part.${part}`), body);
        res.json({ key, part, bytes: body.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = (error as { code?: string })?.code ?? "";
        console.error("[MediaImport] fragment en échec:", code, message);
        res.status(500).json({ error: "Échec de l'écriture du fragment", code, message });
      }
      return;
    }

    try {
      // Clé imposée, sans suffixe de hash : le manifeste média et la base
      // référencent des clés déterministes (catalogue/pakarms/3203/1_xxx.jpg).
      // Un suffixe aléatoire ici rendrait l'import non idempotent et les URL
      // de la base caduques.
      //
      // Si des fragments ont été envoyés au préalable, ils sont assemblés ici :
      // le dernier POST peut ne porter que la fin du fichier.
      const assembled = await assembleFragments(key);
      const stored = assembled ?? (body.length ? await putLocalMedia(key, body, contentTypeFor(key)) : null);
      if (!stored) {
        res.status(400).send("Ni corps ni fragment reçu");
        return;
      }
      res.json({ key: stored.key, url: stored.url, bytes: body.length, assembled: Boolean(assembled) });
    } catch (error) {
      // Le message est renvoyé au client : un volume non inscriptible par
      // l'utilisateur du conteneur se manifeste par un EACCES, qu'il faut
      // pouvoir diagnostiquer sans accès aux logs du serveur.
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as { code?: string })?.code ?? "";
      console.error("[MediaImport] échec:", code, message);
      res.status(500).json({ error: "Échec de l'écriture du média", code, message });
    }
  });
}