import { describe, expect, it } from "vitest";
import snapshot from "./data/catalogue.snapshot.json";
import { MEDIA_FALLBACK_URL, withMediaFallback } from "./catalogueRepository";

type CatalogueRecord = {
  slug: string;
  priceCents: number;
  referencePriceCents: number;
  description: string;
  specifications: Record<string, string>;
  imageUrl: string;
  gallery: string[];
};

const catalogue = snapshot as CatalogueRecord[];

describe("catalogue source validé", () => {
  it("contient les 239 références et des champs descriptifs exploitables", () => {
    expect(catalogue).toHaveLength(239);
    expect(catalogue.every((product) => product.description.length > 0 && Object.keys(product.specifications).length > 0)).toBe(true);
  });

  it("conserve les deux références prioritaires à 1 500 €", () => {
    for (const sourceId of ["9539", "9591"]) {
      const product = catalogue.find((entry) => entry.slug.endsWith(`-${sourceId}`));
      expect(product).toBeDefined();
      expect(product?.priceCents).toBe(150_000);
      expect(product?.referencePriceCents).toBe(150_000);
      expect(product?.description.length).toBeGreaterThan(300);
      expect(product?.gallery.length).toBeGreaterThan(0);
    }
  });
});

describe("repli des médias", () => {
    it("remplace uniquement les médias non transférés par le visuel de repli local", () => {
    const pending = withMediaFallback({ imageUrl: "/legacy.jpg", gallery: ["/legacy.jpg"], mediaTransferState: "pending" });
    const complete = withMediaFallback({ imageUrl: "/manus-storage/ready.jpg", gallery: ["/manus-storage/ready.jpg"], mediaTransferState: "complete" });

    expect(pending.imageUrl).toBe(MEDIA_FALLBACK_URL);
    expect(pending.gallery).toEqual([MEDIA_FALLBACK_URL]);
    expect(complete.imageUrl).toBe("/manus-storage/ready.jpg");
  });
});
