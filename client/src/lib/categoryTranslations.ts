export type CategoryLocale = "fr" | "en" | "de";

const labels: Record<CategoryLocale, Record<string, string>> = {
  fr: {
    "semi-auto-handguns": "Pistolets semi-automatiques", revolvers: "Revolvers", "single-shot-handguns": "Armes de poing mono-coup", "other-handguns": "Autres armes de poing",
    "semi-auto-rifles": "Carabines semi-automatiques", "bolt-action-rifles": "Carabines à verrou", "lever-action-rifles": "Carabines à levier", "pump-action-rifles": "Carabines à pompe", "single-shot-rifles": "Carabines mono-coup", "other-rifles": "Autres carabines",
    "semi-auto-shotguns": "Fusils semi-automatiques", "pump-action-shotguns": "Fusils à pompe", "side-by-side-shotguns": "Fusils juxtaposés", "over-under-shotguns": "Fusils superposés", "single-shot-shotguns": "Fusils mono-coup", "other-shotguns": "Autres fusils",
    accessories: "Accessoires", magazines: "Chargeurs", optics: "Optiques", suppressors: "Modérateurs de son", "collectible-firearms": "Armes de collection", "black-powder-muzzleloaders": "Poudre noire & armes à chargement", "other-accessories": "Autres accessoires",
  },
  en: {
    "semi-auto-handguns": "Semi-automatic handguns", revolvers: "Revolvers", "single-shot-handguns": "Single-shot handguns", "other-handguns": "Other handguns",
    "semi-auto-rifles": "Semi-automatic rifles", "bolt-action-rifles": "Bolt-action rifles", "lever-action-rifles": "Lever-action rifles", "pump-action-rifles": "Pump-action rifles", "single-shot-rifles": "Single-shot rifles", "other-rifles": "Other rifles",
    "semi-auto-shotguns": "Semi-automatic shotguns", "pump-action-shotguns": "Pump-action shotguns", "side-by-side-shotguns": "Side-by-side shotguns", "over-under-shotguns": "Over-under shotguns", "single-shot-shotguns": "Single-shot shotguns", "other-shotguns": "Other shotguns",
    accessories: "Accessories", magazines: "Magazines", optics: "Optics", suppressors: "Sound moderators", "collectible-firearms": "Collectible firearms", "black-powder-muzzleloaders": "Black powder & muzzleloaders", "other-accessories": "Other accessories",
  },
  de: {
    "semi-auto-handguns": "Selbstladepistolen", revolvers: "Revolver", "single-shot-handguns": "Einzellader-Kurzwaffen", "other-handguns": "Weitere Kurzwaffen",
    "semi-auto-rifles": "Selbstladebüchsen", "bolt-action-rifles": "Repetierbüchsen", "lever-action-rifles": "Unterhebelrepetierer", "pump-action-rifles": "Vorderschaftrepetierer", "single-shot-rifles": "Einzellader-Büchsen", "other-rifles": "Weitere Büchsen",
    "semi-auto-shotguns": "Selbstladeflinten", "pump-action-shotguns": "Vorderschaftflinten", "side-by-side-shotguns": "Doppelflinten", "over-under-shotguns": "Bockflinten", "single-shot-shotguns": "Einzelladerflinten", "other-shotguns": "Weitere Flinten",
    accessories: "Zubehör", magazines: "Magazine", optics: "Optik", suppressors: "Schalldämpfer", "collectible-firearms": "Sammlerwaffen", "black-powder-muzzleloaders": "Schwarzpulver & Vorderlader", "other-accessories": "Weiteres Zubehör",
  },
};

export const categoryCopy: Record<CategoryLocale, { eyebrow: string; title: string; body: string; browse: string; explore: string }> = {
  fr: { eyebrow: "Explorer par famille", title: "Trouvez votre point de départ.", body: "Des catégories structurées pour parcourir rapidement les formats, les pratiques et les équipements associés.", browse: "Toutes les catégories", explore: "Explorer" },
  en: { eyebrow: "Browse by family", title: "Find your starting point.", body: "Structured categories to quickly browse formats, practices and related equipment.", browse: "All categories", explore: "Explore" },
  de: { eyebrow: "Nach Kategorie", title: "Finden Sie Ihren Einstieg.", body: "Strukturierte Kategorien für Formate, Anwendungen und passende Ausrüstung.", browse: "Alle Kategorien", explore: "Entdecken" },
};

export function categoryLabel(locale: CategoryLocale, slug: string, fallback: string) {
  return labels[locale][slug] ?? fallback;
}
