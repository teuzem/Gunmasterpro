import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { homeHeroSlides, catalogueCategories, products } from "../drizzle/schema";

// Vérifie que chaque URL média du catalogue répond réellement, puis bascule
// products.mediaTransferState à 'complete' UNIQUEMENT si 100% des visuels
// répondent. Idempotent et non régressif : ne touche jamais aux lignes déjà
// 'complete', ne supprime rien.
//
// Les visuels sont servis par l'application elle-même (/media/* sur le volume
// persistant) : le contrôle passe par l'URL publique du déploiement.
//
// Usage : pnpm exec tsx scripts/verify-media.ts [--base http://127.0.0.1:4101]
const base = (process.argv.find((a) => a.startsWith("--base="))?.slice(7) || "http://127.0.0.1:4101").replace(/\/$/, "");

const MEDIA_PREFIXES = ["/media/", "/manus-storage/"];

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL absent ou base inaccessible.");
  const urls = new Set<string>();
  for (const p of await db.select({ imageUrl: products.imageUrl, gallery: products.gallery }).from(products)) {
    if (MEDIA_PREFIXES.some((prefix) => p.imageUrl.startsWith(prefix))) urls.add(p.imageUrl);
    // MariaDB local renvoie JSON en TEXT : parser si besoin (MySQL 8.4 prod parse nativement).
    let gal: string[] = [];
    try {
      gal = Array.isArray(p.gallery) ? p.gallery : JSON.parse((p.gallery as unknown as string) ?? "[]");
    } catch { gal = []; }
    for (const g of gal) if (typeof g === "string" && MEDIA_PREFIXES.some((prefix) => g.startsWith(prefix))) urls.add(g);
  }
  for (const c of await db.select({ imageUrl: catalogueCategories.imageUrl }).from(catalogueCategories)) {
    if (MEDIA_PREFIXES.some((prefix) => c.imageUrl.startsWith(prefix))) urls.add(c.imageUrl);
  }
  for (const h of await db.select({ imageUrl: homeHeroSlides.imageUrl }).from(homeHeroSlides)) {
    if (MEDIA_PREFIXES.some((prefix) => h.imageUrl.startsWith(prefix))) urls.add(h.imageUrl);
  }
  const list = Array.from(urls);
  console.log(`${list.length} visuels uniques à contrôler via ${base} (24 flux parallèles) ...`);
  const broken: string[] = [];
  let done = 0;
  async function checkOne(url: string) {
    try {
      // GET + Range : permet de contrôler un octet sans télécharger le fichier.
      const res = await fetch(base + url, { redirect: "follow", headers: { Range: "bytes=0-0" } });
      if (res.status !== 200 && res.status !== 206) broken.push(`${url} (HTTP ${res.status})`);
      try { await res.arrayBuffer(); } catch { /* corps ignoré */ }
    } catch (e) {
      broken.push(`${url} (${String(e).slice(0, 120)})`);
    }
    done++;
    if (done % 200 === 0) console.log(`... ${done}/${list.length}`);
  }
  const CONCURRENCY = 24;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    await Promise.all(list.slice(i, i + CONCURRENCY).map(checkOne));
  }
  console.log(`Contrôle terminé : ${done}/${list.length}`);
  console.log(`OK: ${list.length - broken.length}/${list.length} — cassés: ${broken.length}`);
  if (broken.length) {
    console.log(broken.slice(0, 20).join("\n"));
    console.error("STOP : bascule refusée — corriger les visuels manquants avant d'activer.");
    process.exit(3);
  }
  await db.update(products).set({ mediaTransferState: "complete" }).where(sql`mediaTransferState != 'complete'`);
  console.log("Activation : products.mediaTransferState='complete' appliqué.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
