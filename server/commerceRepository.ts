import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  catalogueActivityEvents,
  catalogueRequestEvents,
  catalogueRequestItems,
  catalogueRequests,
  collectionItems,
  homeHeroSlides,
  newsletterSubscriptions,
  platformWorkflowEvents,
  productSpecificationAudits,
  productReviews,
  products,
  reviewMedia,
  userCollections,
  users,
  wishlists,
} from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";

type Locale = "fr" | "en" | "de";
type ReviewStatus = "pending" | "approved" | "rejected";
type RequestStatus = "received" | "under_review" | "information_required" | "closed";
type SpecificationAuditStatus = "verified" | "unconfirmed" | "not_applicable";

const ensureDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  return db;
};

async function recordWorkflowEvent(db: Awaited<ReturnType<typeof ensureDb>>, input: { userId?: number | null; visitorId?: string | null; eventType: string; entityType: string; entityId?: string | number | null; details?: Record<string, unknown> }) {
  await db.insert(platformWorkflowEvents).values({
    userId: input.userId ?? null,
    visitorId: input.visitorId ?? null,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    details: input.details ?? null,
  });
}

export async function listHomeHeroSlides() {
  const db = await ensureDb();
  return db.select().from(homeHeroSlides).where(eq(homeHeroSlides.isActive, true)).orderBy(asc(homeHeroSlides.position));
}

export async function subscribeNewsletter(email: string, locale: Locale) {
  const db = await ensureDb();
  const normalized = email.trim().toLowerCase();
  const existing = (await db.select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, normalized)).limit(1))[0];
  if (!existing) {
    const result = await db.insert(newsletterSubscriptions).values({ email: normalized, locale, consentAt: new Date() });
    await recordWorkflowEvent(db, { eventType: "newsletter_subscribed", entityType: "newsletter_subscription", entityId: Number(result[0].insertId), details: { locale, resumed: false } });
    return { alreadyActive: false, resumed: false };
  }
  if (existing.unsubscribedAt) {
    await db.update(newsletterSubscriptions).set({ locale, consentAt: new Date(), unsubscribedAt: null }).where(eq(newsletterSubscriptions.id, existing.id));
    await recordWorkflowEvent(db, { eventType: "newsletter_resubscribed", entityType: "newsletter_subscription", entityId: existing.id, details: { locale, resumed: true } });
    return { alreadyActive: false, resumed: true };
  }
  return { alreadyActive: true, resumed: false };
}

export async function unsubscribeNewsletter(email: string) {
  const db = await ensureDb();
  const normalized = email.trim().toLowerCase();
  const existing = (await db.select({ id: newsletterSubscriptions.id }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, normalized)).limit(1))[0];
  await db.update(newsletterSubscriptions).set({ unsubscribedAt: new Date() }).where(eq(newsletterSubscriptions.email, normalized));
  if (existing) await recordWorkflowEvent(db, { eventType: "newsletter_unsubscribed", entityType: "newsletter_subscription", entityId: existing.id });
  return { success: true };
}

export async function listWishlist(userId: number) {
  const db = await ensureDb();
  const rows = await db.select({ product: products }).from(wishlists).innerJoin(products, eq(wishlists.productId, products.id)).where(eq(wishlists.userId, userId)).orderBy(desc(wishlists.createdAt));
  return rows;
}

export async function toggleWishlist(userId: number, productId: number) {
  const db = await ensureDb();
  const existing = (await db.select({ id: wishlists.id }).from(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))).limit(1))[0];
  if (existing) {
    await db.delete(wishlists).where(eq(wishlists.id, existing.id));
    await recordWorkflowEvent(db, { userId, eventType: "wishlist_removed", entityType: "product", entityId: productId });
    return { saved: false };
  }
  await db.insert(wishlists).values({ userId, productId });
  await recordWorkflowEvent(db, { userId, eventType: "wishlist_added", entityType: "product", entityId: productId });
  return { saved: true };
}

async function loadCollectionItems(collectionIds: number[]) {
  const db = await ensureDb();
  if (!collectionIds.length) return new Map<number, Array<{ product: typeof products.$inferSelect }>>();
  const rows = await db.select({ collectionId: collectionItems.collectionId, product: products }).from(collectionItems).innerJoin(products, eq(collectionItems.productId, products.id)).where(inArray(collectionItems.collectionId, collectionIds)).orderBy(asc(collectionItems.position), asc(collectionItems.createdAt));
  const map = new Map<number, Array<{ product: typeof products.$inferSelect }>>();
  for (const row of rows) map.set(row.collectionId, [...(map.get(row.collectionId) ?? []), { product: row.product }]);
  return map;
}

export async function listCollections(userId: number) {
  const db = await ensureDb();
  const collections = await db.select().from(userCollections).where(eq(userCollections.userId, userId)).orderBy(asc(userCollections.isArchived), desc(userCollections.updatedAt));
  const itemsByCollection = await loadCollectionItems(collections.map((item) => item.id));
  return collections.map((collection) => ({ ...collection, items: itemsByCollection.get(collection.id) ?? [] }));
}

export async function createCollection(userId: number, name: string, description?: string) {
  const db = await ensureDb();
  const result = await db.insert(userCollections).values({ userId, name: name.trim(), description: description?.trim() || null });
  const id = Number(result[0].insertId);
  return (await listCollections(userId)).find((collection) => collection.id === id) ?? null;
}

export async function updateCollection(userId: number, collectionId: number, name: string, description?: string) {
  const db = await ensureDb();
  await db.update(userCollections).set({ name: name.trim(), description: description?.trim() || null }).where(and(eq(userCollections.id, collectionId), eq(userCollections.userId, userId)));
  return { success: true };
}

export async function deleteCollection(userId: number, collectionId: number) {
  const db = await ensureDb();
  await db.delete(userCollections).where(and(eq(userCollections.id, collectionId), eq(userCollections.userId, userId)));
  return { success: true };
}

export async function archiveCollection(userId: number, collectionId: number, isArchived: boolean) {
  const db = await ensureDb();
  await db.update(userCollections).set({ isArchived }).where(and(eq(userCollections.id, collectionId), eq(userCollections.userId, userId)));
  return { success: true };
}

async function collectionIsOwnedBy(userId: number, collectionId: number) {
  const db = await ensureDb();
  return Boolean((await db.select({ id: userCollections.id }).from(userCollections).where(and(eq(userCollections.id, collectionId), eq(userCollections.userId, userId))).limit(1))[0]);
}

export async function addCollectionItem(userId: number, collectionId: number, productId: number) {
  const db = await ensureDb();
  if (!await collectionIsOwnedBy(userId, collectionId)) throw new Error("Collection introuvable");
  const [{ maxPosition }] = await db.select({ maxPosition: sql<number>`coalesce(max(${collectionItems.position}), -1)` }).from(collectionItems).where(eq(collectionItems.collectionId, collectionId));
  await db.insert(collectionItems).values({ collectionId, productId, position: Number(maxPosition) + 1 }).onDuplicateKeyUpdate({ set: { position: Number(maxPosition) + 1 } });
  return { success: true };
}

export async function removeCollectionItem(userId: number, collectionId: number, productId: number) {
  const db = await ensureDb();
  if (!await collectionIsOwnedBy(userId, collectionId)) throw new Error("Collection introuvable");
  await db.delete(collectionItems).where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.productId, productId)));
  return { success: true };
}

export async function moveCollectionItem(userId: number, sourceCollectionId: number, destinationCollectionId: number, productId: number) {
  if (!await collectionIsOwnedBy(userId, sourceCollectionId) || !await collectionIsOwnedBy(userId, destinationCollectionId)) throw new Error("Collection introuvable");
  await removeCollectionItem(userId, sourceCollectionId, productId);
  await addCollectionItem(userId, destinationCollectionId, productId);
  return { success: true };
}

export async function reorderCollectionItems(userId: number, collectionId: number, productIds: number[]) {
  const db = await ensureDb();
  if (!await collectionIsOwnedBy(userId, collectionId)) throw new Error("Collection introuvable");
  await db.transaction(async (tx) => {
    for (let position = 0; position < productIds.length; position += 1) {
      const productId = productIds[position]!;
      await tx.update(collectionItems).set({ position }).where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.productId, productId)));
    }
  });
  return { success: true };
}

export async function listApprovedReviews(productId: number) {
  const db = await ensureDb();
  const rows = await db.select({ review: productReviews, authorName: users.name }).from(productReviews).innerJoin(users, eq(productReviews.userId, users.id)).where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved"))).orderBy(desc(productReviews.publishedAt));
  if (!rows.length) return [];
  const mediaRows = await db.select().from(reviewMedia).where(inArray(reviewMedia.reviewId, rows.map((row) => row.review.id))).orderBy(asc(reviewMedia.position));
  const urlsByReview = new Map<number, string[]>();
  for (const row of mediaRows) urlsByReview.set(row.reviewId, [...(urlsByReview.get(row.reviewId) ?? []), row.storageUrl]);
  return rows.map((row) => ({ id: row.review.id, rating: row.review.rating, title: row.review.title, body: row.review.body, authorName: row.authorName, mediaUrls: urlsByReview.get(row.review.id) ?? [] }));
}

export async function listReviewsForAdmin(status?: ReviewStatus) {
  const db = await ensureDb();
  const query = db
    .select({ review: productReviews, authorName: users.name, productName: products.name, productSlug: products.slug })
    .from(productReviews)
    .innerJoin(users, eq(productReviews.userId, users.id))
    .innerJoin(products, eq(productReviews.productId, products.id));
  const rows = status
    ? await query.where(eq(productReviews.status, status)).orderBy(desc(productReviews.createdAt))
    : await query.orderBy(desc(productReviews.createdAt));
  const reviewIds = rows.map((row) => row.review.id);
  const mediaRows = reviewIds.length ? await db.select().from(reviewMedia).where(inArray(reviewMedia.reviewId, reviewIds)).orderBy(asc(reviewMedia.position)) : [];
  const mediaByReview = new Map<number, string[]>();
  for (const item of mediaRows) mediaByReview.set(item.reviewId, [...(mediaByReview.get(item.reviewId) ?? []), item.storageUrl]);
  return rows.map((row) => ({ ...row.review, authorName: row.authorName, productName: row.productName, productSlug: row.productSlug, mediaUrls: mediaByReview.get(row.review.id) ?? [] }));
}

export async function moderateReview(adminUserId: number, reviewId: number, status: Exclude<ReviewStatus, "pending">, moderationNote?: string) {
  const db = await ensureDb();
  const existing = (await db.select({ id: productReviews.id }).from(productReviews).where(eq(productReviews.id, reviewId)).limit(1))[0];
  if (!existing) throw new Error("Avis introuvable");
  await db.update(productReviews).set({
    status,
    moderatedByUserId: adminUserId,
    moderationNote: moderationNote?.trim() || null,
    publishedAt: status === "approved" ? new Date() : null,
  }).where(eq(productReviews.id, reviewId));
  await recordWorkflowEvent(db, { userId: adminUserId, eventType: "review_moderated", entityType: "review", entityId: reviewId, details: { status } });
  return { success: true, status };
}

const parseDataUrl = (image: string) => {
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Format d’image non pris en charge");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 1_500_000) throw new Error("Image trop volumineuse");
  return { buffer, contentType: match[1] };
};

export async function uploadReviewMedia(userId: number, productId: number, image: string) {
  const db = await ensureDb();
  const product = (await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1))[0];
  if (!product) throw new Error("Produit introuvable");
  const { buffer, contentType } = parseDataUrl(image);
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return storagePut(`reviews/${userId}/${productId}/${crypto.randomUUID()}.${extension}`, buffer, contentType);
}

export async function submitReview(userId: number, input: { productId: number; rating: number; title: string; body: string; mediaUrls: string[] }) {
  const db = await ensureDb();
  const product = (await db.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).limit(1))[0];
  if (!product) throw new Error("Produit introuvable");
  const result = await db.insert(productReviews).values({ productId: input.productId, userId, rating: input.rating, title: input.title.trim(), body: input.body.trim(), status: "pending" }).onDuplicateKeyUpdate({ set: { rating: input.rating, title: input.title.trim(), body: input.body.trim(), status: "pending", moderationNote: null, moderatedByUserId: null, publishedAt: null } });
  const existing = (await db.select({ id: productReviews.id }).from(productReviews).where(and(eq(productReviews.productId, input.productId), eq(productReviews.userId, userId))).limit(1))[0];
  if (!existing) throw new Error("Avis non enregistré");
  await db.delete(reviewMedia).where(eq(reviewMedia.reviewId, existing.id));
  if (input.mediaUrls.length) {
    await db.insert(reviewMedia).values(input.mediaUrls.slice(0, 3).map((storageUrl, position) => ({ reviewId: existing.id, storageUrl, storageKey: storageUrl.replace("/manus-storage/", ""), contentType: storageUrl.endsWith(".png") ? "image/png" : storageUrl.endsWith(".webp") ? "image/webp" : "image/jpeg", position })));
  }
  return { id: Number(result[0].insertId || existing.id), status: "pending" as const };
}

export async function createCatalogueRequest(userId: number | null, input: { customerName: string; customerEmail: string; customerPhone: string; locale: Locale; countryCode?: string; countryContextConsent: boolean; couponCode?: string; items: Array<{ productId: number; quantity: number }> }) {
  const db = await ensureDb();
  const productIds = Array.from(new Set(input.items.map((item) => item.productId)));
  const catalogue = await db.select({ id: products.id, priceCents: products.priceCents }).from(products).where(inArray(products.id, productIds));
  if (catalogue.length !== productIds.length) throw new Error("Un produit demandé est introuvable");
  const prices = new Map(catalogue.map((product) => [product.id, product.priceCents]));
  const subtotalCents = input.items.reduce((total, item) => total + (prices.get(item.productId) ?? 0) * item.quantity, 0);
  const reference = `GMP-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const result = await db.insert(catalogueRequests).values({ reference, userId, customerName: input.customerName.trim(), customerEmail: input.customerEmail.trim().toLowerCase(), customerPhone: input.customerPhone.trim(), locale: input.locale, countryCode: input.countryCode?.trim().toUpperCase() || null, countryContextConsent: input.countryContextConsent, couponCode: input.couponCode?.trim() || null, subtotalCents, totalCents: subtotalCents, status: "received" });
  const requestId = Number(result[0].insertId);
  await db.insert(catalogueRequestItems).values(input.items.map((item) => ({ requestId, productId: item.productId, quantity: item.quantity, unitPriceCents: prices.get(item.productId) ?? 0 })));
  await db.insert(catalogueRequestEvents).values({ requestId, status: "received", note: "Demande créée depuis le storefront.", createdByUserId: userId });
  await db.insert(catalogueActivityEvents).values({ userId, eventType: "request_created", locale: input.locale, countryCode: input.countryCode?.trim().toUpperCase() || null, metadata: { reference, itemCount: input.items.length } });
  await recordWorkflowEvent(db, { userId, eventType: "request_created", entityType: "catalogue_request", entityId: requestId, details: { reference, itemCount: input.items.length, totalCents: subtotalCents, locale: input.locale } });
  return { reference, subtotalCents, totalCents: subtotalCents, estimatedDeliveryAt: null };
}

export async function trackCatalogueRequest(reference: string, email: string) {
  const db = await ensureDb();
  const request = (await db.select().from(catalogueRequests).where(and(eq(catalogueRequests.reference, reference.trim().toUpperCase()), eq(catalogueRequests.customerEmail, email.trim().toLowerCase()))).limit(1))[0];
  if (!request) return null;
  const events = await db.select().from(catalogueRequestEvents).where(eq(catalogueRequestEvents.requestId, request.id)).orderBy(asc(catalogueRequestEvents.createdAt));
  return { reference: request.reference, status: request.status, estimatedDeliveryAt: null, couponBenefit: null, couponCode: request.couponCode, createdAt: request.createdAt, events: events.map((event) => ({ status: event.status, note: event.note, createdAt: event.createdAt })) };
}

export async function listCatalogueRequestsForAdmin(status?: RequestStatus) {
  const db = await ensureDb();
  const query = db.select().from(catalogueRequests);
  const requests = status
    ? await query.where(eq(catalogueRequests.status, status)).orderBy(desc(catalogueRequests.createdAt))
    : await query.orderBy(desc(catalogueRequests.createdAt));
  const requestIds = requests.map((request) => request.id);
  const events = requestIds.length ? await db.select().from(catalogueRequestEvents).where(inArray(catalogueRequestEvents.requestId, requestIds)).orderBy(asc(catalogueRequestEvents.createdAt)) : [];
  const eventsByRequest = new Map<number, typeof events>();
  for (const event of events) eventsByRequest.set(event.requestId, [...(eventsByRequest.get(event.requestId) ?? []), event]);
  return requests.map((request) => ({ ...request, events: eventsByRequest.get(request.id) ?? [] }));
}

export async function updateCatalogueRequestStatus(adminUserId: number, requestId: number, status: RequestStatus, note?: string) {
  const db = await ensureDb();
  const request = (await db.select({ id: catalogueRequests.id }).from(catalogueRequests).where(eq(catalogueRequests.id, requestId)).limit(1))[0];
  if (!request) throw new Error("Demande introuvable");
  await db.transaction(async (tx) => {
    await tx.update(catalogueRequests).set({ status }).where(eq(catalogueRequests.id, requestId));
    await tx.insert(catalogueRequestEvents).values({ requestId, status, note: note?.trim() || null, createdByUserId: adminUserId });
  });
  await recordWorkflowEvent(db, { userId: adminUserId, eventType: "request_status_updated", entityType: "catalogue_request", entityId: requestId, details: { status, note: note?.trim() || null } });
  return { success: true, status };
}

export async function listSpecificationAuditsForAdmin(productId?: number) {
  const db = await ensureDb();
  const query = db
    .select({ audit: productSpecificationAudits, productName: products.name, productSlug: products.slug })
    .from(productSpecificationAudits)
    .innerJoin(products, eq(productSpecificationAudits.productId, products.id));
  const rows = productId
    ? await query.where(eq(productSpecificationAudits.productId, productId)).orderBy(desc(productSpecificationAudits.checkedAt))
    : await query.orderBy(desc(productSpecificationAudits.checkedAt));
  return rows.map((row) => ({ ...row.audit, productName: row.productName, productSlug: row.productSlug }));
}

export async function upsertProductSpecificationAudit(input: {
  productId: number;
  fieldName: string;
  value: string;
  sourceLabel: string;
  sourceUrl?: string;
  verificationStatus: SpecificationAuditStatus;
}) {
  const db = await ensureDb();
  const product = (await db.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).limit(1))[0];
  if (!product) throw new Error("Produit introuvable");
  const checkedAt = new Date();
  await db.insert(productSpecificationAudits).values({ ...input, sourceUrl: input.sourceUrl || null, checkedAt }).onDuplicateKeyUpdate({
    set: {
      value: input.value,
      sourceLabel: input.sourceLabel,
      sourceUrl: input.sourceUrl || null,
      verificationStatus: input.verificationStatus,
      checkedAt,
    },
  });
  return { success: true };
}

export async function recordCartActivity(userId: number | null, productId: number, quantity: number, locale: Locale, countryCode?: string, visitorId?: string) {
  const db = await ensureDb();
  await db.insert(catalogueActivityEvents).values({ userId, productId, eventType: "cart_added", locale, countryCode: countryCode?.trim().toUpperCase() || null, metadata: { quantity } });
  await recordWorkflowEvent(db, { userId, visitorId: visitorId ?? null, eventType: "cart_added", entityType: "product", entityId: productId, details: { quantity, locale, countryCode: countryCode?.trim().toUpperCase() || null } });
  return { recorded: true };
}
