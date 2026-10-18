import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("adaptateur Netlify SSR", () => {
  it("réemploie l’application Express et inclut les artefacts SSR de production", () => {
    const entry = fs.readFileSync(path.join(projectRoot, "server/_core/index.ts"), "utf8");
    const vite = fs.readFileSync(path.join(projectRoot, "server/_core/vite.ts"), "utf8");
    const config = fs.readFileSync(path.join(projectRoot, "netlify.toml"), "utf8");
    const handler = fs.readFileSync(path.join(projectRoot, "netlify/functions/app.ts"), "utf8");

    expect(entry).toContain("export async function createApp");
    expect(vite).toContain("process.env.STATIC_DIR");
    expect(config).toContain('included_files = ["dist/public/**", "dist/server-ssr/**"]');
    expect(handler).toContain("serverless(await createApp()");
  });
});
