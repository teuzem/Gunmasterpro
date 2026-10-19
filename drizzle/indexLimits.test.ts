import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { getTableConfig } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";

// InnoDB limite une clé d'index à 3072 octets. En utf8mb4 (4 octets par
// caractère), 768 caractères atteignent la limite — moins si l'on compte les
// octets que InnoDB ajoute à l'enregistrement d'index. On retient 700.
const MAX_KEY_BYTES = 3072;
const BYTES_PER_CHAR = 4;
const SAFE_CHARS = 700;

/**
 * Le schéma est introspecté via l'API Drizzle et non analysé par expression
 * régulière : le découpage textuel de mysqlTable() est fragile (les index sont
 * déclarés dans un callback séparé) et l'API restitue les colonnes et index
 * réellement déclarés. getTableConfig lève une exception sur tout objet qui
 * n'est pas une table, ce qui tient lieu de filtre fiable.
 */
const tables = Object.values(schema).flatMap((value) => {
  if (typeof value !== "object" || value === null) return [];
  try {
    return [getTableConfig(value)];
  } catch {
    return [];
  }
});

function byteLengthOf(tableName: string, columnName: string): number | undefined {
  const table = tables.find((entry) => entry.name === tableName);
  const column = table?.columns.find((entry) => entry.name === columnName);
  if (!column) return undefined;
  const declared = /char\((\d+)\)/.exec(column.getSQLType()) ?? /varchar\((\d+)\)/.exec(column.getSQLType());
  return declared ? Number(declared[1]) * BYTES_PER_CHAR : undefined;
}

describe("limites de clé d'index MySQL", () => {
  it("introspecte les tables du schéma", () => {
    expect(tables.length).toBeGreaterThan(5);
    expect(tables.reduce((total, table) => total + table.indexes.length, 0)).toBeGreaterThan(0);
  });

  it("n'indexe aucune colonne dépassant la limite InnoDB", () => {
    const offenders: string[] = [];
    for (const table of tables) {
      for (const index of table.indexes) {
        for (const column of index.config.columns) {
          const columnName = (column as { name: string }).name;
          const bytes = byteLengthOf(table.name, columnName);
          if (bytes !== undefined && bytes > MAX_KEY_BYTES) {
            offenders.push(`${table.name}.${columnName} = ${bytes} octets via ${index.config.name}`);
          }
        }
      }
    }
    // ER_TOO_LONG_KEY (1071) : la table ne peut pas être créée, donc aucune
    // migration n'aboutit et l'application ne démarre pas.
    expect(offenders).toEqual([]);
  });

  it("conserve la colonne unique des médias dans une marge sûre", () => {
    // Régression concrète : mediaAssets.sourceUrl était en varchar(2048) avec un
    // index UNIQUE, soit 8192 octets. La création de la table échouait, donc
    // aucune migration n'avait jamais abouti sur une base neuve.
    expect(byteLengthOf("mediaAssets", "sourceUrl")).toBe(SAFE_CHARS * BYTES_PER_CHAR);
  });

  it("ne génère aucune migration avec une clé trop longue", () => {
    const directory = path.join(process.cwd(), "drizzle");
    const files = readdirSync(directory).filter((file) => file.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const sql = readFileSync(path.join(directory, file), "utf8");
      for (const table of sql.matchAll(/CREATE TABLE `(\w+)` \(([\s\S]*?)\n\)[;)]/g)) {
        const [, tableName, body] = table;
        for (const key of body.matchAll(/(?:UNIQUE )?KEY `([^`]+)` \(([^)]*)\)/g)) {
          const column = (key[2].split(",")[0] ?? "").trim().replace(/`/g, "");
          const declared = new RegExp(`\`${column}\` varchar\\((\\d+)\\)`).exec(body);
          if (!declared) continue;
          const bytes = Number(declared[1]) * BYTES_PER_CHAR;
          expect(bytes, `${file} : ${tableName}.${column} = ${bytes} octets`).toBeLessThan(MAX_KEY_BYTES);
        }
      }
    }
  });
});