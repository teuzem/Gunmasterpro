import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    // drizzle/** est inclus pour que les contrôles de schéma (limites de clé
    // d'index MySQL) s'exécutent dans `pnpm test`, donc dans le build Docker :
    // une dérive de schéma doit bloquer le déploiement, pas être découverte en
    // production.
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "drizzle/**/*.test.ts"],
  },
});
