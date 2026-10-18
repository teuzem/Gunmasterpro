import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const repository = vi.hoisted(() => ({
  addCollectionItem: vi.fn(),
  archiveCollection: vi.fn(),
  createCatalogueRequest: vi.fn(),
  createCollection: vi.fn(),
  deleteCollection: vi.fn(),
  listApprovedReviews: vi.fn(),
  listCatalogueRequestsForAdmin: vi.fn(),
  listCollections: vi.fn(),
  listHomeHeroSlides: vi.fn(),
  listReviewsForAdmin: vi.fn(),
  listSpecificationAuditsForAdmin: vi.fn(),
  listWishlist: vi.fn(),
  moderateReview: vi.fn(),
  moveCollectionItem: vi.fn(),
  recordCartActivity: vi.fn(),
  removeCollectionItem: vi.fn(),
  reorderCollectionItems: vi.fn(),
  submitReview: vi.fn(),
  subscribeNewsletter: vi.fn(),
  toggleWishlist: vi.fn(),
  trackCatalogueRequest: vi.fn(),
  unsubscribeNewsletter: vi.fn(),
  updateCatalogueRequestStatus: vi.fn(),
  updateCollection: vi.fn(),
  upsertProductSpecificationAudit: vi.fn(),
  uploadReviewMedia: vi.fn(),
}));

const adminRepository = vi.hoisted(() => ({
  createAdminCategory: vi.fn(),
  createAdminAccessRequest: vi.fn(),
  createAdminProduct: vi.fn(),
  deleteAdminCategory: vi.fn(),
  deleteAdminMedia: vi.fn(),
  deleteAdminProduct: vi.fn(),
  getAdminLocationOverview: vi.fn(),
  getAdminOverview: vi.fn(),
  getMyAdminAccessRequest: vi.fn(),
  getPlatformSettings: vi.fn(),
  listAdminCategories: vi.fn(),
  listAdminLocationHistory: vi.fn(),
  listAdminMedia: vi.fn(),
  listAdminNewsletterSubscriptions: vi.fn(),
  listAdminProducts: vi.fn(),
  listAdminAccessRequests: vi.fn(),
  listAdminUsers: vi.fn(),
  listAdminWorkflowEvents: vi.fn(),
  manageAdministratorRole: vi.fn(),
  recordLocationConsent: vi.fn(),
  updateAdminCategory: vi.fn(),
  updateAdminMedia: vi.fn(),
  updateAdminProduct: vi.fn(),
  reviewAdminAccessRequest: vi.fn(),
  updatePlatformSettings: vi.fn(),
  updateUserAccountStatus: vi.fn(),
  uploadAdminMedia: vi.fn(),
}));

const transferRepository = vi.hoisted(() => ({
  applyCatalogueImport: vi.fn(),
  createCatalogueExport: vi.fn(),
  validateCatalogueImportRows: vi.fn(),
}));

vi.mock("./commerceRepository", () => repository);
vi.mock("./adminRepository", () => adminRepository);
vi.mock("./catalogueTransfer", () => transferRepository);

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function context(role: "super_admin" | "admin" | "user" | null): TrpcContext {
  const user: AuthenticatedUser | null = role ? {
    id: role === "super_admin" ? 1 : role === "admin" ? 7 : 9,
    openId: `${role}-user`,
    email: `${role}@example.test`,
    name: role === "super_admin" ? "Super-administrateur" : role === "admin" ? "Administrateur" : "Client",
    loginMethod: "manus",
    role,
    accountStatus: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } : null;
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("routes persistantes tRPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expose les slides d’accueil publiquement", async () => {
    repository.listHomeHeroSlides.mockResolvedValue([{ id: 1, imageUrl: "/manus-storage/hero.jpg" }]);
    const result = await appRouter.createCaller(context(null)).homepage.heroSlides();
    expect(result).toEqual([{ id: 1, imageUrl: "/manus-storage/hero.jpg" }]);
    expect(repository.listHomeHeroSlides).toHaveBeenCalledOnce();
  });

  it("redirige les opérations personnelles vers une session authentifiée", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.wishlist.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.collections.create({ name: "Mes essais" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("délègue la newsletter, les avis publics et le suivi à leurs dépôts persistants", async () => {
    repository.subscribeNewsletter.mockResolvedValue({ alreadyActive: false, resumed: false });
    repository.listApprovedReviews.mockResolvedValue([{ id: 10, status: "approved" }]);
    repository.trackCatalogueRequest.mockResolvedValue({ reference: "GMP-ABCDEF", status: "received", events: [] });
    const caller = appRouter.createCaller(context(null));

    await expect(caller.newsletter.subscribe({ email: "client@example.test", locale: "fr", consent: true })).resolves.toEqual({ alreadyActive: false, resumed: false });
    await expect(caller.reviews.list({ productId: 2 })).resolves.toEqual([{ id: 10, status: "approved" }]);
    await expect(caller.orders.track({ reference: "GMP-ABCDEF", email: "client@example.test" })).resolves.toMatchObject({ status: "received" });

    expect(repository.subscribeNewsletter).toHaveBeenCalledWith("client@example.test", "fr");
    expect(repository.listApprovedReviews).toHaveBeenCalledWith(2);
    expect(repository.trackCatalogueRequest).toHaveBeenCalledWith("GMP-ABCDEF", "client@example.test");
  });

  it("bloque les parcours d’administration pour un compte non administrateur", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.admin.reviews.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.requests.updateStatus({ requestId: 5, status: "closed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("autorise un administrateur à modérer et à mettre à jour une demande", async () => {
    repository.listReviewsForAdmin.mockResolvedValue([{ id: 3, status: "pending" }]);
    repository.moderateReview.mockResolvedValue({ success: true, status: "approved" });
    repository.listCatalogueRequestsForAdmin.mockResolvedValue([{ id: 8, status: "received", events: [] }]);
    repository.updateCatalogueRequestStatus.mockResolvedValue({ success: true, status: "under_review" });
    repository.listSpecificationAuditsForAdmin.mockResolvedValue([{ id: 12, productId: 1, fieldName: "caliber", verificationStatus: "verified" }]);
    repository.upsertProductSpecificationAudit.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.admin.reviews.list({ status: "pending" })).resolves.toHaveLength(1);
    await expect(caller.admin.reviews.moderate({ reviewId: 3, status: "approved", moderationNote: "Conforme" })).resolves.toEqual({ success: true, status: "approved" });
    await expect(caller.admin.requests.list({ status: "received" })).resolves.toHaveLength(1);
    await expect(caller.admin.requests.updateStatus({ requestId: 8, status: "under_review", note: "Contrôle documentaire en cours" })).resolves.toEqual({ success: true, status: "under_review" });
    await expect(caller.admin.specifications.list({ productId: 1 })).resolves.toHaveLength(1);
    await expect(caller.admin.specifications.upsertAudit({ productId: 1, fieldName: "caliber", value: "9 mm Luger", sourceLabel: "GLOCK officiel", sourceUrl: "https://eu.glock.com/en/products/pistols/g17-gen5", verificationStatus: "verified" })).resolves.toEqual({ success: true });

    expect(repository.listReviewsForAdmin).toHaveBeenCalledWith("pending");
    expect(repository.moderateReview).toHaveBeenCalledWith(7, 3, "approved", "Conforme");
    expect(repository.listCatalogueRequestsForAdmin).toHaveBeenCalledWith("received");
    expect(repository.updateCatalogueRequestStatus).toHaveBeenCalledWith(7, 8, "under_review", "Contrôle documentaire en cours");
    expect(repository.listSpecificationAuditsForAdmin).toHaveBeenCalledWith(1);
    expect(repository.upsertProductSpecificationAudit).toHaveBeenCalledWith({ productId: 1, fieldName: "caliber", value: "9 mm Luger", sourceLabel: "GLOCK officiel", sourceUrl: "https://eu.glock.com/en/products/pistols/g17-gen5", verificationStatus: "verified" });
  });

  it("réserve les utilisateurs au super-administrateur tout en conservant l’opérationnel aux administrateurs approuvés", async () => {
    adminRepository.listAdminProducts.mockResolvedValue([{ id: 1, slug: "g17" }]);
    adminRepository.createAdminProduct.mockResolvedValue({ id: 2, slug: "g17-gen5" });
    adminRepository.listAdminUsers.mockResolvedValue([{ id: 9, accountStatus: "active" }]);
    adminRepository.updateUserAccountStatus.mockResolvedValue({ success: true, status: "banned" });
    adminRepository.getPlatformSettings.mockResolvedValue({ whatsappNumber: null, telegramHandle: null, locationNoticeVersion: "v1", locationRetentionDays: 30 });
    const admin = appRouter.createCaller(context("admin"));
    const superAdmin = appRouter.createCaller(context("super_admin"));
    const regular = appRouter.createCaller(context("user"));

    await expect(regular.admin.products.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.admin.products.list({ search: "glock" })).resolves.toHaveLength(1);
    await expect(admin.admin.products.create({ slug: "g17-gen5", name: "Glock 17 Gen5", brand: "Glock", category: "handguns", excerpt: "Référence vérifiée", description: "Description catalogue complète.", referencePriceCents: 80000, priceCents: 75000, stock: 2, imageUrl: "/manus-storage/g17.jpg" })).resolves.toMatchObject({ id: 2 });
    await expect(admin.admin.users.updateStatus({ userId: 9, status: "banned", reason: "Compte de test" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(superAdmin.admin.users.updateStatus({ userId: 9, status: "banned", reason: "Compte de test" })).resolves.toEqual({ success: true, status: "banned" });
    await expect(admin.admin.settings.get()).resolves.toMatchObject({ locationRetentionDays: 30 });

    expect(adminRepository.listAdminProducts).toHaveBeenCalledWith("glock");
    expect(adminRepository.createAdminProduct).toHaveBeenCalledWith(7, expect.objectContaining({ slug: "g17-gen5", featured: false }));
    expect(adminRepository.updateUserAccountStatus).toHaveBeenCalledWith(1, 9, "banned", "Compte de test");
  });

  it("permet une demande authentifiée mais réserve son approbation au super-administrateur", async () => {
    adminRepository.getMyAdminAccessRequest.mockResolvedValue(null);
    adminRepository.createAdminAccessRequest.mockResolvedValue({ id: 31, applicantUserId: 9, status: "pending" });
    adminRepository.listAdminAccessRequests.mockResolvedValue([{ id: 31, applicantUserId: 9, status: "pending", applicantEmail: "user@example.test" }]);
    adminRepository.reviewAdminAccessRequest.mockResolvedValue({ id: 31, applicantUserId: 9, status: "approved" });
    adminRepository.manageAdministratorRole.mockResolvedValue({ id: 7, role: "super_admin" });
    const user = appRouter.createCaller(context("user"));
    const admin = appRouter.createCaller(context("admin"));
    const superAdmin = appRouter.createCaller(context("super_admin"));

    await expect(user.adminAccess.mine()).resolves.toBeNull();
    await expect(user.adminAccess.request({ requestedMessage: "Je souhaite administrer le catalogue." })).resolves.toMatchObject({ status: "pending" });
    await expect(admin.admin.governance.accessRequests({ status: "pending" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.admin.governance.manageRole({ userId: 7, action: "promote_super_admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(superAdmin.admin.governance.accessRequests({ status: "pending" })).resolves.toHaveLength(1);
    await expect(superAdmin.admin.governance.reviewAccessRequest({ requestId: 31, decision: "approved", reviewerNote: "Accès validé." })).resolves.toMatchObject({ status: "approved" });
    await expect(superAdmin.admin.governance.manageRole({ userId: 7, action: "promote_super_admin", note: "Délégation complète." })).resolves.toMatchObject({ role: "super_admin" });

    expect(adminRepository.createAdminAccessRequest).toHaveBeenCalledWith(9, "Je souhaite administrer le catalogue.");
    expect(adminRepository.reviewAdminAccessRequest).toHaveBeenCalledWith(1, 31, "approved", "Accès validé.");
    expect(adminRepository.manageAdministratorRole).toHaveBeenCalledWith(1, 7, "promote_super_admin", "Délégation complète.");
  });

  it("réserve les sauvegardes et imports de catalogue au super-administrateur", async () => {
    transferRepository.createCatalogueExport.mockResolvedValue({ fileName: "sauvegarde.xlsx", base64: "ZmFrZQ==", contentType: "application/octet-stream", rowCount: 2 });
    transferRepository.validateCatalogueImportRows.mockResolvedValue({ valid: true, totalRows: 1, createCount: 1, updateCount: 0, errors: [], rows: [] });
    transferRepository.applyCatalogueImport.mockResolvedValue({ applied: true, createdRows: 1, updatedRows: 0, validation: { valid: true } });
    const row = { slug: "g17-gen5-import", name: "Glock 17 Gen5", brand: "Glock", category: "handguns", subCategory: "pistols", manufacturer: "Glock", model: "17 Gen5", excerpt: "Référence importée complète", description: "Description importée suffisamment détaillée.", referencePriceEUR: 800, priceEUR: 750, stock: 2, caliber: "9 mm", material: "Polymère", capacity: "17", action: "Semi-automatique", barrelLength: "114 mm", overallLength: "202 mm", weight: "625 g", imageUrl: "https://example.test/g17.jpg", galleryJson: "[]", specificationsJson: "{}", featured: false, mediaSource: "Import", mediaRightsStatus: "pending", mediaTransferState: "pending" };
    const admin = appRouter.createCaller(context("admin"));
    const superAdmin = appRouter.createCaller(context("super_admin"));

    await expect(admin.admin.transfers.export({ format: "xlsx", template: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(superAdmin.admin.transfers.export({ format: "xlsx", template: true })).resolves.toMatchObject({ fileName: "sauvegarde.xlsx" });
    await expect(superAdmin.admin.transfers.validate({ rows: [row], mode: "create" })).resolves.toMatchObject({ valid: true });
    await expect(superAdmin.admin.transfers.commit({ rows: [row], mode: "create", fileName: "catalogue.xlsx", format: "xlsx", contentBase64: "ZmFrZQ==" })).resolves.toMatchObject({ applied: true });

    expect(transferRepository.createCatalogueExport).toHaveBeenCalledWith("xlsx", true);
    expect(transferRepository.validateCatalogueImportRows).toHaveBeenCalledWith([row], "create");
    expect(transferRepository.applyCatalogueImport).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, fileName: "catalogue.xlsx", mode: "create" }));
  });

  it("empêche toute procédure protégée pour un compte banni", async () => {
    const banned = context("user");
    banned.user!.accountStatus = "banned";
    const caller = appRouter.createCaller(banned);
    await expect(caller.wishlist.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enregistre uniquement un consentement de localisation explicite et expose les contacts publics", async () => {
    adminRepository.recordLocationConsent.mockResolvedValue({ consented: true, location: { countryCode: "FR", country: "France", city: "Paris" } });
    adminRepository.getPlatformSettings.mockResolvedValue({ whatsappNumber: "33700000000", telegramHandle: "gunsmasterpro", locationNoticeVersion: "v2", locationRetentionDays: 30 });
    const caller = appRouter.createCaller(context(null));
    const visitorId = "7b2e1bf1-a3af-4a99-9b2f-2e46a675085f";

    await expect(caller.location.consent({ visitorId, consented: true, noticeVersion: "v2" })).resolves.toMatchObject({ consented: true, location: { countryCode: "FR" } });
    await expect(caller.settings.public()).resolves.toEqual({ whatsappNumber: "33700000000", telegramHandle: "gunsmasterpro", locationNoticeVersion: "v2" });
    expect(adminRepository.recordLocationConsent).toHaveBeenCalledWith(expect.objectContaining({ visitorId, consented: true, userId: null }));
  });

  it("expose aux administrateurs les historiques de connexion, newsletter et workflows persistants", async () => {
    adminRepository.listAdminLocationHistory.mockResolvedValue([{ id: 1, eventType: "consent_granted", visitorId: "7b2e1bf1-a3af-4a99-9b2f-2e46a675085f" }]);
    adminRepository.listAdminWorkflowEvents.mockResolvedValue([{ id: 2, eventType: "cart_added", entityType: "product" }]);
    adminRepository.listAdminNewsletterSubscriptions.mockResolvedValue([{ id: 3, email: "client@example.test", status: "subscribed" }]);
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.admin.locations.history()).resolves.toHaveLength(1);
    await expect(caller.admin.workflows.list({ eventType: "cart_added" })).resolves.toHaveLength(1);
    await expect(caller.admin.newsletter.list({ search: "client" })).resolves.toHaveLength(1);
    expect(adminRepository.listAdminWorkflowEvents).toHaveBeenCalledWith({ eventType: "cart_added" });
    expect(adminRepository.listAdminNewsletterSubscriptions).toHaveBeenCalledWith("client");
  });

  it("réserve la gestion média catalogue aux administrateurs", async () => {
    adminRepository.listAdminMedia.mockResolvedValue([{ id: 6, productId: 1, storageUrl: "/manus-storage/catalogue/1/photo.jpg" }]);
    adminRepository.uploadAdminMedia.mockResolvedValue({ id: 7, productId: 1, kind: "gallery" });
    const admin = appRouter.createCaller(context("admin"));
    const regular = appRouter.createCaller(context("user"));
    await expect(regular.admin.media.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.admin.media.list({ productId: 1 })).resolves.toHaveLength(1);
    await expect(admin.admin.media.upload({ productId: 1, kind: "gallery", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB" })).resolves.toMatchObject({ id: 7 });
    expect(adminRepository.listAdminMedia).toHaveBeenCalledWith(1);
    expect(adminRepository.uploadAdminMedia).toHaveBeenCalledWith(7, expect.objectContaining({ productId: 1, kind: "gallery" }));
  });
});
