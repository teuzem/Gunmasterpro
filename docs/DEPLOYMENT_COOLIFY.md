# Déploiement GunsMasterPro sur Contabo + Coolify

**Domaine de production : `gunmaster-pro.com`.** Le nom est conforme à la règle
LDH (lettres, chiffres, tirets) : Let's Encrypt peut donc émettre un certificat
et Coolify/Traefik router le domaine.

| Valeur | Réglage |
|---|---|
| Domaine apex | `gunmaster-pro.com` |
| `CANONICAL_ORIGIN` | `https://gunmaster-pro.com` (HTTPS obligatoire) |
| `www` | `CNAME www → gunmaster-pro.com` ou enregistrement `A` sur la même IP |
| Sous-domaine Coolify (recommandé) | `coolify.gunmaster-pro.com` |

`CANONICAL_ORIGIN` pilote les URL du sitemap, `robots.txt`, les balises
canoniques et les `hreflang`. C'est la seule valeur à renseigner côté Coolify.

## Décision technique importante

La version actuelle utilise `drizzle-orm/mysql-core`, `mysql2` et un dialecte Drizzle `mysql`. Elle est donc compatible avec **MySQL 8.0/8.4, MariaDB compatible ou TiDB**, mais pas directement avec Neon PostgreSQL.

**Ne branchez pas `DATABASE_URL` Neon PostgreSQL sur cette version.** Les migrations et les types ne correspondent pas. Deux trajectoires sont possibles :

1. **Trajectoire recommandée pour la mise en ligne immédiate :** utiliser MySQL 8.4 dans Coolify ou un serveur MySQL/TiDB externe, puis conserver le schéma actuel.
2. **Trajectoire Neon :** effectuer une migration complète vers `drizzle-orm/pg-core`, `postgres`, un nouveau schéma PostgreSQL et une conversion/validation de toutes les migrations, requêtes et tests. Cette migration est un chantier séparé et ne doit pas être faite automatiquement pendant le déploiement.

Le fichier `docker-compose.coolify.example.yml` fournit une base MySQL de référence pour la trajectoire 1.

## Pré-requis Contabo

Préparer :

- IP publique fixe du VPS Contabo ;
- Ubuntu 22.04/24.04 LTS recommandé ;
- au moins 2 vCPU, 4 Go RAM et 40 Go SSD pour l’application, les builds et la base ;
- accès SSH par clé, jamais par mot de passe partagé dans un dépôt ;
- ports entrants `22/tcp` limité à votre IP d’administration, `80/tcp` et `443/tcp` publics ;
- un second emplacement de sauvegarde pour la base et les médias.

Ne publiez jamais l’IP, la clé privée SSH, `JWT_SECRET`, les secrets OAuth ou `DATABASE_URL` dans GitHub.

## Installation de Coolify par SSH

Depuis Termius, connecté en root ou avec un compte sudo :

```bash
ssh root@IP_DU_VPS
apt update && apt -y upgrade
apt install -y curl ca-certificates git ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Après l’installation, utiliser l’URL HTTPS de Coolify fournie par Coolify. Si vous servez le tableau de bord sur un sous-domaine dédié, cette URL doit être le chemin effectivement routé par le reverse proxy ; elle ne doit pas être ajoutée comme une simple variable applicative. Le tableau de bord Coolify ne doit pas être exposé sans authentification forte.

Créer un compte administrateur Coolify, activer la double authentification si disponible et conserver une seconde méthode d’accès SSH de secours.

## DNS Hostinger

Dans la zone DNS Hostinger :

- `A` pour `@` vers l’IP du VPS ;
- `CNAME` pour `www` vers le domaine racine, ou `A` vers l’IP ;
- un sous-domaine séparé pour Coolify, par exemple `coolify.gunmaster-pro.com`, si le tableau de bord doit être accessible publiquement ;
- ne pas pointer le domaine public vers le port interne `3000` ; Coolify/Traefik gère TLS et le proxy.

Attendre la propagation DNS, puis laisser Coolify demander le certificat Let’s Encrypt. Ne pas créer deux reverse proxies concurrents sur le même port 80/443.

## Déploiement de la base MySQL dans Coolify

Créer une ressource MySQL 8.4 dans le projet Coolify :

- base : `gunsmasterpro` ;
- utilisateur applicatif non-root : `gunsmasterpro` ;
- mot de passe aléatoire long ;
- volume persistant obligatoire ;
- sauvegardes automatiques vers un stockage externe ;
- réseau privé Coolify uniquement, sans exposition publique du port 3306.

Dans l’application GunsMasterPro, utiliser l’URL interne fournie par Coolify, par exemple :

```text
mysql://gunsmasterpro:MOT_DE_PASSE@mysql-service:3306/gunsmasterpro
```

Le nom exact de l’hôte dépend du service Coolify. Ne pas copier l’exemple littéralement.

## Déploiement de l’application

Dans Coolify :

1. Créer un projet `GunsMasterPro`.
2. Ajouter une ressource **Application** depuis le dépôt GitHub.
3. Sélectionner la branche `main`.
4. Choisir `Dockerfile` comme méthode de build.
5. Définir le port interne `3000`.
6. Activer `healthz` comme health check : `/healthz`.
7. Ajouter le domaine public, par exemple `gunmaster-pro.com`.
8. Activer HTTPS automatique.
9. Ajouter les variables secrètes depuis l’interface Coolify.
10. Déployer seulement après validation du build et de la connexion base.

Variables minimales :

```text
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=mysql://...
JWT_SECRET=une-valeur-aleatoire-d-au-moins-32-caracteres
VITE_APP_ID=...
OAUTH_SERVER_URL=https://api.manus.im
OWNER_OPEN_ID=...
OWNER_NAME=GunsMasterPro
CANONICAL_ORIGIN=https://gunmaster-pro.com
SITE_NAME=GunsMasterPro
```

Les variables `BUILT_IN_FORGE_API_URL` et `BUILT_IN_FORGE_API_KEY` sont nécessaires si les fonctions Manus Storage/Forge utilisées par l’application doivent continuer à fonctionner hors de WebDev. Vérifier la disponibilité et l’autorisation de ces services dans le nouvel environnement avant de basculer le trafic.

## Migrations et import initial

Les visuels du catalogue sont **déjà dans le bucket** (2 159 objets sous
`/manus-storage/`, téléversés et contrôlés). L'import applicatif ne rafraîchit
pas les lignes existantes — `ensureCatalogueImported()` court-circuite dès que le
nombre de produits est complet — donc le seed média est indispensable après
toute mise à jour de médias.

Depuis un shell de la ressource applicative Coolify, après avoir renseigné les secrets :

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm db:deploy

# Réaligne produits, catégories et mediaAssets sur les objets du bucket
# (transaction) : visuel principal + galerie, clé et contentType inclus.
node tools/seedCatalogueMedia.mjs

# 20 slides hero FR/EN/DE (upsert sur position)
pnpm exec tsx scripts/seed-hero-slides.ts

# Contrôle final : chaque URL doit répondre 200/206 (sort en code 3 sinon)
node tools/verifyMediaUrls.mjs
```

`db:deploy` effectue :

1. le preflight des variables ;
2. l’application des migrations Drizzle ;
3. l’import idempotent du catalogue de référence.

Contrôle SQL attendu : 239 produits, 23 catégories, 20 slides hero actives,
2 139 `mediaAssets` en `transferStatus = 'transferred'` et l’ensemble des
produits en `mediaTransferState = 'complete'`.

Pour une base déjà existante, faire une sauvegarde avant toute migration :

```bash
mysqldump --single-transaction --routines --triggers \
  -h HOST -u USER -p DATABASE > gunsmasterpro-before-migration.sql
```

Ne pas exécuter `drizzle-kit push` en production. Utiliser les migrations versionnées et vérifier le SQL avant exécution.

### Clés de stockage et images en 403

Le pré-signage GET recopie le chemin de la clé dans l’URL CloudFront : **un espace
dans une clé de stockage invalide la signature et renvoie 403**. Les clés en
usage sont volontairement sûres pour une URL :

```text
categories/<slug>_<hash8>.<ext>
hero/<fichier>_<hash8>.<ext>
catalogue/pakarms/<sourceId>/<n>_<hash8>.<ext>
```

Ne jamais introduire d’espace ni de caractère accentué dans une clé. Après
téléversement, `tools/verifyMediaUrls.mjs` liste les URL injoignables et
`--prune` retire des galeries celles qui sont définitivement absentes du bucket.

## Vérifications post-déploiement

```bash
curl -fsS https://gunmaster-pro.com/healthz
curl -I https://gunmaster-pro.com/
curl -I https://gunmaster-pro.com/robots.txt
curl -I https://gunmaster-pro.com/sitemap.xml
```

Puis vérifier manuellement :

- accueil et catalogue en clair/sombre ;
- authentification Manus OAuth et callback avec le domaine de production autorisé ;
- lecture du catalogue et médias ;
- création d’une demande de test ;
- consultation admin ;
- Telegram et WhatsApp ;
- aucune erreur dans les logs Coolify ;
- redémarrage du conteneur sans perte de données ;
- restauration d’une sauvegarde dans un environnement de staging.

## OAuth et domaines

Le domaine de production doit être enregistré dans la configuration OAuth Manus avec le callback exact exposé par l’application. Après chaque changement de domaine :

1. ajouter le domaine et le callback autorisés ;
2. redéployer ;
3. tester connexion, déconnexion et expiration de session ;
4. vérifier que les cookies utilisent HTTPS et le bon domaine.

Ne jamais désactiver la vérification d’état ou contourner le callback pour « faire fonctionner » la connexion.

## Netlify, Vercel et Hostinger

- **Coolify/VPS :** cible recommandée pour le backend SSR persistant et la base MySQL privée.
- **Netlify :** `netlify.toml` et `netlify/functions/app.ts` existent déjà, mais les variables Manus Storage/OAuth et la base doivent être disponibles dans Netlify. Le domaine Netlify historique ne doit pas être supprimé avant validation de la nouvelle cible.
- **Vercel :** `vercel.json` et `api/index.ts` sont fournis comme adaptateur serverless de test. Vérifier les limites d’exécution, les uploads et l’accès base avant de l’utiliser comme cible principale.
- **Hostinger :** `.htaccess` est fourni comme référence Apache. Il ne remplace pas un runtime Node. Un hébergement mutualisé ne doit pas recevoir le build SSR comme s’il s’agissait d’un simple site statique ; utiliser le support Node officiel de l’offre ou faire pointer le domaine vers Coolify.

## Rollback

Conserver :

- l’image Docker précédente dans Coolify ;
- le commit GitHub précédent ;
- la sauvegarde SQL avant migration ;
- les valeurs de configuration précédentes dans un gestionnaire de secrets.

Pour revenir en arrière, redéployer l’image/commit précédent puis restaurer la base uniquement si la migration a modifié le schéma de manière incompatible. Ne pas supprimer la base ou le volume pour résoudre un problème applicatif.

## Informations nécessaires pour exécuter le déploiement réel

Pour passer de la préparation à l’exécution, il faudra fournir via le canal sécurisé approprié :

- IP du VPS Contabo ;
- utilisateur SSH et méthode de clé ;
- domaine public Hostinger ;
- confirmation du choix **MySQL/TiDB** ou décision explicite de lancer une migration PostgreSQL Neon ;
- accès/variables OAuth autorisés pour le nouveau domaine ;
- emplacement de sauvegarde ;
- dépôt GitHub et branche à déployer.

Ne transmettez pas de clé privée SSH, mot de passe root ou secret de production dans le chat. Utilisez une prise en main navigateur/terminal ou un gestionnaire de secrets.
