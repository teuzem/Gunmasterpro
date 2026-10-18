// Liste les comptes utilisateurs afin de retrouver le `openId` du propriétaire.
//
// Pourquoi cette étape est manuelle : `OWNER_OPEN_ID` est comparé au `openId`
// renvoyé par l'identité OAuth Manus (server/db.ts). Ce n'est pas un secret que
// l'on peut générer : une valeur inventée ne correspondrait à aucun compte, et
// personne ne deviendrait jamais super_admin — l'administration resterait
// verrouillée.
//
// Procédure : se connecter une fois au site avec le compte Manus du propriétaire,
// puis exécuter ce script et relever la ligne correspondante.
//
// Usage : node tools/showOwnerOpenId.mjs

import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL absent : renseignez-la ou lancez depuis le conteneur.");

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
try {
  const [rows] = await connection.query(
    "SELECT id, openId, name, email, role, createdAt FROM users ORDER BY createdAt ASC",
  );
  if (!rows.length) {
    console.log("Aucun utilisateur en base.");
    console.log("Connectez-vous d'abord au site avec le compte Manus du propriétaire, puis relancez.");
  } else {
    console.log(`${rows.length} compte(s) :\n`);
    for (const row of rows) {
      console.log(`  openId   : ${row.openId}`);
      console.log(`  nom      : ${row.name ?? "(non renseigné)"}`);
      console.log(`  e-mail   : ${row.email ?? "(non renseigné)"}`);
      console.log(`  rôle     : ${row.role}`);
      console.log(`  créé le  : ${row.createdAt}\n`);
    }
    console.log("Copier le openId du compte propriétaire dans OWNER_OPEN_ID (onglet Environment Variables).");
    console.log("Ce compte deviendra super_admin dès sa prochaine connexion.");
  }
} finally {
  await connection.end();
}