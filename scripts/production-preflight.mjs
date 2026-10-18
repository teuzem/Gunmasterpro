const required = ["DATABASE_URL", "JWT_SECRET", "VITE_APP_ID", "OAUTH_SERVER_URL", "CANONICAL_ORIGIN"];
const missing = required.filter((key) => !process.env[key] || process.env[key] === "CHANGE_ME" || process.env[key].includes("CHANGE_ME"));
if (missing.length) {
  console.error(`Variables de production manquantes ou non remplacées : ${missing.join(", ")}`);
  process.exit(1);
}
if (!/^https:\/\//.test(process.env.CANONICAL_ORIGIN)) {
  console.error("CANONICAL_ORIGIN doit utiliser HTTPS en production.");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET doit contenir au moins 32 caractères.");
  process.exit(1);
}
if (!/^mysql(?:\+[^:]+)?:\/\//.test(process.env.DATABASE_URL)) {
  console.error("DATABASE_URL doit être une URL MySQL/TiDB compatible avec le schéma actuel.");
  process.exit(1);
}
console.log("Preflight production validé.");
