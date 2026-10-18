import "dotenv/config";
import { ensureCatalogueImported } from "../server/catalogueRepository";

async function main() {
  const ready = await ensureCatalogueImported();
  if (!ready) {
    throw new Error("DATABASE_URL est absent ou la base de données n'est pas accessible.");
  }
  console.log("Catalogue GunsMasterPro importé ou déjà présent.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
