// Attributions des visuels.
//
// Les visuels historiques proviennent de Wikimedia Commons sous licence CC BY
// ou CC BY-SA. Ces licences imposent l'attribution de l'auteur, la mention de
// la licence et, pour BY-SA, le partage dans les mêmes conditions. L'attribution
// doit donc être visible sur la fiche produit.
//
// Les autres visuels (export PAK Arms) ne sont pas des œuvres sous licence
// libre : aucune attribution n'est requise.

import { readFileSync } from "node:fs";
import path from "node:path";

export type MediaCredit = {
  author: string;
  license: string;
  source: string;
  title?: string;
};

export type ProductCredits = {
  /** Auteur, licence et source, par URL de visuel. */
  byUrl: Record<string, MediaCredit>;
  /** Mention courte, par exemple « Rude · CC BY-SA 3.0 ». */
  notices: string[];
};

type CreditEntry = { file: string; author: string; license: string; source: string; title?: string };

// Le fichier est lu au démarrage plutôt qu'importé : un JSON illisible ne
// doit pas empêcher le serveur de démarrer, et l'attribution n'est affichée que
// sur les fiches concernées.
function readCredits(): Record<string, CreditEntry[]> {
  try {
    const file = path.resolve(process.cwd(), "server/data/media-credits.json");
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, CreditEntry[]>;
  } catch (error) {
    console.warn("[MediaCredits] attributions illisibles :", (error as Error)?.message);
    return {};
  }
}

const bySlug = readCredits();

const creditsBySlug = new Map<string, ProductCredits>();
for (const [slug, entries] of Object.entries(bySlug)) {
  const byUrl: Record<string, MediaCredit> = {};
  const notices: string[] = [];
  for (const entry of entries ?? []) {
    const url = `/media/catalogue/historique/${slug}/${entry.file}`;
    byUrl[url] = { author: entry.author, license: entry.license, source: entry.source, title: entry.title };
    const notice = `${entry.author} · ${entry.license}`;
    if (!notices.includes(notice)) notices.push(notice);
  }
  creditsBySlug.set(slug, { byUrl, notices });
}

/** Attributions d'une fiche, indexées par URL de visuel. */
export function productCredits(slug: string): ProductCredits | undefined {
  return creditsBySlug.get(slug);
}

/** Fiches disposant d'une attribution à afficher. */
export const creditedSlugs = Array.from(creditsBySlug.keys());
