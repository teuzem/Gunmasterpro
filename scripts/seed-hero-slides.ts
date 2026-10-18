import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { heroSlides as staticSlides, heroUi } from "../client/src/lib/homeHeroContent";
import { homeHeroSlides } from "../drizzle/schema";

// Seed idempotent des 20 slides hero éditoriales (FR/EN/DE) à partir du
// contenu statique validé. Relançable sans danger (upsert sur `position`).
async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL est absent ou la base de données n'est pas accessible.");
  const rows = staticSlides.map((slide, index) => ({
    position: index,
    targetPath: `/produit/${slide.product}`,
    storageKey: slide.image.replace(/^\/manus-storage\//, ""),
    imageUrl: slide.image,
    altText: { fr: heroUi.fr.imageAlt, en: heroUi.en.imageAlt, de: heroUi.de.imageAlt },
    eyebrow: { fr: slide.copy.fr.eyebrow, en: slide.copy.en.eyebrow, de: slide.copy.de.eyebrow },
    title: { fr: slide.copy.fr.title, en: slide.copy.en.title, de: slide.copy.de.title },
    description: { fr: slide.copy.fr.description, en: slide.copy.en.description, de: slide.copy.de.description },
    ctaLabel: { fr: slide.copy.fr.label, en: slide.copy.en.label, de: slide.copy.de.label },
    isActive: true,
  }));
  await db.insert(homeHeroSlides).values(rows).onDuplicateKeyUpdate({
    set: {
      targetPath: sql`VALUES(targetPath)`, storageKey: sql`VALUES(storageKey)`,
      imageUrl: sql`VALUES(imageUrl)`, altText: sql`VALUES(altText)`,
      eyebrow: sql`VALUES(eyebrow)`, title: sql`VALUES(title)`,
      description: sql`VALUES(description)`, ctaLabel: sql`VALUES(ctaLabel)`,
      isActive: sql`VALUES(isActive)`,
    },
  });
  console.log(`${rows.length} slides hero importées ou déjà présentes.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
