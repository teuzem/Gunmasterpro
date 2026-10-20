# GunsMasterPro — Déploiement rapide (commandes seules)

Guide d'exécution. Aucun tableau, aucune explication : uniquement les étapes et
les commandes, dans l'ordre. Pour le guide détaillé, voir `DEPLOIEMENT-COOLIFY.md`.

---

## 0. À avoir sous la main

- IP du VPS Contabo, accès `root`
- Domaine : `gunmaster-pro.com`
- Dépôt GitHub, branche `main`
- Terminal SSH (Termius)
- Clés Manus : `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`
- Application déjà construite : identifiant, `OWNER_OPEN_ID`

**Ordre obligatoire** : DNS → SSH → Coolify → MySQL → variables → application →
seed. Sauter une étape casse le déploiement.

---

## 1. DNS (à faire en premier)

Chez le registrar, sur `gunmaster-pro.com` :

- enregistrement `A` nom `@` → IP du VPS
- enregistrement `A` nom `www` → IP du VPS, ou `CNAME www` → `@`

Vérifier :

```bash
nslookup gunmaster-pro.com
nslookup www.gunmaster-pro.com
```

Les deux doivent renvoyer l'IP du VPS.

---

## 2. Connexion root et mise à jour

```bash
ssh root@<VPS_IP>
```

```bash
apt update && apt upgrade -y
apt install -y curl ca-certificates git ufw fail2ban
```

---

## 3. Créer le groupe et l'utilisateur projet

```bash
groupadd --system gmp-deploy
getent group gmp-deploy
```

```bash
useradd --create-home --home-dir /home/gmp-deploy --shell /bin/bash --gid gmp-deploy gmp-deploy
passwd gmp-deploy
id gmp-deploy
```

Assigner le groupe sudo :

```bash
usermod -aG sudo gmp-deploy
id -nG gmp-deploy
```

Attendu : `gmp-deploy sudo`.

---

## 4. Générer et installer la clé SSH

```bash
install -d -m 700 -o gmp-deploy -g gmp-deploy /home/gmp-deploy/.ssh
```

```bash
install -d -m 700 /root/.ssh/gmp
ssh-keygen -t ed25519 -a 100 -N "" -C "gmp-deploy@gunmaster-pro" -f /root/.ssh/gmp/id_ed25519
cat /root/.ssh/gmp/id_ed25519.pub
```

Installer la clé publique :

```bash
cat /root/.ssh/gmp/id_ed25519.pub >> /home/gmp-deploy/.ssh/authorized_keys
chown -R gmp-deploy:gmp-deploy /home/gmp-deploy/.ssh
chmod 700 /home/gmp-deploy/.ssh
chmod 600 /home/gmp-deploy/.ssh/authorized_keys
ls -l /home/gmp-deploy/.ssh/
```

Transférer la clé privée `id_ed25519` dans Termius, puis l'effacer du serveur :

```bash
rm -f /root/.ssh/gmp/id_ed25519
rm -rf /root/.ssh/gmp
```

---

## 5. Vérifier la connexion par clé

Dans Termius, nouvel hôte :

- username `gmp-deploy`
- authentification par clé
- pas de mot de passe

Contrôler, dans l'ordre :

```bash
whoami
id -nG
sudo -v
sudo whoami
```

Si les quatre répondent, continuer. **Ne pas durcir SSH avant ce test.**

---

## 6. Pare-feu

Revenir en `root`, puis :

```bash
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose
```

---

## 7. Durcir SSH

```bash
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
grep -E '^(PermitRootLogin|PasswordAuthentication)' /etc/ssh/sshd_config
sshd -t && echo "configuration valide"
systemctl reload ssh
```

Reconnecter en `gmp-deploy` pour confirmer. Garder la console Web Contabo ouverte.

---

## 8. Installer Coolify

```bash
curl -fsSL https://cdn.coolify.io/install.sh | sudo bash
```

Contrôler :

```bash
sudo systemctl is-active docker
docker --version
sudo ss -tlnp | grep 8000
```

Ouvrir `http://<VPS_IP>:8000`, créer le compte administrateur.

Assigner le groupe docker à l'utilisateur :

```bash
getent group docker >/dev/null && sudo usermod -aG docker gmp-deploy
id -nG gmp-deploy
```

Se reconnecter ensuite pour que le groupe soit pris en compte.

---

## 9. Pousser le code sur GitHub

Sur le PC, depuis le dépôt :

```bash
cd C:\Users\Mr Tegou\Downloads\gunsmasterpro-manus
git add -A
git commit -m "Configuration Coolify : taxonomie, SEO, media"
git push -u origin main
```

Vérifier qu'aucun secret n'est versionné :

```bash
git ls-files | findstr .env
```

Seul `.env.production.example` doit apparaître.

---

## 10. Créer la ressource MySQL

Dans Coolify : projet `production` → New Resource → Database → MySQL.

- Name : `gunsmasterpro-db`
- Image : `mysql:8.4`
- Normal user : `gunsmasterpro`
- Normal user password : 24 caractères minimum
- Initial database : `gunsmasterpro`
- Port mappings : **laisser vide** (usage interne uniquement)
- Charset : `utf8mb4`
- Collation : `utf8mb4_unicode_ci`

Activer les sauvegardes planifiées. Déployer, attendre l'état *Running*.

### 10.1 Récupérer les identifiants

Tout est dans la ressource MySQL → onglet **General** :

- *Root password* : bouton œil pour l'afficher, ou champ Environment Variables
- *Normal user* : `gunsmasterpro`
- *Normal user password* : bouton œil pour l'afficher
- *MySQL URL (internal)* : **bouton copier** à droite du champ — c'est cette
  chaîne qu'il faut mettre dans `DATABASE_URL`

Emplacement dans l'interface :

```text
MySQL resource mysql-database-…  →  General  →  Credentials
MySQL resource mysql-database-…  →  General  →  Runtime and network  →  MySQL URL (internal)
MySQL resource mysql-database-…  →  Environment Variables  →  URL interne de la base
```

Si l'onglet Environment Variables de la ressource MySQL expose déjà une variable
`DATABASE_URL`, la copier de là : elle est déjà au bon format.

### 10.2 Si « Initial database » vaut `default`

Coolify ne crée la base **qu'au tout premier démarrage**, quand le volume est
vide. Changer ce champ plus tard ne crée rien. Si la base `gunsmasterpro`
n'existe pas, la créer dans le **Terminal** de la ressource MySQL :

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS gunsmasterpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

```bash
mysql -u root -p -e "GRANT ALL PRIVILEGES ON gunsmasterpro.* TO 'gunsmasterpro'@'%'; FLUSH PRIVILEGES;"
```

Vérifier ensuite version et base :

```bash
mysql -u root -p -e "SELECT VERSION(); SHOW DATABASES;"
```

Si le mot de passe contient `@`, `#`, `/` ou `:`, l'encoder dans `DATABASE_URL`
(`%40`, `%23`, `%2F`, `%3A`), sinon la connexion échoue sans message clair.

---

## 11. Créer la ressource application

Dans Coolify : projet `production` → New Resource → Docker Compose.

- Source : dépôt GitHub
- Branch : `main`
- Docker Compose location : `/docker-compose.coolify.yml`
- Build pack : Dockerfile

Le compose ne déclare **que** le service `app` : MySQL est une ressource séparée.

---

## 12. Variables d'environnement de l'application

Les valeurs sont préparées dans `.env.production.local`, à la racine du dépôt.
Ce fichier est ignoré par Git et par Docker : il n'est ni commité, ni copié dans
l'image.

Ouvrir ce fichier, remplacer `<HOTE_INTERNE_COOLIFY>` par l'hôte copié à
l'étape 10.1, compléter les trois `CHANGE_ME`, puis copier chaque ligne `NOM=VALEUR`
dans l'onglet **Environment Variables** de la ressource app.

```text
DATABASE_URL=<recopier depuis MySQL URL (internal), base gunsmasterpro>
JWT_SECRET=<valeur présente dans .env.production.local>
VITE_APP_ID=<identifiant applicatif Manus>
OAUTH_SERVER_URL=https://api.manus.im
OWNER_OPEN_ID=<openId du compte propriétaire, voir tools/showOwnerOpenId.mjs>
OWNER_NAME=GunsMasterPro
SITE_NAME=GunsMasterPro
CANONICAL_ORIGIN=https://gunmaster-pro.com
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=<clé Manus Storage>
```

Générer un `JWT_SECRET` si celui du fichier local est compromis :

```bash
openssl rand -hex 32
```

Récupérer le vrai `OWNER_OPEN_ID` — cette valeur **n'est pas générable**, elle
doit correspondre à un compte Manus réel, sinon l'administration reste
verrouillée :

```bash
# 1. Se connecter une fois au site avec le compte Manus du propriétaire
# 2. Puis, dans le conteneur :
node tools/showOwnerOpenId.mjs
```

Ne pas créer `MYSQL_PASSWORD` ni `MYSQL_ROOT_PASSWORD` : inutiles avec une
ressource MySQL gérée.

Contrôler que la base répond, depuis le conteneur `app` :

```bash
node -e "import('mysql2/promise').then(m=>m.createConnection({uri:process.env.DATABASE_URL}).then(c=>c.query('SELECT VERSION() v').then(r=>{console.log('MySQL',r[0].v);return c.end()})).catch(e=>{console.error('ECHEC',e.message);process.exit(1)}))"
```

Attendu : `MySQL 8.4.x`. Un `ECHEC` ici signifie que l'hôte, le mot de passe ou
le nom de base est incorrect — ne pas déployer avant que cette commande passe.

---

## 13. Domaines

Onglet Domains :

- supprimer l'URL `sslip.io` générée automatiquement
- ajouter `gunmaster-pro.com`
- ajouter `www.gunmaster-pro.com`
- port `3000`
- HTTPS activé (Let's Encrypt)

---

## 14. Réseau, stockage et cycle de vie

Onglet Networking :

- port interne `3000`
- aucun port publié

Onglet Persistent Storage : le volume `gmp_media` monté sur `/app/data/media`
est créé par le compose. **Ne pas le supprimer** : il contient les visuels du
catalogue. Le montage déclaré dans le compose et celui de l'interface Coolify
portent le même chemin — s'ils se doublent, le conteneur refuse de démarrer ; dans
ce cas, ne garder que celui du compose et redéployer.

Onglet Deployment lifecycle :

- auto deploy ON
- health check `/healthz`
- start period `45s`
- wait for health check ON

---

## 15. Déployer

Bouton **Deploy**. Puis vérifier les logs : le build exécute
`pnpm check && pnpm test && pnpm build`, et un test en échec bloque tout.

---

## 15 bis. Médias : pousser les fichiers dans le volume persistant

Les visuels ne sont plus dans un bucket externe : ils sont écrits dans le volume
`gmp_media` monté sur `/app/data/media`, et servis par l'application sur
`/media/*`. La bascule se fait en trois temps.

**1. Variables d'environnement de la ressource application**

```text
MEDIA_STORAGE_MODE=local
LOCAL_MEDIA_DIR=/app/data/media
MEDIA_IMPORT_TOKEN=<openssl rand -hex 32>
```

`MEDIA_IMPORT_TOKEN` active la route d'import. Sans elle, la route renvoie 404 :
aucune surface d'écriture n'est exposée.

Redéployer après avoir défini ces variables.

**2. Pousser les 2 177 fichiers depuis le poste de travail**

```bash
node tools/pushMediaToServer.mjs --base https://gunmaster-pro.com --token <MEDIA_IMPORT_TOKEN>
```

Le script envoie chaque fichier sur `POST /api/media-import/<clé>` et reçoit
l'URL publique correspondante. Il produit `tools/media-manifest.local.json`,
qui fait autorité pour le seed. Vérification préalable sans rien envoyer :

```bash
node tools/pushMediaToServer.mjs --base https://gunmaster-pro.com --dry-run
```

Les fichiers de plus de 512 Ko sont envoyés par fragments : le reverse proxy
coupe une requête au bout de 60 s, ce qui suffit à faire échouer un visuel hero
de 7 Mo en un seul envoi. Le réassemblage est fait par le serveur.

**Point de vigilance : le volume doit être inscriptible**

Le volume `gmp_media` est créé par Docker, donc propriétaire `root` et
permissions `0755`. Le conteneur tournant en `USER node`, l'écriture y échouait
(EACCES) et l'import renvoyait 500. Un point d'entrée (`docker/entrypoint.sh`)
corrige les droits au démarrage puis lâche root. **Si l'import renvoie 500**,
vérifiez que l'image a bien été reconstruite : le correctif est dans le
`Dockerfile`, pas dans un paramètre.

**3. Basculer les URL du catalogue**

```bash
node tools/switchManifestToLocalMedia.mjs
```

Le snapshot et la taxonomie passent de `/manus-storage/…` à `/media/…`, en
conservant les mêmes clés.

---

## 16. Appliquer migrations et seed

Terminal du conteneur `app` (Coolify → Terminal) :

```bash
pnpm db:migrate
node tools/seedCatalogueMedia.mjs
node --import tsx scripts/seed-hero-slides.ts
node tools/verifyMediaUrls.mjs
```

Ces quatre commandes sont exécutables **dans le conteneur** : le `Dockerfile`
copie `scripts/`, `tools/`, `server/` et `drizzle/` dans l'image.

En revanche, les outils qui lisent les originaux dans `public/` ne sont
exécutables que depuis le poste de travail, jamais dans le conteneur (le dossier
`public/` est volontairement exclu de l'image) :

```text
tools/uploadCategoryImages.mjs    téléversement des visuels de catégories
tools/uploadProductMedia.mjs      téléversement hero + produits
tools/applySubcategories.mjs      rattachement des produits aux catégories
tools/applyManifestToSnapshot.mjs projection du manifeste sur le snapshot
```

`verifyMediaUrls.mjs` sort en code 3 si un visuel est injoignable.

### 16.1 Si la migration échoue avec « Table … already exists »

```text
DrizzleQueryError: Failed query: CREATE TABLE `catalogueCategories` …
cause: Error: Table 'catalogueCategories' already exists
```

En MySQL, chaque `CREATE TABLE` est validé immédiatement. Si une migration échoue
en cours d'exécution, les tables déjà créées restent en base, alors que la table
de suivi de Drizzle (`__drizzle_migrations`) est annulée. La migration suivante
réessaie alors les mêmes `CREATE TABLE` et bute sur l'existant.

Sur une base **neuve et sans donnée**, la correction est de repartir de zéro. Dans
le Terminal de la ressource MySQL :

```bash
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS gunsmasterpro;"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE gunsmasterpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON gunsmasterpro.* TO 'gunsmasterpro'@'%'; FLUSH PRIVILEGES;"
```

Puis, dans le conteneur `app` :

```bash
pnpm db:migrate
```

**Ne jamais faire ce `DROP` sur une base contenant des données.** Sauvegarder
avant toute opération de ce type.

Contrôle SQL :

```sql
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM catalogueCategories;
SELECT COUNT(*) FROM homeHeroSlides WHERE isActive = 1;
SELECT COUNT(*) FROM mediaAssets WHERE transferStatus = 'transferred';
SELECT mediaTransferState, COUNT(*) FROM products GROUP BY 1;
```

Attendu : 239 produits, 14 catégories, 20 slides, tous les produits `complete`.

---

## 17. Vérifications finales

```bash
curl -fsS https://gunmaster-pro.com/healthz
curl -I https://gunmaster-pro.com/
curl -s https://gunmaster-pro.com/robots.txt
curl -s https://gunmaster-pro.com/sitemap.xml | grep -c "<url>"
```

Puis, dans le navigateur :

- catalogue affiché avec les visuels, sans image cassée
- une page `/categorie/glock` et `/categorie/ammunition` qui répondent
- création d'une demande de test

---

## 18. Diagnostic

Ressource en **Exited** :

- lire les logs du build ; un test en échec arrête tout
- vérifier que les 5 variables bloquantes sont présentes
- vérifier que `git push` a bien remonté la version du compose

**Le build Docker échoue sur les tests d'intégration** :

```text
Caused by: Error: Table 'default.products' doesn't exist
```

Coolify injecte les variables de la ressource dans l'étape de build. Les tests
d'intégration ne s'exécutent que si `RUN_DB_TESTS=true` est défini, ce qui n'est
pas le cas d'un build : ils sont donc ignorés et le build passe. Pour les exécuter
volontairement, sur une base locale migrée :

```bash
pnpm db:migrate
RUN_DB_TESTS=true pnpm test
```

Si `DATABASE_URL` pointe vers `default` au lieu de `gunsmasterpro`, corriger
d'abord la base (étape 10.2) puis l'URL interne recopiée à l'étape 10.1.

`/healthz` répond mais le catalogue est vide :

- vérifier `mediaTransferState = 'complete'` sur les produits
- vérifier que `BUILT_IN_FORGE_API_URL` et `BUILT_IN_FORGE_API_KEY` sont defined

Images repli SVG au lieu des visuels :

- `/manus-storage/*` ne sert rien sans les clés Forge

TLS en erreur :

- le DNS ne répond pas encore, ou le domaine contient un caractère interdit :
  uniquement lettres, chiffres, tirets et points

Perte d'accès SSH :

- utiliser la console Web Contabo, puis vérifier `/home/gmp-deploy/.ssh/authorized_keys`