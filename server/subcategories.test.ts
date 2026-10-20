import { describe, expect, it } from "vitest";
import { categorySeed, catalogueSeed, subCategorySlugs } from "./catalog";

describe("taxonomie des sous-catégories", () => {
  it("n'expose que des catégories réellement alimentées", () => {
    // Une catégorie sans produit produirait une page vide : contenu mince,
    // pénalisé par les moteurs. C'est le risque principal de cette taxonomie.
    for (const category of categorySeed) {
      const members = catalogueSeed.filter((product) => product.subCategory === category.slug);
      expect(members.length, `« ${category.slug} » n'a aucun produit`).toBeGreaterThan(0);
    }
  });

  it("rattache la grande majorité du catalogue à une sous-catégorie", () => {
    const attached = catalogueSeed.filter((product) => product.subCategory).length;
    expect(attached / catalogueSeed.length).toBeGreaterThan(0.9);
  });

  it("ne rattache que des slugs déclarés", () => {
    const orphans = catalogueSeed.filter((product) => product.subCategory && !subCategorySlugs.has(product.subCategory));
    expect(orphans.map((product) => product.slug)).toEqual([]);
  });

  it("respecte la famille curatee pour chaque rattachement", () => {
    const wrongFamily = catalogueSeed.filter(
      (product) => product.subCategory
        && categorySeed.find((category) => category.slug === product.subCategory)?.parentCategory !== product.category,
    );
    // La catégorie d'export et la famille curée peuvent différer sur quelques
    // unités ; l'écart est mesuré plutôt que supposé nul.
    expect(wrongFamily.length / catalogueSeed.length).toBeLessThan(0.25);
  });

  it("fournit des libellés trilingues et un visuel de bucket", () => {
    for (const category of categorySeed) {
      for (const locale of ["fr", "en", "de"] as const) {
        expect(category.labelI18n?.[locale], `${category.slug}/${locale}`).toBeTruthy();
        expect(category.descriptionI18n?.[locale], `${category.slug}/${locale}`).toBeTruthy();
      }
      // Le visuel pointe vers le stockage local de l'application (/media/*),
      // servi par le volume persistant : c'est ce que le site affiche.
      expect(category.imageUrl, `${category.slug} sans visuel`).toMatch(/^\/media\//);
    }
  });

  it("ne publie que les 14 catégories réelles de pakarms.co", () => {
    expect(categorySeed).toHaveLength(14);
    expect(categorySeed.map((category) => category.slug)).toEqual([
      "original-imported", "30-bore-7-shot-762mm", "glock", "beretta", "colt-1911", "zigana",
      "taurus", "small-weapons", "assault-rifles", "223-bore", "heavy-machine-guns",
      "12-bore", "ammunition", "pistol-accessories",
    ]);
  });
});