import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router, superAdminProcedure } from "./_core/trpc";
import {
  createAdminCategory,
  createAdminAccessRequest,
  createAdminProduct,
  deleteAdminCategory,
  deleteAdminMedia,
  deleteAdminProduct,
  getAdminLocationOverview,
  listAdminCategories,
  listAdminLocationHistory,
  listAdminMedia,
  listAdminNewsletterSubscriptions,
  getAdminOverview,
  getPlatformSettings,
  getMyAdminAccessRequest,
  listAdminProducts,
  listAdminUsers,
  listAdminAccessRequests,
  listAdminWorkflowEvents,
  manageAdministratorRole,
  recordLocationConsent,
  updateAdminCategory,
  updateAdminMedia,
  updateAdminProduct,
  reviewAdminAccessRequest,
  updatePlatformSettings,
  updateUserAccountStatus,
  uploadAdminMedia,
} from "./adminRepository";
import { catalogueSummary, getCatalogueProductBySlug, listCatalogueCategories, listCatalogueProducts } from "./catalogueRepository";
import { applyCatalogueImport, createCatalogueExport, validateCatalogueImportRows } from "./catalogueTransfer";
import {
  addCollectionItem,
  archiveCollection,
  createCatalogueRequest,
  createCollection,
  deleteCollection,
  listCatalogueRequestsForAdmin,
  listApprovedReviews,
  listCollections,
  listHomeHeroSlides,
  listReviewsForAdmin,
  listSpecificationAuditsForAdmin,
  listWishlist,
  moderateReview,
  moveCollectionItem,
  recordCartActivity,
  removeCollectionItem,
  reorderCollectionItems,
  submitReview,
  subscribeNewsletter,
  toggleWishlist,
  trackCatalogueRequest,
  unsubscribeNewsletter,
  updateCollection,
  updateCatalogueRequestStatus,
  upsertProductSpecificationAudit,
  uploadReviewMedia,
} from "./commerceRepository";

const localeSchema = z.enum(["fr", "en", "de"]);
const collectionInput = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).optional() });
const catalogueFamilySchema = z.enum(["handguns", "rifles", "shotguns", "accessories"]);
const adminProductInput = z.object({
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(240),
  brand: z.string().trim().min(2).max(180),
  category: catalogueFamilySchema,
  subCategory: z.string().trim().max(120).default("general"),
  manufacturer: z.string().trim().max(180).default(""),
  model: z.string().trim().max(180).default(""),
  excerpt: z.string().trim().min(8).max(5000),
  description: z.string().trim().min(10).max(20_000),
  referencePriceCents: z.number().int().min(0).max(100_000_000),
  priceCents: z.number().int().min(0).max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  caliber: z.string().trim().max(100).default("Non renseigné"),
  material: z.string().trim().max(160).default("Non renseigné"),
  capacity: z.string().trim().max(80).default("Non renseigné"),
  action: z.string().trim().max(120).default("Non renseigné"),
  barrelLength: z.string().trim().max(80).default("Non renseigné"),
  overallLength: z.string().trim().max(80).default("Non renseigné"),
  weight: z.string().trim().max(80).default("Non renseigné"),
  imageUrl: z.string().trim().min(1).max(2048),
  gallery: z.array(z.string().trim().min(1).max(2048)).max(24).optional(),
  specifications: z.record(z.string().trim().min(1).max(120), z.string().trim().max(4000)).optional(),
  featured: z.boolean().default(false),
});
const adminCategoryInput = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  parentCategory: catalogueFamilySchema,
  label: z.string().trim().min(2).max(180),
  description: z.string().trim().min(2).max(500),
  imageUrl: z.string().trim().min(1).max(2048),
  position: z.number().int().min(0).max(10_000).default(0),
});
const catalogueTransferRow = z.record(z.string().max(120), z.union([z.string().max(30_000), z.number(), z.boolean(), z.null()]));
const catalogueTransferInput = z.object({ rows: z.array(catalogueTransferRow).min(1).max(500), mode: z.enum(["create", "upsert"]) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  adminAccess: router({
    mine: protectedProcedure.query(({ ctx }) => getMyAdminAccessRequest(ctx.user.id)),
    request: protectedProcedure.input(z.object({ requestedMessage: z.string().trim().min(8).max(1000).optional() })).mutation(({ ctx, input }) => createAdminAccessRequest(ctx.user.id, input.requestedMessage)),
  }),
  catalogue: router({
    list: publicProcedure.input(z.object({ search: z.string().trim().max(100).optional() }).optional()).query(async ({ input }) => (await listCatalogueProducts(input?.search)) ?? []),
    bySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(180) })).query(async ({ input }) => (await getCatalogueProductBySlug(input.slug)) ?? null),
    summary: publicProcedure.query(catalogueSummary),
  }),
  categories: router({ list: publicProcedure.query(async () => (await listCatalogueCategories()) ?? []) }),
  homepage: router({ heroSlides: publicProcedure.query(listHomeHeroSlides) }),
  settings: router({
    public: publicProcedure.query(async () => {
      const settings = await getPlatformSettings();
      return { whatsappNumber: settings.whatsappNumber, telegramHandle: settings.telegramHandle, locationNoticeVersion: settings.locationNoticeVersion };
    }),
  }),
  location: router({
    consent: publicProcedure.input(z.object({ visitorId: z.string().trim().uuid(), consented: z.boolean(), noticeVersion: z.string().trim().min(1).max(32) })).mutation(({ ctx, input }) => recordLocationConsent({ ...input, userId: ctx.user?.id ?? null, headers: ctx.req.headers })),
  }),
  newsletter: router({
    subscribe: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), locale: localeSchema.default("fr"), consent: z.literal(true) })).mutation(({ input }) => subscribeNewsletter(input.email, input.locale)),
    unsubscribe: publicProcedure.input(z.object({ email: z.string().trim().email().max(320) })).mutation(({ input }) => unsubscribeNewsletter(input.email)),
  }),
  reviews: router({
    list: publicProcedure.input(z.object({ productId: z.number().int().positive() })).query(({ input }) => listApprovedReviews(input.productId)),
    uploadMedia: protectedProcedure.input(z.object({ productId: z.number().int().positive(), image: z.string().min(32).max(2_100_000) })).mutation(({ ctx, input }) => uploadReviewMedia(ctx.user.id, input.productId, input.image)),
    submit: protectedProcedure.input(z.object({ productId: z.number().int().positive(), rating: z.number().int().min(1).max(5), title: z.string().trim().min(3).max(180), body: z.string().trim().min(10).max(4000), mediaUrls: z.array(z.string().startsWith("/manus-storage/")).max(3).default([]) })).mutation(({ ctx, input }) => submitReview(ctx.user.id, input)),
  }),
  wishlist: router({
    list: protectedProcedure.query(({ ctx }) => listWishlist(ctx.user.id)),
    toggle: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(({ ctx, input }) => toggleWishlist(ctx.user.id, input.productId)),
  }),
  collections: router({
    list: protectedProcedure.query(({ ctx }) => listCollections(ctx.user.id)),
    create: protectedProcedure.input(collectionInput).mutation(({ ctx, input }) => createCollection(ctx.user.id, input.name, input.description)),
    update: protectedProcedure.input(collectionInput.extend({ collectionId: z.number().int().positive() })).mutation(({ ctx, input }) => updateCollection(ctx.user.id, input.collectionId, input.name, input.description)),
    delete: protectedProcedure.input(z.object({ collectionId: z.number().int().positive() })).mutation(({ ctx, input }) => deleteCollection(ctx.user.id, input.collectionId)),
    archive: protectedProcedure.input(z.object({ collectionId: z.number().int().positive(), isArchived: z.boolean() })).mutation(({ ctx, input }) => archiveCollection(ctx.user.id, input.collectionId, input.isArchived)),
    addItem: protectedProcedure.input(z.object({ collectionId: z.number().int().positive(), productId: z.number().int().positive() })).mutation(({ ctx, input }) => addCollectionItem(ctx.user.id, input.collectionId, input.productId)),
    removeItem: protectedProcedure.input(z.object({ collectionId: z.number().int().positive(), productId: z.number().int().positive() })).mutation(({ ctx, input }) => removeCollectionItem(ctx.user.id, input.collectionId, input.productId)),
    moveItem: protectedProcedure.input(z.object({ sourceCollectionId: z.number().int().positive(), destinationCollectionId: z.number().int().positive(), productId: z.number().int().positive() })).mutation(({ ctx, input }) => moveCollectionItem(ctx.user.id, input.sourceCollectionId, input.destinationCollectionId, input.productId)),
    reorderItems: protectedProcedure.input(z.object({ collectionId: z.number().int().positive(), productIds: z.array(z.number().int().positive()).max(500) })).mutation(({ ctx, input }) => reorderCollectionItems(ctx.user.id, input.collectionId, input.productIds)),
  }),
  notifications: router({
    cartAdded: publicProcedure.input(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99), locale: localeSchema.default("fr"), countryCode: z.string().trim().max(8).optional(), visitorId: z.string().trim().uuid().optional() })).mutation(({ ctx, input }) => recordCartActivity(ctx.user?.id ?? null, input.productId, input.quantity, input.locale, input.countryCode, input.visitorId)),
  }),
  orders: router({
    create: publicProcedure.input(z.object({ customerName: z.string().trim().min(2).max(180), customerEmail: z.string().trim().email().max(320), customerPhone: z.string().trim().min(4).max(80), locale: localeSchema.default("fr"), countryCode: z.string().trim().max(8).optional(), countryContextConsent: z.boolean().default(false), couponCode: z.string().trim().max(80).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1).max(50) })).mutation(({ ctx, input }) => createCatalogueRequest(ctx.user?.id ?? null, input)),
    track: publicProcedure.input(z.object({ reference: z.string().trim().min(6).max(64), email: z.string().trim().email().max(320) })).query(({ input }) => trackCatalogueRequest(input.reference, input.email)),
  }),
  admin: router({
    overview: adminProcedure.query(getAdminOverview),
    products: router({
      list: adminProcedure.input(z.object({ search: z.string().trim().max(100).optional() }).optional()).query(({ input }) => listAdminProducts(input?.search)),
      create: adminProcedure.input(adminProductInput).mutation(({ ctx, input }) => createAdminProduct(ctx.user.id, input)),
      update: adminProcedure.input(adminProductInput.extend({ productId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        const { productId, ...product } = input;
        return updateAdminProduct(ctx.user.id, productId, product);
      }),
      delete: adminProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(({ ctx, input }) => deleteAdminProduct(ctx.user.id, input.productId)),
    }),
    transfers: router({
      export: superAdminProcedure.input(z.object({ format: z.enum(["csv", "xlsx", "json"]), template: z.boolean().default(false) })).query(({ input }) => createCatalogueExport(input.format, input.template)),
      validate: superAdminProcedure.input(catalogueTransferInput).mutation(({ input }) => validateCatalogueImportRows(input.rows, input.mode)),
      commit: superAdminProcedure.input(catalogueTransferInput.extend({ fileName: z.string().trim().min(1).max(255), format: z.enum(["csv", "xlsx", "json"]), contentBase64: z.string().min(4).max(12_000_000) })).mutation(({ ctx, input }) => applyCatalogueImport({ actorUserId: ctx.user.id, ...input })),
    }),
    media: router({
      list: adminProcedure.input(z.object({ productId: z.number().int().positive().optional() }).optional()).query(({ input }) => listAdminMedia(input?.productId)),
      upload: adminProcedure.input(z.object({ productId: z.number().int().positive(), kind: z.enum(["primary", "gallery"]), image: z.string().min(32).max(10_000_000), position: z.number().int().min(0).max(10_000).optional() })).mutation(({ ctx, input }) => uploadAdminMedia(ctx.user.id, input)),
      update: adminProcedure.input(z.object({ assetId: z.number().int().positive(), kind: z.enum(["primary", "gallery"]), position: z.number().int().min(0).max(10_000) })).mutation(({ ctx, input }) => updateAdminMedia(ctx.user.id, input.assetId, input)),
      delete: adminProcedure.input(z.object({ assetId: z.number().int().positive() })).mutation(({ ctx, input }) => deleteAdminMedia(ctx.user.id, input.assetId)),
    }),
    categories: router({
      list: adminProcedure.query(listAdminCategories),
      create: adminProcedure.input(adminCategoryInput).mutation(({ ctx, input }) => createAdminCategory(ctx.user.id, input)),
      update: adminProcedure.input(adminCategoryInput.extend({ categoryId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        const { categoryId, ...category } = input;
        return updateAdminCategory(ctx.user.id, categoryId, category);
      }),
      delete: adminProcedure.input(z.object({ categoryId: z.number().int().positive() })).mutation(({ ctx, input }) => deleteAdminCategory(ctx.user.id, input.categoryId)),
    }),
    users: router({
      list: superAdminProcedure.input(z.object({ search: z.string().trim().max(100).optional() }).optional()).query(({ input }) => listAdminUsers(input?.search)),
      updateStatus: superAdminProcedure.input(z.object({ userId: z.number().int().positive(), status: z.enum(["active", "banned"]), reason: z.string().trim().min(3).max(1000).optional() })).mutation(({ ctx, input }) => updateUserAccountStatus(ctx.user.id, input.userId, input.status, input.reason)),
    }),
    governance: router({
      accessRequests: superAdminProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected", "revoked"]).optional() }).optional()).query(({ input }) => listAdminAccessRequests(input?.status)),
      reviewAccessRequest: superAdminProcedure.input(z.object({ requestId: z.number().int().positive(), decision: z.enum(["approved", "rejected", "revoked"]), reviewerNote: z.string().trim().min(3).max(1000).optional() })).mutation(({ ctx, input }) => reviewAdminAccessRequest(ctx.user.id, input.requestId, input.decision, input.reviewerNote)),
      manageRole: superAdminProcedure.input(z.object({ userId: z.number().int().positive(), action: z.enum(["promote_super_admin", "demote_admin", "revoke_admin"]), note: z.string().trim().min(3).max(1000).optional() })).mutation(({ ctx, input }) => manageAdministratorRole(ctx.user.id, input.userId, input.action, input.note)),
    }),
    settings: router({
      get: adminProcedure.query(getPlatformSettings),
      update: adminProcedure.input(z.object({ whatsappNumber: z.string().trim().max(80).optional().nullable(), telegramHandle: z.string().trim().max(120).optional().nullable(), locationNoticeVersion: z.string().trim().min(1).max(32), locationRetentionDays: z.number().int().min(1).max(365) })).mutation(({ ctx, input }) => updatePlatformSettings(ctx.user.id, input)),
    }),
    locations: router({ overview: adminProcedure.query(getAdminLocationOverview), history: adminProcedure.input(z.object({ visitorId: z.string().trim().uuid().optional(), userId: z.number().int().positive().optional() }).optional()).query(({ input }) => listAdminLocationHistory(input)) }),
    workflows: router({ list: adminProcedure.input(z.object({ eventType: z.string().trim().max(80).optional(), userId: z.number().int().positive().optional() }).optional()).query(({ input }) => listAdminWorkflowEvents(input)) }),
    newsletter: router({ list: adminProcedure.input(z.object({ search: z.string().trim().max(120).optional() }).optional()).query(({ input }) => listAdminNewsletterSubscriptions(input?.search)) }),
    reviews: router({
      list: adminProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional()).query(({ input }) => listReviewsForAdmin(input?.status)),
      moderate: adminProcedure.input(z.object({ reviewId: z.number().int().positive(), status: z.enum(["approved", "rejected"]), moderationNote: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => moderateReview(ctx.user.id, input.reviewId, input.status, input.moderationNote)),
    }),
    requests: router({
      list: adminProcedure.input(z.object({ status: z.enum(["received", "under_review", "information_required", "closed"]).optional() }).optional()).query(({ input }) => listCatalogueRequestsForAdmin(input?.status)),
      updateStatus: adminProcedure.input(z.object({ requestId: z.number().int().positive(), status: z.enum(["received", "under_review", "information_required", "closed"]), note: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => updateCatalogueRequestStatus(ctx.user.id, input.requestId, input.status, input.note)),
    }),
    specifications: router({
      list: adminProcedure.input(z.object({ productId: z.number().int().positive().optional() }).optional()).query(({ input }) => listSpecificationAuditsForAdmin(input?.productId)),
      upsertAudit: adminProcedure.input(z.object({ productId: z.number().int().positive(), fieldName: z.string().trim().min(1).max(120), value: z.string().trim().min(1).max(4000), sourceLabel: z.string().trim().min(1).max(255), sourceUrl: z.string().url().max(2048).optional(), verificationStatus: z.enum(["verified", "unconfirmed", "not_applicable"]) })).mutation(({ input }) => upsertProductSpecificationAudit(input)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
