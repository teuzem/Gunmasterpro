import { boolean, double, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "admin", "user"]).default("user").notNull(),
  accountStatus: mysqlEnum("accountStatus", ["active", "banned"]).default("active").notNull(),
  bannedAt: timestamp("bannedAt"),
  banReason: text("banReason"),
  bannedByUserId: int("bannedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const catalogueCategories = mysqlTable("catalogueCategories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  parentCategory: mysqlEnum("parentCategory", ["handguns", "rifles", "shotguns", "accessories"]).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 2048 }).notNull(),
  mediaSource: varchar("mediaSource", { length: 255 }).notNull(),
  mediaRightsStatus: mysqlEnum("mediaRightsStatus", ["pending", "verified"]).default("verified").notNull(),
  position: int("position").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("categories_parent_idx").on(table.parentCategory), index("categories_position_idx").on(table.position)]);

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: varchar("sourceId", { length: 32 }).unique(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  name: varchar("name", { length: 240 }).notNull(),
  brand: varchar("brand", { length: 180 }).notNull(),
  category: mysqlEnum("category", ["handguns", "rifles", "shotguns", "accessories"]).notNull(),
  subCategory: varchar("subCategory", { length: 120 }).notNull().default("general"),
  manufacturer: varchar("manufacturer", { length: 180 }).notNull().default("GunsMasterPro"),
  model: varchar("model", { length: 180 }).notNull().default("Standard"),
  excerpt: text("excerpt").notNull(),
  description: text("description").notNull(),
  referencePriceCents: int("referencePriceCents").notNull(),
  priceCents: int("priceCents").notNull(),
  stock: int("stock").notNull().default(0),
  caliber: varchar("caliber", { length: 100 }).notNull(),
  material: varchar("material", { length: 160 }).notNull(),
  capacity: varchar("capacity", { length: 80 }).notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  barrelLength: varchar("barrelLength", { length: 80 }).notNull(),
  overallLength: varchar("overallLength", { length: 80 }).notNull(),
  weight: varchar("weight", { length: 80 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 2048 }).notNull(),
  gallery: json("gallery").$type<string[]>().notNull(),
  specifications: json("specifications").$type<Record<string, string>>(),
  mediaSource: varchar("mediaSource", { length: 255 }).notNull(),
  mediaRightsStatus: mysqlEnum("mediaRightsStatus", ["pending", "verified"]).default("verified").notNull(),
  mediaTransferState: mysqlEnum("mediaTransferState", ["pending", "partial", "complete"]).default("pending").notNull(),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("products_category_idx").on(table.category),
  index("products_brand_idx").on(table.brand),
  index("products_sub_category_idx").on(table.subCategory),
]);

export const mediaAssets = mysqlTable("mediaAssets", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }),
  categorySlug: varchar("categorySlug", { length: 120 }),
  kind: mysqlEnum("kind", ["primary", "gallery", "category"]).notNull(),
  position: int("position").notNull().default(0),
  // 700 caractères maximum : la colonne porte un index UNIQUE et InnoDB limite
  // une clé d'index à 3072 octets. En utf8mb4 (4 octets par caractère), 700
  // caractères représentent 2800 octets, soit 272 octets de marge — InnoDB
  // ajoutant encore quelques octets à l'enregistrement d'index, la limite
  // utile est inférieure aux 768 caractères purement théoriques.
  // Un varchar(2048) indexé renvoyait ER_TOO_LONG_KEY (1071) à la création de
  // la table : aucune migration ne pouvait aboutir sur une base neuve.
  // Les URL du catalogue sont des chemins /manus-storage/… de quelques dizaines
  // de caractères, largement en dessous.
  sourceUrl: varchar("sourceUrl", { length: 700 }).notNull(),
  storageKey: varchar("storageKey", { length: 2048 }),
  storageUrl: varchar("storageUrl", { length: 2048 }),
  contentType: varchar("contentType", { length: 120 }),
  checksum: varchar("checksum", { length: 128 }),
  transferStatus: mysqlEnum("transferStatus", ["pending", "transferred", "failed"]).default("pending").notNull(),
  attemptCount: int("attemptCount").notNull().default(0),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("media_asset_source_unique").on(table.sourceUrl),
  index("media_product_idx").on(table.productId),
  index("media_transfer_idx").on(table.transferStatus),
]);

export const mediaImportBatches = mysqlTable("mediaImportBatches", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "paused", "completed", "failed"]).default("pending").notNull(),
  requestedCount: int("requestedCount").notNull().default(0),
  transferredCount: int("transferredCount").notNull().default(0),
  failedCount: int("failedCount").notNull().default(0),
  cursor: int("cursor").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const homeHeroSlides = mysqlTable("homeHeroSlides", {
  id: int("id").autoincrement().primaryKey(),
  position: int("position").notNull(),
  categorySlug: varchar("categorySlug", { length: 120 }),
  targetPath: varchar("targetPath", { length: 320 }).notNull(),
  storageKey: varchar("storageKey", { length: 2048 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 2048 }).notNull(),
  altText: json("altText").$type<Record<"fr" | "en" | "de", string>>().notNull(),
  eyebrow: json("eyebrow").$type<Record<"fr" | "en" | "de", string>>().notNull(),
  title: json("title").$type<Record<"fr" | "en" | "de", string>>().notNull(),
  description: json("description").$type<Record<"fr" | "en" | "de", string>>().notNull(),
  ctaLabel: json("ctaLabel").$type<Record<"fr" | "en" | "de", string>>().notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("hero_position_unique").on(table.position), index("hero_active_position_idx").on(table.isActive, table.position)]);

export const newsletterSubscriptions = mysqlTable("newsletterSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  locale: mysqlEnum("locale", ["fr", "en", "de"]).notNull().default("fr"),
  consentAt: timestamp("consentAt").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const wishlists = mysqlTable("wishlists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("wishlist_user_product_unique").on(table.userId, table.productId), index("wishlist_user_idx").on(table.userId)]);

export const userCollections = mysqlTable("userCollections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  isSystemSaved: boolean("isSystemSaved").notNull().default(false),
  isArchived: boolean("isArchived").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("collection_user_idx").on(table.userId, table.isArchived)]);

export const collectionItems = mysqlTable("collectionItems", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull().references(() => userCollections.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("collection_product_unique").on(table.collectionId, table.productId), index("collection_items_position_idx").on(table.collectionId, table.position)]);

export const productReviews = mysqlTable("productReviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: int("rating").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  moderatedByUserId: int("moderatedByUserId").references(() => users.id, { onDelete: "set null" }),
  moderationNote: text("moderationNote"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("review_user_product_unique").on(table.userId, table.productId), index("review_product_status_idx").on(table.productId, table.status)]);

export const reviewMedia = mysqlTable("reviewMedia", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull().references(() => productReviews.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 2048 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 2048 }).notNull(),
  contentType: varchar("contentType", { length: 120 }).notNull(),
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("review_media_position_idx").on(table.reviewId, table.position)]);

export const catalogueRequests = mysqlTable("catalogueRequests", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 64 }).notNull().unique(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  customerName: varchar("customerName", { length: 180 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 80 }).notNull(),
  locale: mysqlEnum("locale", ["fr", "en", "de"]).notNull().default("fr"),
  countryCode: varchar("countryCode", { length: 8 }),
  countryContextConsent: boolean("countryContextConsent").notNull().default(false),
  couponCode: varchar("couponCode", { length: 80 }),
  subtotalCents: int("subtotalCents").notNull(),
  totalCents: int("totalCents").notNull(),
  status: mysqlEnum("status", ["received", "under_review", "information_required", "closed"]).notNull().default("received"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("request_email_reference_idx").on(table.customerEmail, table.reference), index("request_status_created_idx").on(table.status, table.createdAt)]);

export const catalogueRequestItems = mysqlTable("catalogueRequestItems", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => catalogueRequests.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: int("quantity").notNull(),
  unitPriceCents: int("unitPriceCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("request_items_request_idx").on(table.requestId)]);

export const catalogueRequestEvents = mysqlTable("catalogueRequestEvents", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => catalogueRequests.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["received", "under_review", "information_required", "closed"]).notNull(),
  note: text("note"),
  createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("request_events_idx").on(table.requestId, table.createdAt)]);

export const productSpecificationAudits = mysqlTable("productSpecificationAudits", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  fieldName: varchar("fieldName", { length: 120 }).notNull(),
  value: text("value").notNull(),
  sourceLabel: varchar("sourceLabel", { length: 255 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 2048 }),
  verificationStatus: mysqlEnum("verificationStatus", ["verified", "unconfirmed", "not_applicable"]).notNull().default("unconfirmed"),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("spec_audit_product_field_unique").on(table.productId, table.fieldName), index("spec_audit_status_idx").on(table.verificationStatus)]);

export const catalogueActivityEvents = mysqlTable("catalogueActivityEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  productId: int("productId").references(() => products.id, { onDelete: "set null" }),
  eventType: mysqlEnum("eventType", ["cart_added", "wishlist_toggled", "request_created"]).notNull(),
  locale: mysqlEnum("locale", ["fr", "en", "de"]).notNull().default("fr"),
  countryCode: varchar("countryCode", { length: 8 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("activity_event_created_idx").on(table.eventType, table.createdAt), index("activity_user_idx").on(table.userId, table.createdAt)]);

export const platformSettings = mysqlTable("platformSettings", {
  id: int("id").autoincrement().primaryKey(),
  whatsappNumber: varchar("whatsappNumber", { length: 80 }),
  telegramHandle: varchar("telegramHandle", { length: 120 }),
  locationNoticeVersion: varchar("locationNoticeVersion", { length: 32 }).notNull().default("v1"),
  locationRetentionDays: int("locationRetentionDays").notNull().default(30),
  updatedByUserId: int("updatedByUserId").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const visitorLocationConsents = mysqlTable("visitorLocationConsents", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 96 }).notNull().unique(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  consented: boolean("consented").notNull().default(false),
  noticeVersion: varchar("noticeVersion", { length: 32 }).notNull(),
  consentedAt: timestamp("consentedAt"),
  withdrawnAt: timestamp("withdrawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("visitor_consent_user_idx").on(table.userId), index("visitor_consent_active_idx").on(table.consented, table.updatedAt)]);

export const visitorLocations = mysqlTable("visitorLocations", {
  id: int("id").autoincrement().primaryKey(),
  consentId: int("consentId").notNull().references(() => visitorLocationConsents.id, { onDelete: "cascade" }),
  visitorId: varchar("visitorId", { length: 96 }).notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  countryCode: varchar("countryCode", { length: 8 }).notNull(),
  country: varchar("country", { length: 120 }).notNull(),
  region: varchar("region", { length: 180 }),
  city: varchar("city", { length: 180 }),
  latitude: double("latitude"),
  longitude: double("longitude"),
  source: varchar("source", { length: 80 }).notNull().default("country.is"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("visitor_location_country_idx").on(table.countryCode, table.createdAt), index("visitor_location_consent_idx").on(table.consentId), index("visitor_location_expiry_idx").on(table.expiresAt)]);

export const visitorConnectionEvents = mysqlTable("visitorConnectionEvents", {
  id: int("id").autoincrement().primaryKey(),
  consentId: int("consentId").references(() => visitorLocationConsents.id, { onDelete: "set null" }),
  visitorId: varchar("visitorId", { length: 96 }).notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  eventType: mysqlEnum("eventType", ["consent_granted", "consent_withdrawn", "visit_recorded", "location_unavailable"]).notNull(),
  countryCode: varchar("countryCode", { length: 8 }),
  country: varchar("country", { length: 120 }),
  region: varchar("region", { length: 180 }),
  city: varchar("city", { length: 180 }),
  latitude: double("latitude"),
  longitude: double("longitude"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("connection_visitor_created_idx").on(table.visitorId, table.createdAt), index("connection_user_created_idx").on(table.userId, table.createdAt), index("connection_event_created_idx").on(table.eventType, table.createdAt)]);

export const platformWorkflowEvents = mysqlTable("platformWorkflowEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  visitorId: varchar("visitorId", { length: 96 }),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 120 }),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("workflow_event_created_idx").on(table.createdAt), index("workflow_event_type_created_idx").on(table.eventType, table.createdAt), index("workflow_event_user_created_idx").on(table.userId, table.createdAt)]);

export const adminActivityLogs = mysqlTable("adminActivityLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  targetUserId: int("targetUserId").references(() => users.id, { onDelete: "set null" }),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 120 }),
  action: varchar("action", { length: 120 }).notNull(),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("admin_activity_created_idx").on(table.createdAt), index("admin_activity_target_idx").on(table.targetUserId, table.createdAt)]);

export const adminAccessRequests = mysqlTable("adminAccessRequests", {
  id: int("id").autoincrement().primaryKey(),
  applicantUserId: int("applicantUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedMessage: varchar("requestedMessage", { length: 1000 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "revoked"]).notNull().default("pending"),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
  reviewerNote: varchar("reviewerNote", { length: 1000 }),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("admin_access_request_applicant_idx").on(table.applicantUserId, table.createdAt),
  index("admin_access_request_status_idx").on(table.status, table.createdAt),
]);

export const catalogueImportBatches = mysqlTable("catalogueImportBatches", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull().references(() => users.id, { onDelete: "restrict" }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 2048 }),
  format: mysqlEnum("format", ["csv", "xlsx", "json"]).notNull(),
  mode: mysqlEnum("mode", ["create", "upsert"]).notNull(),
  status: mysqlEnum("status", ["validated", "completed", "failed"]).notNull(),
  receivedRows: int("receivedRows").notNull().default(0),
  createdRows: int("createdRows").notNull().default(0),
  updatedRows: int("updatedRows").notNull().default(0),
  errorSummary: text("errorSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("catalogue_import_actor_created_idx").on(table.actorUserId, table.createdAt), index("catalogue_import_status_created_idx").on(table.status, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type CatalogueCategory = typeof catalogueCategories.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type HomeHeroSlide = typeof homeHeroSlides.$inferSelect;
export type PlatformSettings = typeof platformSettings.$inferSelect;
