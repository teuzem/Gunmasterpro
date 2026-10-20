import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("stockage média local autonome", () => {
  it("ne dépend plus de Manus ni de Forge par défaut", () => {
    const storage = read("server/storage.ts");
    // Le mode doit être « local » par défaut, et le mode Forge seulement
    // selected explicitement ou si les variables Forge sont présentes.
    expect(storage).toContain('MEDIA_STORAGE_MODE');
    expect(storage).toContain('return ENV.forgeApiUrl && ENV.forgeApiKey ? "forge" : "local"');
    expect(storage).toContain('export const LOCAL_MEDIA_URL_PREFIX = "/media/"');
  });

  it("sert les médias locaux sur /media/* sans service externe", () => {
    const proxy = read("server/_core/storageProxy.ts");
    expect(proxy).toContain("LOCAL_MEDIA_URL_PREFIX");
    // En mode local, une clé absente doit renvoyer 404 et non 500 : un 502 ou 500
    // sur /manus-storage/*cassait le rendu des pages produit.
    expect(proxy).toContain('res.status(404).send("Media not found")');
  });

  it("protège l'import massif par jeton", () => {
    const importer = read("server/_core/mediaImport.ts");
    expect(importer).toContain("MEDIA_IMPORT_TOKEN");
    expect(importer).toContain("x-media-import-token");
    // Sans jeton configuré, la route doit être désactivée.
    expect(importer).toContain('res.status(404).send("Not found")');
    // La clé est validée : aucune traversée de répertoire.
    expect(importer).toContain("SAFE_KEY");
    expect(importer).toContain('segment !== ".."');
  });

  it("déclare le parseur binaire avant express.json", () => {
    const index = read("server/_core/index.ts");
    // Les positions se calculent sur les appels, pas sur les commentaires :
    // « express.json( » apparaît aussi dans une phrase d'explication.
    const rawAt = index.indexOf('app.use("/api/media-import", express.raw(');
    const jsonAt = index.indexOf("app.use(express.json(");
    expect(rawAt).toBeGreaterThan(-1);
    expect(jsonAt).toBeGreaterThan(-1);
    // express.json() consomme le flux et rejette un corps binaire : l'ordre
    // des parseurs est donc critique, pas cosmétique.
    expect(rawAt).toBeLessThan(jsonAt);
  });

  it("n'écrit plus d'URL /manus-storage/ dans les données du catalogue", () => {
    const snapshot = JSON.parse(read("server/data/catalogue.snapshot.json", "utf8"));
    const categories = JSON.parse(read("server/data/subcategories.json", "utf8"));

    const remoteProducts = snapshot.filter((product: { imageUrl: string }) => product.imageUrl.startsWith("/manus-storage/"));
    const remoteGallery = snapshot.reduce(
      (total: number, product: { gallery?: string[] }) =>
        total + (product.gallery ?? []).filter((url) => url.startsWith("/manus-storage/")).length,
      0,
    );
    const remoteCategories = categories.filter((category: { imageUrl: string }) => category.imageUrl.startsWith("/manus-storage/"));

    expect(remoteProducts.map((product: { slug: string }) => product.slug)).toEqual([]);
    expect(remoteGallery).toBe(0);
    expect(remoteCategories).toEqual([]);
  });

  it("donne à chaque produit un visuel local et une galerie non vide", () => {
    const snapshot = JSON.parse(read("server/data/catalogue.snapshot.json", "utf8"));
    for (const product of snapshot) {
      expect(product.imageUrl.startsWith("/media/"), `${product.slug} sans visuel local`).toBe(true);
      expect((product.gallery ?? []).length, `${product.slug} sans galerie`).toBeGreaterThan(0);
      for (const url of product.gallery ?? []) {
        expect(url.startsWith("/media/"), `${product.slug} : ${url}`).toBe(true);
      }
    }
  });

  it("aligne les visuels hero du repli client sur le stockage local", () => {
    const hero = read("client/src/lib/homeHeroContent.ts");
    expect(hero).not.toContain("/manus-storage/");
    expect(hero).toContain("/media/hero/");
  });
});