import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");
const home = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const productDetail = readFileSync(resolve(projectRoot, "client/src/pages/ProductDetail.tsx"), "utf8");
const storefront = readFileSync(resolve(projectRoot, "client/src/components/storefront.tsx"), "utf8");
const reviewPanel = readFileSync(resolve(projectRoot, "client/src/components/ReviewPanel.tsx"), "utf8");
const adminConsole = readFileSync(resolve(projectRoot, "client/src/pages/AdminConsole.tsx"), "utf8");
const catalogueTransfer = readFileSync(resolve(projectRoot, "client/src/components/AdminCatalogueTransfer.tsx"), "utf8");
const categorySection = home.slice(home.indexOf('<section id="categories"'));

describe("régressions visuelles du storefront", () => {
  it("charge les visuels des catégories sans différer leur première apparition", () => {
    expect(categorySection).toContain('decoding="async"');
    expect(categorySection).not.toContain('loading="lazy"');
    expect(categorySection).toContain("object-cover");
  });

  it("contraint les titres et le header à la largeur disponible", () => {
    expect(productDetail).toContain("product-detail-title");
    expect(css).toContain(".product-detail-title");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain(".gmp-header { overflow-x: clip; }");
    expect(css).toContain(".section-title { overflow-wrap: anywhere; text-wrap: balance; white-space: normal; }");
  });

  it("préserve des panneaux de recherche et d’achat lisibles sur mobile et en thème clair", () => {
    expect(css).toContain(".mobile-search-panel { bottom: .5rem;");
    expect(css).toContain(".product-purchase-panel .text-slate-100");
    expect(css).toContain("body:has(.product-detail-page) .gmp-chat-stack");
    expect(css).toContain("html:not(.dark) .geo-language-prompt, html:not(.dark) .age-gate-card");
    expect(storefront).toContain("cart-drawer-panel");
    expect(storefront).toContain("checkout-modal-panel");
    expect(css).toContain("html:not(.dark) .cart-drawer-panel");
    expect(css).toContain("html:not(.dark) .checkout-modal-panel");
    expect(css).toContain("body.gmp-engagement-open .geo-language-prompt");
    expect(css).toContain(".gmp-header .header-theme-trigger { display: none !important; }");
    expect(reviewPanel).toContain("review-lightbox-layer");
    expect(css).toContain("body:has(.review-lightbox-layer) .geo-language-prompt");
    expect(css).toContain(".engagement-card { left: 1rem; margin: 0 auto; max-height: calc(100dvh - 6rem);");
  });

  it("garde le reset du filtre accessible et le titre de l’aperçu rapide adaptable", () => {
    const catalogue = readFileSync(resolve(projectRoot, "client/src/pages/Catalogue.tsx"), "utf8");
    expect(catalogue).toContain('className="category-filter-reset-sticky"');
    expect(catalogue).toContain("onClick={reset}");
    expect(css).toContain(".category-filter-reset-sticky");
    expect(css).toContain("html:not(.dark) .category-filter-reset-sticky");
    expect(css).toContain(".quick-preview-title");
    expect(css).toContain("white-space: nowrap");
  });

  it("anime l’aperçu rapide et expose partage/favori avec un état de focus", () => {
    expect(storefront).toContain("quick-preview-actions");
    expect(storefront).toContain("wishToggle.mutate({ productId: product.id })");
    expect(storefront).toContain("navigator.share");
    expect(css).toContain("quick-preview-modal-in");
    expect(css).toContain(".quick-preview-action:hover, .quick-preview-action:focus-visible");
    expect(css).toContain(".category-filter-reset-sticky:hover, .category-filter-reset-sticky:focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("présente le nom complet du produit sans sous-titre quick preview", () => {
    expect(storefront).not.toContain('<p className="eyebrow mt-3">{t.actions.quickPreview}</p>');
    expect(storefront).toContain("La référence ${product.name} en détail");
    expect(css).toContain("white-space: normal !important");
    expect(css).toContain("overflow: visible !important");
    expect(css).toContain("scrollbar-width: none");
    expect(css).toContain("quick-preview-title.is-very-long");
    expect(css).toContain("Quick preview: keep touch, wheel and keyboard scrolling without showing any scrollbar");
    expect(css).toContain(".quick-preview-modal { scrollbar-width: none");
    expect(css).not.toContain(".quick-preview-modal { scrollbar-width: thin");
  });

  it("ne rend plus de mentions de droits média dans les fiches publiques", () => {
    expect(productDetail).not.toContain("product-media-credit");
    expect(productDetail).not.toContain("mediaCredit:");
    expect(productDetail).not.toContain("mediaSource:");
    expect(productDetail).toContain("isInternalMediaOrSourceField");
    expect(productDetail).toContain("provenance|licen[cs]e|rights|droit|taric");
  });

  it("garde le premier rendu de l’AgeGate identique entre SSR et client", () => {
    expect(storefront).toContain('const [open, setOpen] = useState(false);');
    expect(storefront).toContain('setOpen(isAgeGateRequired(import.meta.env.DEV, window.location.search, localStorage.getItem("gmp-age-verified") === "true"));');
    expect(storefront).not.toContain('useState(() => typeof window === "undefined" ? false : isAgeGateRequired');
  });

  it("construit une administration thémable et centrée sur les données persistantes", () => {
    expect(adminConsole).toContain("trpc.admin.products.list");
    expect(adminConsole).toContain("trpc.admin.users.updateStatus");
    expect(adminConsole).toContain("trpc.admin.locations.overview");
    expect(adminConsole).toContain("updateProduct.mutate({ productId: id, ...product })");
    expect(adminConsole).toContain("trpc.admin.categories.create.useMutation");
    expect(adminConsole).toContain("updateCategory.mutate({ categoryId: id, ...category })");
    expect(adminConsole).toContain("Catégories persistantes");
    expect(adminConsole).toContain("Recherche catalogue avancée");
    expect(adminConsole).toContain("function AdminAccessPortal");
    expect(adminConsole).toContain("function SuperAdminGovernance");
    expect(adminConsole).toContain("function AdministratorRolePanel");
    expect(adminConsole).toContain('user?.role === "super_admin"');
    expect(adminConsole).toContain('tab.id !== "users" && tab.id !== "transfers"');
    expect(adminConsole).toContain("trpc.adminAccess.request.useMutation");
    expect(adminConsole).toContain("trpc.admin.governance.reviewAccessRequest.useMutation");
    expect(adminConsole).toContain("trpc.admin.governance.manageRole.useMutation");
    expect(adminConsole).toContain("Promouvoir super-admin");
    expect(adminConsole).toContain("ArrowDown");
    expect(adminConsole).toContain("function Mark");
    expect(adminConsole).toContain("bg-background");
    expect(adminConsole).toContain("bg-card");
    expect(adminConsole).toContain("AdminCatalogueTransfer");
    expect(catalogueTransfer).toContain("Sauvegarde et import sécurisé");
    expect(catalogueTransfer).toContain("Glissez votre fichier ici");
    expect(catalogueTransfer).toContain("Créer et mettre à jour");
    expect(catalogueTransfer).toContain("Prévalidation réussie");
  });
});
