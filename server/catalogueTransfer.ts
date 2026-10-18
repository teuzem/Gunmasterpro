import ExcelJS from "exceljs";
import { desc, inArray } from "drizzle-orm";
import { adminActivityLogs, catalogueImportBatches, platformWorkflowEvents, products } from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";

type CatalogueFamily = "handguns" | "rifles" | "shotguns" | "accessories";
type TransferFormat = "csv" | "xlsx" | "json";
type ImportMode = "create" | "upsert";

const families = new Set<CatalogueFamily>(["handguns", "rifles", "shotguns", "accessories"]);
const rightsStates = new Set(["pending", "verified"]);
const transferStates = new Set(["pending", "partial", "complete"]);
const maxRows = 500;
const maxBytes = 8 * 1024 * 1024;

export const transferColumns = [
  { key: "catalogueId", label: "catalogueId", width: 13, protected: true },
  { key: "sourceId", label: "sourceId", width: 14 },
  { key: "slug", label: "slug", width: 28 },
  { key: "name", label: "name", width: 34 },
  { key: "brand", label: "brand", width: 22 },
  { key: "category", label: "category", width: 16 },
  { key: "subCategory", label: "subCategory", width: 20 },
  { key: "manufacturer", label: "manufacturer", width: 23 },
  { key: "model", label: "model", width: 25 },
  { key: "excerpt", label: "excerpt", width: 44 },
  { key: "description", label: "description", width: 60 },
  { key: "referencePriceEUR", label: "referencePriceEUR", width: 20 },
  { key: "priceEUR", label: "priceEUR", width: 16 },
  { key: "stock", label: "stock", width: 11 },
  { key: "caliber", label: "caliber", width: 18 },
  { key: "material", label: "material", width: 24 },
  { key: "capacity", label: "capacity", width: 15 },
  { key: "action", label: "action", width: 22 },
  { key: "barrelLength", label: "barrelLength", width: 18 },
  { key: "overallLength", label: "overallLength", width: 18 },
  { key: "weight", label: "weight", width: 14 },
  { key: "imageUrl", label: "imageUrl", width: 54 },
  { key: "galleryJson", label: "galleryJson", width: 52 },
  { key: "specificationsJson", label: "specificationsJson", width: 60 },
  { key: "featured", label: "featured", width: 13 },
  { key: "mediaSource", label: "mediaSource", width: 36 },
  { key: "mediaRightsStatus", label: "mediaRightsStatus", width: 22 },
  { key: "mediaTransferState", label: "mediaTransferState", width: 22 },
] as const;

type TransferKey = (typeof transferColumns)[number]["key"];
type TransferRow = Record<TransferKey, string | number | boolean | null>;

export type ParsedBulkProduct = {
  sourceId: string | null;
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
  gallery: string[];
  specifications: Record<string, string>;
  featured: boolean;
  mediaSource: string;
  mediaRightsStatus: "pending" | "verified";
  mediaTransferState: "pending" | "partial" | "complete";
};

export type BulkValidation = {
  valid: boolean;
  totalRows: number;
  createCount: number;
  updateCount: number;
  errors: Array<{ row: number; message: string }>;
  rows: ParsedBulkProduct[];
};

const dbOrThrow = async () => {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  return db;
};

const text = (row: Record<string, unknown>, key: string) => String(row[key] ?? "").trim();
const required = (row: Record<string, unknown>, key: string, label: string, errors: string[]) => {
  const value = text(row, key);
  if (!value) errors.push(`« ${label} » est requis.`);
  return value;
};
const numberValue = (row: Record<string, unknown>, key: string, label: string, errors: string[], allowZero = true) => {
  const raw = row[key];
  const parsed = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(",", ".").trim());
  if (!Number.isFinite(parsed) || (!allowZero && parsed <= 0) || (allowZero && parsed < 0)) errors.push(`« ${label} » doit être un nombre ${allowZero ? "positif ou nul" : "strictement positif"}.`);
  return Number.isFinite(parsed) ? parsed : 0;
};
const parseJsonObject = (value: string, label: string, errors: string[]) => {
  if (!value) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [String(key), String(item)]));
  } catch {
    errors.push(`« ${label} » doit être un objet JSON valide.`);
    return {} as Record<string, string>;
  }
};
const parseJsonArray = (value: string, label: string, errors: string[]) => {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(item => typeof item !== "string")) throw new Error();
    return parsed.map(item => item.trim()).filter(Boolean);
  } catch {
    errors.push(`« ${label} » doit être un tableau JSON d’URL valide.`);
    return [] as string[];
  }
};
const parseBoolean = (value: unknown) => [true, 1, "1", "true", "vrai", "yes", "oui"].includes(typeof value === "string" ? value.trim().toLowerCase() : value as boolean | number);
const imagePathIsAllowed = (value: string) => value.startsWith("/manus-storage/") || /^https:\/\//i.test(value);

function productToTransferRow(product: typeof products.$inferSelect): TransferRow {
  return {
    catalogueId: product.id,
    sourceId: product.sourceId,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    subCategory: product.subCategory,
    manufacturer: product.manufacturer,
    model: product.model,
    excerpt: product.excerpt,
    description: product.description,
    referencePriceEUR: product.referencePriceCents / 100,
    priceEUR: product.priceCents / 100,
    stock: product.stock,
    caliber: product.caliber,
    material: product.material,
    capacity: product.capacity,
    action: product.action,
    barrelLength: product.barrelLength,
    overallLength: product.overallLength,
    weight: product.weight,
    imageUrl: product.imageUrl,
    galleryJson: JSON.stringify(product.gallery ?? []),
    specificationsJson: JSON.stringify(product.specifications ?? {}),
    featured: product.featured,
    mediaSource: product.mediaSource,
    mediaRightsStatus: product.mediaRightsStatus,
    mediaTransferState: product.mediaTransferState,
  };
}

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const columnLetter = (position: number) => {
  let current = position;
  let result = "";
  while (current > 0) { const remainder = (current - 1) % 26; result = String.fromCharCode(65 + remainder) + result; current = Math.floor((current - 1) / 26); }
  return result;
};

export async function createCatalogueExport(format: TransferFormat, template = false) {
  const db = await dbOrThrow();
  const selected = await db.select().from(products).orderBy(desc(products.updatedAt)).limit(template ? 2 : 10_000);
  const rows = selected.map(productToTransferRow);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") return { fileName: `${template ? "modele" : "sauvegarde"}-catalogue-${stamp}.json`, contentType: "application/json", base64: Buffer.from(JSON.stringify({ schema: "gunsmasterpro.catalogue.v1", exportedAt: new Date().toISOString(), rows }, null, 2)).toString("base64"), rowCount: rows.length };
  if (format === "csv") {
    const content = [transferColumns.map(column => csvCell(column.label)).join(";"), ...rows.map(row => transferColumns.map(column => csvCell(row[column.key])).join(";"))].join("\n");
    return { fileName: `${template ? "modele" : "sauvegarde"}-catalogue-${stamp}.csv`, contentType: "text/csv;charset=utf-8", base64: Buffer.from(`\uFEFF${content}`).toString("base64"), rowCount: rows.length };
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GunsMasterPro";
  workbook.created = new Date();
  const guide = workbook.addWorksheet("Lire avant import");
  guide.getColumn(1).width = 28;
  guide.getColumn(2).width = 110;
  guide.addRow([template ? "Modèle d’import" : "Sauvegarde catalogue", template ? "Remplissez ou adaptez les lignes de l’onglet Catalogue. Les colonnes doivent être conservées à l’identique. Les prix sont exprimés en euros, les galeries et spécifications sont du JSON." : "Export complet structuré du catalogue. L’onglet Catalogue est filtrable, figé et directement réimportable en mode mise à jour."]);
  guide.addRow(["Contrôles", "L’import valide toutes les lignes avant toute écriture. Les catégories sont : handguns, rifles, shotguns, accessories. imageUrl doit être une URL HTTPS ou /manus-storage/. galleryJson est un tableau JSON d’URL ; specificationsJson est un objet JSON."]);
  guide.addRow(["Sécurité", "Le mode Créer refuse tout slug existant. Le mode Mettre à jour crée les nouveaux slugs et met à jour les slugs existants. Une confirmation explicite est toujours demandée avant l’écriture."]);
  guide.eachRow(row => { row.getCell(1).font = { bold: true, color: { argb: "1B4D8F" } }; row.alignment = { vertical: "top", wrapText: true }; });
  guide.getRow(1).height = 40;
  const sheet = workbook.addWorksheet("Catalogue", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = transferColumns.map(column => ({ header: column.label, key: column.key, width: column.width }));
  rows.forEach(row => sheet.addRow(row));
  sheet.autoFilter = { from: "A1", to: `${columnLetter(transferColumns.length)}1` };
  sheet.getRow(1).height = 28;
  sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D3B66" } }; cell.alignment = { vertical: "middle", wrapText: true }; });
  sheet.getColumn("referencePriceEUR").numFmt = '#,##0.00 [$€-fr-FR]';
  sheet.getColumn("priceEUR").numFmt = '#,##0.00 [$€-fr-FR]';
  sheet.eachRow((row, index) => { if (index > 1) { row.alignment = { vertical: "top", wrapText: true }; row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? "FFF7FAFC" : "FFFFFFFF" } }; } });
  const buffer = await workbook.xlsx.writeBuffer();
  return { fileName: `${template ? "modele" : "sauvegarde"}-catalogue-${stamp}.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", base64: Buffer.from(buffer).toString("base64"), rowCount: rows.length };
}

function parseRow(row: Record<string, unknown>, rowNumber: number) {
  const errors: string[] = [];
  const category = required(row, "category", "category", errors) as CatalogueFamily;
  if (category && !families.has(category)) errors.push("« category » doit valoir handguns, rifles, shotguns ou accessories.");
  const imageUrl = required(row, "imageUrl", "imageUrl", errors);
  if (imageUrl && !imagePathIsAllowed(imageUrl)) errors.push("« imageUrl » doit commencer par https:// ou /manus-storage/.");
  const rights = text(row, "mediaRightsStatus") || "pending";
  if (!rightsStates.has(rights)) errors.push("« mediaRightsStatus » doit valoir pending ou verified.");
  const transfer = text(row, "mediaTransferState") || "pending";
  if (!transferStates.has(transfer)) errors.push("« mediaTransferState » doit valoir pending, partial ou complete.");
  const parsed: ParsedBulkProduct = {
    sourceId: text(row, "sourceId") || null,
    slug: required(row, "slug", "slug", errors).toLowerCase().replace(/\s+/g, "-"),
    name: required(row, "name", "name", errors),
    brand: required(row, "brand", "brand", errors),
    category: category || "handguns",
    subCategory: required(row, "subCategory", "subCategory", errors),
    manufacturer: required(row, "manufacturer", "manufacturer", errors),
    model: required(row, "model", "model", errors),
    excerpt: required(row, "excerpt", "excerpt", errors),
    description: required(row, "description", "description", errors),
    referencePriceCents: Math.round(numberValue(row, "referencePriceEUR", "referencePriceEUR", errors, true) * 100),
    priceCents: Math.round(numberValue(row, "priceEUR", "priceEUR", errors, true) * 100),
    stock: Math.round(numberValue(row, "stock", "stock", errors, true)),
    caliber: required(row, "caliber", "caliber", errors),
    material: required(row, "material", "material", errors),
    capacity: required(row, "capacity", "capacity", errors),
    action: required(row, "action", "action", errors),
    barrelLength: required(row, "barrelLength", "barrelLength", errors),
    overallLength: required(row, "overallLength", "overallLength", errors),
    weight: required(row, "weight", "weight", errors),
    imageUrl,
    gallery: parseJsonArray(text(row, "galleryJson"), "galleryJson", errors),
    specifications: parseJsonObject(text(row, "specificationsJson"), "specificationsJson", errors),
    featured: parseBoolean(row.featured),
    mediaSource: text(row, "mediaSource") || "Import catalogue super-administrateur",
    mediaRightsStatus: rights as "pending" | "verified",
    mediaTransferState: transfer as "pending" | "partial" | "complete",
  };
  if (parsed.referencePriceCents < parsed.priceCents) errors.push("Le prix de référence doit être supérieur ou égal au prix de vente.");
  if (!parsed.gallery.length) parsed.gallery = [parsed.imageUrl];
  return { parsed, errors: errors.map(message => ({ row: rowNumber, message })) };
}

export async function validateCatalogueImportRows(inputRows: Array<Record<string, unknown>>, mode: ImportMode): Promise<BulkValidation> {
  if (!Array.isArray(inputRows) || !inputRows.length) return { valid: false, totalRows: 0, createCount: 0, updateCount: 0, errors: [{ row: 0, message: "Le fichier ne contient aucune ligne de produit." }], rows: [] };
  if (inputRows.length > maxRows) return { valid: false, totalRows: inputRows.length, createCount: 0, updateCount: 0, errors: [{ row: 0, message: `La limite sécurisée est de ${maxRows} produits par import.` }], rows: [] };
  const parsed = inputRows.map((row, index) => parseRow(row, index + 2));
  const rows = parsed.map(item => item.parsed);
  const errors = parsed.flatMap(item => item.errors);
  const seen = new Set<string>();
  rows.forEach((row, index) => { if (seen.has(row.slug)) errors.push({ row: index + 2, message: `Le slug « ${row.slug} » est dupliqué dans le fichier.` }); seen.add(row.slug); });
  const db = await dbOrThrow();
  const existing = await db.select({ slug: products.slug }).from(products).where(inArray(products.slug, rows.map(row => row.slug)));
  const existingSlugs = new Set(existing.map(product => product.slug));
  if (mode === "create") rows.forEach((row, index) => { if (existingSlugs.has(row.slug)) errors.push({ row: index + 2, message: `Le slug « ${row.slug} » existe déjà : utilisez le mode Mettre à jour.` }); });
  return { valid: errors.length === 0, totalRows: rows.length, createCount: rows.filter(row => !existingSlugs.has(row.slug)).length, updateCount: rows.filter(row => existingSlugs.has(row.slug)).length, errors: errors.slice(0, 60), rows };
}

const databaseValues = (row: ParsedBulkProduct, sourceId?: string | null) => ({
  sourceId: sourceId ?? row.sourceId,
  slug: row.slug,
  name: row.name,
  brand: row.brand,
  category: row.category,
  subCategory: row.subCategory,
  manufacturer: row.manufacturer,
  model: row.model,
  excerpt: row.excerpt,
  description: row.description,
  referencePriceCents: row.referencePriceCents,
  priceCents: row.priceCents,
  stock: row.stock,
  caliber: row.caliber,
  material: row.material,
  capacity: row.capacity,
  action: row.action,
  barrelLength: row.barrelLength,
  overallLength: row.overallLength,
  weight: row.weight,
  imageUrl: row.imageUrl,
  gallery: row.gallery,
  specifications: row.specifications,
  mediaSource: row.mediaSource,
  mediaRightsStatus: row.mediaRightsStatus,
  mediaTransferState: row.mediaTransferState,
  featured: row.featured,
});

export async function applyCatalogueImport(input: { actorUserId: number; rows: Array<Record<string, unknown>>; mode: ImportMode; fileName: string; format: TransferFormat; contentBase64: string }) {
  const validation = await validateCatalogueImportRows(input.rows, input.mode);
  if (!validation.valid) return { applied: false as const, validation };
  const raw = Buffer.from(input.contentBase64, "base64");
  if (!raw.length || raw.length > maxBytes) throw new Error(`Le fichier source doit peser entre 1 octet et ${Math.floor(maxBytes / 1024 / 1024)} Mo.`);
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-180) || `import.${input.format}`;
  const stored = await storagePut(`catalogue-imports/${input.actorUserId}/${Date.now()}-${safeName}`, raw, input.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : input.format === "csv" ? "text/csv" : "application/json");
  const db = await dbOrThrow();
  const existing = await db.select({ id: products.id, slug: products.slug, sourceId: products.sourceId }).from(products).where(inArray(products.slug, validation.rows.map(row => row.slug)));
  const existingBySlug = new Map(existing.map(product => [product.slug, product]));
  let createdRows = 0;
  let updatedRows = 0;
  try {
    await db.transaction(async tx => {
      for (const row of validation.rows) {
        const current = existingBySlug.get(row.slug);
        if (current) {
          await tx.update(products).set(databaseValues(row, row.sourceId ?? current.sourceId)).where(inArray(products.id, [current.id]));
          updatedRows += 1;
        } else {
          await tx.insert(products).values(databaseValues(row));
          createdRows += 1;
        }
      }
      await tx.insert(catalogueImportBatches).values({ actorUserId: input.actorUserId, fileName: input.fileName.slice(0, 255), fileKey: stored.key, format: input.format, mode: input.mode, status: "completed", receivedRows: validation.totalRows, createdRows, updatedRows, errorSummary: null });
    });
  } catch (error) {
    await db.insert(catalogueImportBatches).values({ actorUserId: input.actorUserId, fileName: input.fileName.slice(0, 255), fileKey: stored.key, format: input.format, mode: input.mode, status: "failed", receivedRows: validation.totalRows, createdRows: 0, updatedRows: 0, errorSummary: error instanceof Error ? error.message.slice(0, 1000) : "Erreur transactionnelle" });
    throw error;
  }
  await db.insert(adminActivityLogs).values({ actorUserId: input.actorUserId, targetUserId: null, entityType: "catalogue_import", entityId: safeName, action: "catalogue_bulk_import_completed", details: { mode: input.mode, format: input.format, receivedRows: validation.totalRows, createdRows, updatedRows, fileKey: stored.key } });
  await db.insert(platformWorkflowEvents).values({ userId: input.actorUserId, eventType: "catalogue_bulk_import_completed", entityType: "catalogue_import", entityId: safeName, details: { mode: input.mode, format: input.format, receivedRows: validation.totalRows, createdRows, updatedRows } });
  return { applied: true as const, validation, createdRows, updatedRows, storageUrl: stored.url };
}
