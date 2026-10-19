import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createCatalogueExport, validateCatalogueImportRows } from "./catalogueTransfer";

// Ces deux cas lisent des produits **persistés** : ils exigent une base MySQL
// réelle, migrée et contenant au moins deux produits.
//
// Ils ne doivent jamais dépendre de la seule présence de DATABASE_URL.
// Coolify injecte les variables de la ressource dans l'étape de build Docker :
// le test tentait donc une connexion vers une base migrée, échouait, et
// `RUN pnpm check && pnpm test && pnpm build` faisait échouer tout le
// déploiement (build rouge, aucun conteneur).
//
// Activation explicite, uniquement quand une base migrée est disponible :
//   Linux/macOS : RUN_DB_TESTS=true pnpm test
//   Windows      : $env:RUN_DB_TESTS='true'; pnpm test
const runDatabaseTests = process.env.RUN_DB_TESTS === "true";
const describeWithDatabase = runDatabaseTests ? describe : describe.skip;

describeWithDatabase("centre de transfert catalogue", () => {
  it("génère un modèle Excel réel, filtrable et prérempli à partir de deux produits persistants", async () => {
    const payload = await createCatalogueExport("xlsx", true);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(payload.base64, "base64"));
    const sheet = workbook.getWorksheet("Catalogue");

    expect(payload.fileName).toMatch(/^modele-catalogue-.*\.xlsx$/);
    expect(payload.contentType).toContain("spreadsheetml");
    expect(payload.rowCount).toBe(2);
    expect(workbook.getWorksheet("Lire avant import")).toBeDefined();
    expect(sheet).toBeDefined();
    expect(sheet?.rowCount).toBe(3);
    expect(sheet?.getCell("A1").value).toBe("catalogueId");
    expect(sheet?.getColumn(4).width).toBeGreaterThan(20);
    expect(sheet?.autoFilter).toBeDefined();
  });

  it("produit des sauvegardes CSV et JSON cohérentes et bloque les lignes invalides avant toute écriture", async () => {
    const [csv, json] = await Promise.all([createCatalogueExport("csv", true), createCatalogueExport("json", true)]);
    expect(Buffer.from(csv.base64, "base64").toString("utf8")).toContain("catalogueId");
    expect(JSON.parse(Buffer.from(json.base64, "base64").toString("utf8")).rows).toHaveLength(2);
    const validation = await validateCatalogueImportRows([{ slug: "invalid", name: "Produit", brand: "Marque", category: "handguns", subCategory: "pistols", manufacturer: "Marque", model: "Modele", excerpt: "Texte", description: "Texte de description", referencePriceEUR: 10, priceEUR: 20, stock: 1, caliber: "9 mm", material: "Acier", capacity: "10", action: "Semi", barrelLength: "100 mm", overallLength: "180 mm", weight: "700 g", imageUrl: "not-a-url", galleryJson: "{}", specificationsJson: "[]" }], "create");
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(2);
  });
});
