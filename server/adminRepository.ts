import { and, desc, eq, gt, inArray, like, or, sql } from "drizzle-orm";
import {
  adminActivityLogs,
  adminAccessRequests,
  catalogueActivityEvents,
  catalogueCategories,
  catalogueRequests,
  mediaAssets,
  newsletterSubscriptions,
  platformSettings,
  platformWorkflowEvents,
  products,
  users,
  visitorConnectionEvents,
  visitorLocationConsents,
  visitorLocations,
} from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { normalizeTelegramHandle, normalizeWhatsappNumber } from "../shared/contactLinks";

type CatalogueFamily = "handguns" | "rifles" | "shotguns" | "accessories";
type AccountStatus = "active" | "banned";
type AdminAccessDecision = "approved" | "rejected" | "revoked";
type AdministratorRoleAction = "promote_super_admin" | "demote_admin" | "revoke_admin";

const ensureDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  return db;
};

async function logAdminActivity(actorUserId: number, action: string, entityType: string, entityId?: string | number | null, targetUserId?: number | null, details?: Record<string, unknown>) {
  const db = await ensureDb();
  await db.insert(adminActivityLogs).values({
    actorUserId,
    targetUserId: targetUserId ?? null,
    action,
    entityType,
    entityId: entityId == null ? null : String(entityId),
    details: details ?? null,
  });
}

const normaliseHandle = (value?: string | null) => normalizeTelegramHandle(value);
const normaliseWhatsapp = (value?: string | null) => normalizeWhatsappNumber(value);

export type AdminProductInput = {
  slug: string;
  name: string;
  brand: string;
  category: CatalogueFamily;
  subCategory: string;
  manufacturer: string;
  model: string;
  excerpt: string;
  description: string;
  referencePriceCents: number;
  priceCents: number;
  stock: number;
  caliber: string;
  material: string;
  capacity: string;
  action: string;
  barrelLength: string;
  overallLength: string;
  weight: string;
  imageUrl: string;
  gallery?: string[];
  specifications?: Record<string, string>;
  featured: boolean;
};

export async function listAdminProducts(search?: string) {
  const db = await ensureDb();
  const needle = search?.trim();
  const rows = needle
    ? await db.select().from(products).where(or(like(products.name, `%${needle}%`), like(products.brand, `%${needle}%`), like(products.slug, `%${needle}%`))).orderBy(desc(products.updatedAt))
    : await db.select().from(products).orderBy(desc(products.updatedAt));
  return rows;
}

export async function createAdminProduct(actorUserId: number, input: AdminProductInput) {
  const db = await ensureDb();
  const result = await db.insert(products).values({
    ...input,
    slug: input.slug.trim(),
    name: input.name.trim(),
    brand: input.brand.trim(),
    subCategory: input.subCategory.trim() || "general",
    manufacturer: input.manufacturer.trim() || input.brand.trim(),
    model: input.model.trim() || input.name.trim(),
    excerpt: input.excerpt.trim(),
    description: input.description.trim(),
    caliber: input.caliber.trim(),
    material: input.material.trim(),
    capacity: input.capacity.trim(),
    action: input.action.trim(),
    barrelLength: input.barrelLength.trim(),
    overallLength: input.overallLength.trim(),
    weight: input.weight.trim(),
    imageUrl: input.imageUrl.trim(),
    gallery: input.gallery?.length ? input.gallery.map((url) => url.trim()).filter(Boolean) : [input.imageUrl.trim()],
    specifications: input.specifications ?? null,
    mediaSource: "Gestion administrative GunsMasterPro",
    mediaRightsStatus: "pending",
    mediaTransferState: "pending",
  });
  const id = Number(result[0].insertId);
  await logAdminActivity(actorUserId, "product_created", "product", id, null, { slug: input.slug });
  return (await db.select().from(products).where(eq(products.id, id)).limit(1))[0] ?? null;
}

export async function updateAdminProduct(actorUserId: number, productId: number, input: AdminProductInput) {
  const db = await ensureDb();
  const exists = (await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1))[0];
  if (!exists) throw new Error("Produit introuvable");
  await db.update(products).set({
    ...input,
    slug: input.slug.trim(),
    name: input.name.trim(),
    brand: input.brand.trim(),
    subCategory: input.subCategory.trim() || "general",
    manufacturer: input.manufacturer.trim() || input.brand.trim(),
    model: input.model.trim() || input.name.trim(),
    excerpt: input.excerpt.trim(),
    description: input.description.trim(),
    caliber: input.caliber.trim(),
    material: input.material.trim(),
    capacity: input.capacity.trim(),
    action: input.action.trim(),
    barrelLength: input.barrelLength.trim(),
    overallLength: input.overallLength.trim(),
    weight: input.weight.trim(),
    imageUrl: input.imageUrl.trim(),
    gallery: input.gallery?.length ? input.gallery.map((url) => url.trim()).filter(Boolean) : [input.imageUrl.trim()],
    specifications: input.specifications ?? null,
  }).where(eq(products.id, productId));
  await logAdminActivity(actorUserId, "product_updated", "product", productId, null, { slug: input.slug });
  return (await db.select().from(products).where(eq(products.id, productId)).limit(1))[0] ?? null;
}

export async function deleteAdminProduct(actorUserId: number, productId: number) {
  const db = await ensureDb();
  const existing = (await db.select({ id: products.id, slug: products.slug }).from(products).where(eq(products.id, productId)).limit(1))[0];
  if (!existing) throw new Error("Produit introuvable");
  await db.delete(products).where(eq(products.id, productId));
  await logAdminActivity(actorUserId, "product_deleted", "product", productId, null, { slug: existing.slug });
  return { success: true };
}

type AdminMediaKind = "primary" | "gallery";

const parseAdminImage = (image: string) => {
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Format d’image non pris en charge. Utilisez JPEG, PNG ou WebP.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 7_000_000) throw new Error("Image trop volumineuse (7 Mo maximum).");
  return { buffer, contentType: match[1] };
};

async function synchroniseProductMedia(db: Awaited<ReturnType<typeof ensureDb>>, productId: number) {
  const assets = await db.select().from(mediaAssets).where(eq(mediaAssets.productId, productId)).orderBy(mediaAssets.position, mediaAssets.createdAt);
  const urls = assets.map((asset) => asset.storageUrl || asset.sourceUrl).filter(Boolean) as string[];
  const primary = assets.find((asset) => asset.kind === "primary");
  if (!urls.length) return;
  // Un média rattaché par l'administration est un transfert abouti et vérifié.
  await db.update(products).set({ imageUrl: primary?.storageUrl || primary?.sourceUrl || urls[0]!, gallery: Array.from(new Set(urls)), mediaTransferState: "complete" }).where(eq(products.id, productId));
}

export async function listAdminMedia(productId?: number) {
  const db = await ensureDb();
  const query = db.select({ asset: mediaAssets, productName: products.name, productSlug: products.slug }).from(mediaAssets).leftJoin(products, eq(mediaAssets.productId, products.id));
  const rows = productId
    ? await query.where(eq(mediaAssets.productId, productId)).orderBy(mediaAssets.position, mediaAssets.createdAt)
    : await query.orderBy(desc(mediaAssets.createdAt)).limit(300);
  return rows.map((row) => ({ ...row.asset, productName: row.productName, productSlug: row.productSlug }));
}

export async function uploadAdminMedia(actorUserId: number, input: { productId: number; kind: AdminMediaKind; image: string; position?: number }) {
  const db = await ensureDb();
  const product = (await db.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).limit(1))[0];
  if (!product) throw new Error("Produit introuvable");
  const { buffer, contentType } = parseAdminImage(input.image);
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const uploaded = await storagePut(`catalogue/${input.productId}/${crypto.randomUUID()}.${extension}`, buffer, contentType);
  const [{ maxPosition }] = await db.select({ maxPosition: sql<number>`coalesce(max(${mediaAssets.position}), -1)` }).from(mediaAssets).where(eq(mediaAssets.productId, input.productId));
  const position = input.position == null ? Number(maxPosition) + 1 : input.position;
  const result = await db.insert(mediaAssets).values({ productId: input.productId, kind: input.kind, position, sourceUrl: uploaded.url, storageKey: uploaded.key, storageUrl: uploaded.url, contentType, transferStatus: "transferred", attemptCount: 1 });
  const assetId = Number(result[0].insertId);
  if (input.kind === "primary") await db.update(mediaAssets).set({ kind: "gallery" }).where(and(eq(mediaAssets.productId, input.productId), eq(mediaAssets.kind, "primary")));
  await db.update(mediaAssets).set({ kind: input.kind }).where(eq(mediaAssets.id, assetId));
  await synchroniseProductMedia(db, input.productId);
  await logAdminActivity(actorUserId, "media_uploaded", "media_asset", assetId, null, { productId: input.productId, kind: input.kind, storageKey: uploaded.key });
  return (await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1))[0] ?? null;
}

export async function updateAdminMedia(actorUserId: number, assetId: number, input: { kind: AdminMediaKind; position: number }) {
  const db = await ensureDb();
  const asset = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1))[0];
  if (!asset?.productId) throw new Error("Média catalogue introuvable");
  if (input.kind === "primary") await db.update(mediaAssets).set({ kind: "gallery" }).where(and(eq(mediaAssets.productId, asset.productId), eq(mediaAssets.kind, "primary")));
  await db.update(mediaAssets).set({ kind: input.kind, position: input.position }).where(eq(mediaAssets.id, assetId));
  await synchroniseProductMedia(db, asset.productId);
  await logAdminActivity(actorUserId, "media_updated", "media_asset", assetId, null, { productId: asset.productId, kind: input.kind, position: input.position });
  return (await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1))[0] ?? null;
}

export async function deleteAdminMedia(actorUserId: number, assetId: number) {
  const db = await ensureDb();
  const asset = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1))[0];
  if (!asset) throw new Error("Média introuvable");
  await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
  if (asset.productId) await synchroniseProductMedia(db, asset.productId);
  await logAdminActivity(actorUserId, "media_unlinked", "media_asset", assetId, null, { productId: asset.productId, storageKey: asset.storageKey });
  return { success: true };
}

export type AdminCategoryInput = {
  slug: string;
  parentCategory: CatalogueFamily;
  label: string;
  description: string;
  imageUrl: string;
  position: number;
};

export async function listAdminCategories() {
  const db = await ensureDb();
  return db.select().from(catalogueCategories).orderBy(catalogueCategories.parentCategory, catalogueCategories.position);
}

export async function createAdminCategory(actorUserId: number, input: AdminCategoryInput) {
  const db = await ensureDb();
  const result = await db.insert(catalogueCategories).values({ ...input, slug: input.slug.trim(), label: input.label.trim(), description: input.description.trim(), imageUrl: input.imageUrl.trim(), mediaSource: "Gestion administrative GunsMasterPro", mediaRightsStatus: "pending" });
  const id = Number(result[0].insertId);
  await logAdminActivity(actorUserId, "category_created", "category", id, null, { slug: input.slug });
  return (await db.select().from(catalogueCategories).where(eq(catalogueCategories.id, id)).limit(1))[0] ?? null;
}

export async function updateAdminCategory(actorUserId: number, categoryId: number, input: AdminCategoryInput) {
  const db = await ensureDb();
  const existing = (await db.select({ id: catalogueCategories.id }).from(catalogueCategories).where(eq(catalogueCategories.id, categoryId)).limit(1))[0];
  if (!existing) throw new Error("Catégorie introuvable");
  await db.update(catalogueCategories).set({ ...input, slug: input.slug.trim(), label: input.label.trim(), description: input.description.trim(), imageUrl: input.imageUrl.trim() }).where(eq(catalogueCategories.id, categoryId));
  await logAdminActivity(actorUserId, "category_updated", "category", categoryId, null, { slug: input.slug });
  return (await db.select().from(catalogueCategories).where(eq(catalogueCategories.id, categoryId)).limit(1))[0] ?? null;
}

export async function deleteAdminCategory(actorUserId: number, categoryId: number) {
  const db = await ensureDb();
  const existing = (await db.select({ id: catalogueCategories.id, slug: catalogueCategories.slug }).from(catalogueCategories).where(eq(catalogueCategories.id, categoryId)).limit(1))[0];
  if (!existing) throw new Error("Catégorie introuvable");
  await db.delete(catalogueCategories).where(eq(catalogueCategories.id, categoryId));
  await logAdminActivity(actorUserId, "category_deleted", "category", categoryId, null, { slug: existing.slug });
  return { success: true };
}

export async function listAdminUsers(search?: string) {
  const db = await ensureDb();
  const needle = search?.trim();
  return needle
    ? db.select().from(users).where(or(like(users.name, `%${needle}%`), like(users.email, `%${needle}%`), like(users.openId, `%${needle}%`))).orderBy(desc(users.lastSignedIn))
    : db.select().from(users).orderBy(desc(users.lastSignedIn));
}

export async function updateUserAccountStatus(actorUserId: number, targetUserId: number, status: AccountStatus, reason?: string) {
  const db = await ensureDb();
  if (actorUserId === targetUserId) throw new Error("Vous ne pouvez pas modifier votre propre statut.");
  const target = (await db.select({ id: users.id, openId: users.openId, role: users.role }).from(users).where(eq(users.id, targetUserId)).limit(1))[0];
  if (!target) throw new Error("Utilisateur introuvable");
  if (target.openId === ENV.ownerOpenId || target.role === "super_admin") throw new Error("Le compte propriétaire super-administrateur est protégé.");
  await db.update(users).set({ accountStatus: status, bannedAt: status === "banned" ? new Date() : null, banReason: status === "banned" ? reason?.trim() || "Bannissement administratif" : null, bannedByUserId: status === "banned" ? actorUserId : null }).where(eq(users.id, targetUserId));
  await logAdminActivity(actorUserId, status === "banned" ? "user_banned" : "user_reactivated", "user", targetUserId, targetUserId, status === "banned" ? { reason: reason?.trim() || null } : undefined);
  return { success: true, status };
}

export async function getMyAdminAccessRequest(applicantUserId: number) {
  const db = await ensureDb();
  return (await db.select().from(adminAccessRequests).where(eq(adminAccessRequests.applicantUserId, applicantUserId)).orderBy(desc(adminAccessRequests.createdAt)).limit(1))[0] ?? null;
}

export async function createAdminAccessRequest(applicantUserId: number, requestedMessage?: string) {
  const db = await ensureDb();
  const applicant = (await db.select({ id: users.id, role: users.role, accountStatus: users.accountStatus }).from(users).where(eq(users.id, applicantUserId)).limit(1))[0];
  if (!applicant) throw new Error("Compte introuvable");
  if (applicant.accountStatus === "banned") throw new Error("Ce compte est désactivé.");
  if (applicant.role !== "user") throw new Error("Ce compte dispose déjà d’un accès administrateur.");
  const pending = (await db.select({ id: adminAccessRequests.id }).from(adminAccessRequests).where(and(eq(adminAccessRequests.applicantUserId, applicantUserId), eq(adminAccessRequests.status, "pending"))).limit(1))[0];
  if (pending) throw new Error("Une demande d’accès administrateur est déjà en attente.");
  const result = await db.insert(adminAccessRequests).values({ applicantUserId, requestedMessage: requestedMessage?.trim() || null });
  const requestId = Number(result[0].insertId);
  await db.insert(platformWorkflowEvents).values({ userId: applicantUserId, eventType: "admin_access_requested", entityType: "admin_access_request", entityId: String(requestId), details: { hasMessage: Boolean(requestedMessage?.trim()) } });
  return (await db.select().from(adminAccessRequests).where(eq(adminAccessRequests.id, requestId)).limit(1))[0] ?? null;
}

export async function listAdminAccessRequests(status?: "pending" | AdminAccessDecision) {
  const db = await ensureDb();
  const query = db.select({ request: adminAccessRequests, applicantName: users.name, applicantEmail: users.email, applicantRole: users.role, applicantStatus: users.accountStatus }).from(adminAccessRequests).innerJoin(users, eq(adminAccessRequests.applicantUserId, users.id));
  const rows = status
    ? await query.where(eq(adminAccessRequests.status, status)).orderBy(desc(adminAccessRequests.createdAt))
    : await query.orderBy(desc(adminAccessRequests.createdAt));
  return rows.map(({ request, ...applicant }) => ({ ...request, ...applicant }));
}

export async function reviewAdminAccessRequest(actorUserId: number, requestId: number, decision: AdminAccessDecision, reviewerNote?: string) {
  const db = await ensureDb();
  const request = (await db.select().from(adminAccessRequests).where(eq(adminAccessRequests.id, requestId)).limit(1))[0];
  if (!request) throw new Error("Demande d’accès introuvable");
  const applicant = (await db.select({ id: users.id, role: users.role, accountStatus: users.accountStatus }).from(users).where(eq(users.id, request.applicantUserId)).limit(1))[0];
  if (!applicant) throw new Error("Compte demandeur introuvable");
  if (actorUserId === applicant.id) throw new Error("Vous ne pouvez pas traiter votre propre demande.");
  if (applicant.role === "super_admin") throw new Error("Le compte super-administrateur ne peut pas être modifié.");
  if (decision === "approved" || decision === "rejected") {
    if (request.status !== "pending") throw new Error("Seule une demande en attente peut être approuvée ou refusée.");
  } else if (request.status !== "approved" || applicant.role !== "admin") {
    throw new Error("Seul un administrateur approuvé peut voir son accès retiré.");
  }
  const reviewedAt = new Date();
  await db.update(adminAccessRequests).set({ status: decision, reviewedByUserId: actorUserId, reviewerNote: reviewerNote?.trim() || null, reviewedAt }).where(eq(adminAccessRequests.id, requestId));
  if (decision === "approved") {
    await db.update(users).set({ role: "admin", accountStatus: "active", bannedAt: null, banReason: null, bannedByUserId: null }).where(eq(users.id, applicant.id));
  } else if (decision === "revoked") {
    await db.update(users).set({ role: "user" }).where(eq(users.id, applicant.id));
  }
  const action = decision === "approved" ? "admin_access_approved" : decision === "rejected" ? "admin_access_rejected" : "admin_access_revoked";
  await logAdminActivity(actorUserId, action, "admin_access_request", requestId, applicant.id, { reviewerNote: reviewerNote?.trim() || null });
  await db.insert(platformWorkflowEvents).values({ userId: applicant.id, eventType: action, entityType: "admin_access_request", entityId: String(requestId), details: { reviewedByUserId: actorUserId, reviewerNote: reviewerNote?.trim() || null } });
  return (await db.select().from(adminAccessRequests).where(eq(adminAccessRequests.id, requestId)).limit(1))[0] ?? null;
}

export async function manageAdministratorRole(actorUserId: number, targetUserId: number, action: AdministratorRoleAction, note?: string) {
  const db = await ensureDb();
  if (actorUserId === targetUserId) throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
  const target = (await db.select({ id: users.id, openId: users.openId, role: users.role, accountStatus: users.accountStatus }).from(users).where(eq(users.id, targetUserId)).limit(1))[0];
  if (!target) throw new Error("Compte administrateur introuvable");
  if (target.openId === ENV.ownerOpenId) throw new Error("Le rôle du compte propriétaire super-administrateur est immuable.");
  if (target.accountStatus === "banned" && action === "promote_super_admin") throw new Error("Réactivez ce compte avant de le promouvoir.");
  let nextRole: "user" | "admin" | "super_admin";
  if (action === "promote_super_admin") {
    if (target.role !== "admin") throw new Error("Seul un administrateur approuvé peut être promu super-administrateur.");
    nextRole = "super_admin";
  } else if (action === "demote_admin") {
    if (target.role !== "super_admin") throw new Error("Seul un super-administrateur délégué peut être rétrogradé.");
    nextRole = "admin";
  } else {
    if (target.role === "user") throw new Error("Ce compte ne dispose pas d’un rôle administrateur à révoquer.");
    nextRole = "user";
  }
  await db.update(users).set({ role: nextRole }).where(eq(users.id, target.id));
  const eventType = action === "promote_super_admin" ? "administrator_promoted_super" : action === "demote_admin" ? "super_administrator_demoted" : "administrator_role_revoked";
  await logAdminActivity(actorUserId, eventType, "user", target.id, target.id, { fromRole: target.role, toRole: nextRole, note: note?.trim() || null });
  await db.insert(platformWorkflowEvents).values({ userId: target.id, eventType, entityType: "user", entityId: String(target.id), details: { actorUserId, fromRole: target.role, toRole: nextRole, note: note?.trim() || null } });
  return (await db.select().from(users).where(eq(users.id, target.id)).limit(1))[0] ?? null;
}

export async function getPlatformSettings() {
  const db = await ensureDb();
  const existing = (await db.select().from(platformSettings).orderBy(platformSettings.id).limit(1))[0];
  return existing ?? { id: 0, whatsappNumber: null, telegramHandle: null, locationNoticeVersion: "v1", locationRetentionDays: 30, updatedByUserId: null, createdAt: new Date(0), updatedAt: new Date(0) };
}

export async function updatePlatformSettings(actorUserId: number, input: { whatsappNumber?: string | null; telegramHandle?: string | null; locationNoticeVersion: string; locationRetentionDays: number }) {
  const db = await ensureDb();
  const current = (await db.select().from(platformSettings).orderBy(platformSettings.id).limit(1))[0];
  const values = { whatsappNumber: normaliseWhatsapp(input.whatsappNumber), telegramHandle: normaliseHandle(input.telegramHandle), locationNoticeVersion: input.locationNoticeVersion.trim(), locationRetentionDays: input.locationRetentionDays, updatedByUserId: actorUserId };
  if (current) await db.update(platformSettings).set(values).where(eq(platformSettings.id, current.id));
  else await db.insert(platformSettings).values(values);
  await logAdminActivity(actorUserId, "settings_updated", "settings", "platform", null, { whatsappConfigured: Boolean(values.whatsappNumber), telegramConfigured: Boolean(values.telegramHandle), retentionDays: values.locationRetentionDays });
  return getPlatformSettings();
}

function clientIp(headers: Record<string, string | string[] | undefined>) {
  const forwarded = headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  const ip = value?.trim() || headers["x-real-ip"]?.toString().trim() || "";
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.16.")) return null;
  return ip.replace(/^::ffff:/, "");
}

type CountryResponse = {
  country?: string;
  country_code?: string;
  code?: string;
  city?: string;
  subdivision?: string;
  region?: string;
  location?: { latitude?: number; longitude?: number; lat?: number; lon?: number };
};

async function lookupApproximateLocation(ip: string) {
  const response = await fetch(`https://api.country.is/${encodeURIComponent(ip)}?fields=city,subdivision,location`, { signal: AbortSignal.timeout(3500), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Le service de géolocalisation est momentanément indisponible.");
  const payload = await response.json() as CountryResponse;
  const countryCode = String(payload.country_code ?? payload.code ?? payload.country ?? "").trim().toUpperCase();
  if (!countryCode || countryCode.length > 8) throw new Error("Réponse de géolocalisation non exploitable.");
  return {
    countryCode,
    country: String(payload.country ?? countryCode).trim(),
    region: payload.subdivision?.trim() || payload.region?.trim() || null,
    city: payload.city?.trim() || null,
    latitude: payload.location?.latitude ?? payload.location?.lat ?? null,
    longitude: payload.location?.longitude ?? payload.location?.lon ?? null,
  };
}

export async function recordLocationConsent(input: { visitorId: string; consented: boolean; noticeVersion: string; userId: number | null; headers: Record<string, string | string[] | undefined> }) {
  const db = await ensureDb();
  const settings = await getPlatformSettings();
  const existing = (await db.select().from(visitorLocationConsents).where(eq(visitorLocationConsents.visitorId, input.visitorId)).limit(1))[0];
  const now = new Date();
  if (!input.consented) {
    if (existing) {
      await db.update(visitorLocationConsents).set({ consented: false, noticeVersion: input.noticeVersion, userId: input.userId, withdrawnAt: now }).where(eq(visitorLocationConsents.id, existing.id));
      await db.delete(visitorLocations).where(eq(visitorLocations.consentId, existing.id));
      await db.insert(visitorConnectionEvents).values({ consentId: existing.id, visitorId: input.visitorId, userId: input.userId, eventType: "consent_withdrawn" });
    } else {
      const result = await db.insert(visitorLocationConsents).values({ visitorId: input.visitorId, userId: input.userId, consented: false, noticeVersion: input.noticeVersion, withdrawnAt: now });
      await db.insert(visitorConnectionEvents).values({ consentId: Number(result[0].insertId), visitorId: input.visitorId, userId: input.userId, eventType: "consent_withdrawn" });
    }
    return { consented: false, location: null };
  }
  if (existing) await db.update(visitorLocationConsents).set({ consented: true, noticeVersion: input.noticeVersion, userId: input.userId, consentedAt: now, withdrawnAt: null }).where(eq(visitorLocationConsents.id, existing.id));
  else await db.insert(visitorLocationConsents).values({ visitorId: input.visitorId, userId: input.userId, consented: true, noticeVersion: input.noticeVersion, consentedAt: now });
  const consent = (await db.select().from(visitorLocationConsents).where(eq(visitorLocationConsents.visitorId, input.visitorId)).limit(1))[0];
  if (!consent) throw new Error("Préférence de localisation non enregistrée.");
  const ip = clientIp(input.headers);
  if (!ip) {
    await db.insert(visitorConnectionEvents).values({ consentId: consent.id, visitorId: input.visitorId, userId: input.userId, eventType: "location_unavailable" });
    return { consented: true, location: null };
  }
  let location: Awaited<ReturnType<typeof lookupApproximateLocation>>;
  try {
    location = await lookupApproximateLocation(ip);
  } catch {
    await db.insert(visitorConnectionEvents).values({ consentId: consent.id, visitorId: input.visitorId, userId: input.userId, eventType: "location_unavailable" });
    return { consented: true, location: null };
  }
  const expiresAt = new Date(now.getTime() + Math.max(1, Math.min(settings.locationRetentionDays, 365)) * 24 * 60 * 60 * 1000);
  await db.insert(visitorLocations).values({ consentId: consent.id, visitorId: input.visitorId, userId: input.userId, ...location, expiresAt });
  await db.insert(visitorConnectionEvents).values({ consentId: consent.id, visitorId: input.visitorId, userId: input.userId, eventType: "consent_granted", ...location });
  return { consented: true, location: { ...location, expiresAt } };
}

export async function getAdminLocationOverview() {
  const db = await ensureDb();
  const now = new Date();
  const locations = await db.select({ location: visitorLocations, userName: users.name, userEmail: users.email }).from(visitorLocations).leftJoin(users, eq(visitorLocations.userId, users.id)).where(gt(visitorLocations.expiresAt, now)).orderBy(desc(visitorLocations.createdAt)).limit(150);
  const byCountry = await db.select({ countryCode: visitorLocations.countryCode, country: visitorLocations.country, count: sql<number>`count(*)` }).from(visitorLocations).where(gt(visitorLocations.expiresAt, now)).groupBy(visitorLocations.countryCode, visitorLocations.country).orderBy(desc(sql`count(*)`)).limit(20);
  return { locations: locations.map((item) => ({ ...item.location, userName: item.userName, userEmail: item.userEmail })), countries: byCountry.map((item) => ({ ...item, count: Number(item.count) })) };
}

export async function listAdminLocationHistory(input?: { visitorId?: string; userId?: number }) {
  const db = await ensureDb();
  const query = db.select({ event: visitorConnectionEvents, userName: users.name, userEmail: users.email }).from(visitorConnectionEvents).leftJoin(users, eq(visitorConnectionEvents.userId, users.id));
  const rows = input?.visitorId
    ? await query.where(eq(visitorConnectionEvents.visitorId, input.visitorId)).orderBy(desc(visitorConnectionEvents.createdAt)).limit(200)
    : input?.userId
      ? await query.where(eq(visitorConnectionEvents.userId, input.userId)).orderBy(desc(visitorConnectionEvents.createdAt)).limit(200)
      : await query.orderBy(desc(visitorConnectionEvents.createdAt)).limit(200);
  return rows.map((row) => ({ ...row.event, userName: row.userName, userEmail: row.userEmail }));
}

export async function listAdminWorkflowEvents(input?: { eventType?: string; userId?: number }) {
  const db = await ensureDb();
  const query = db.select({ event: platformWorkflowEvents, userName: users.name, userEmail: users.email }).from(platformWorkflowEvents).leftJoin(users, eq(platformWorkflowEvents.userId, users.id));
  const rows = input?.userId
    ? await query.where(eq(platformWorkflowEvents.userId, input.userId)).orderBy(desc(platformWorkflowEvents.createdAt)).limit(250)
    : input?.eventType
      ? await query.where(eq(platformWorkflowEvents.eventType, input.eventType)).orderBy(desc(platformWorkflowEvents.createdAt)).limit(250)
      : await query.orderBy(desc(platformWorkflowEvents.createdAt)).limit(250);
  return rows.map((row) => ({ ...row.event, userName: row.userName, userEmail: row.userEmail }));
}

export async function listAdminNewsletterSubscriptions(search?: string) {
  const db = await ensureDb();
  const needle = search?.trim();
  const rows = needle
    ? await db.select().from(newsletterSubscriptions).where(like(newsletterSubscriptions.email, `%${needle}%`)).orderBy(desc(newsletterSubscriptions.updatedAt)).limit(250)
    : await db.select().from(newsletterSubscriptions).orderBy(desc(newsletterSubscriptions.updatedAt)).limit(250);
  return rows.map((row) => ({ ...row, status: row.unsubscribedAt ? "unsubscribed" as const : "subscribed" as const }));
}

export async function getAdminOverview() {
  const db = await ensureDb();
  const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [requestCount] = await db.select({ count: sql<number>`count(*)` }).from(catalogueRequests).where(sql`${catalogueRequests.status} <> 'closed'`);
  const [locationCount] = await db.select({ count: sql<number>`count(*)` }).from(visitorLocations).where(gt(visitorLocations.expiresAt, new Date()));
  const [newsletterCount] = await db.select({ count: sql<number>`count(*)` }).from(newsletterSubscriptions).where(sql`${newsletterSubscriptions.unsubscribedAt} IS NULL`);
  const [cartCount] = await db.select({ count: sql<number>`count(*)` }).from(catalogueActivityEvents).where(eq(catalogueActivityEvents.eventType, "cart_added"));
  const recentActivity = await db.select().from(adminActivityLogs).orderBy(desc(adminActivityLogs.createdAt)).limit(20);
  return { products: Number(productCount?.count ?? 0), users: Number(userCount?.count ?? 0), activeRequests: Number(requestCount?.count ?? 0), activeLocations: Number(locationCount?.count ?? 0), activeNewsletterSubscriptions: Number(newsletterCount?.count ?? 0), cartEvents: Number(cartCount?.count ?? 0), recentActivity };
}
