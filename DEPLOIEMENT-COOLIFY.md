# Déploiement GunsMasterPro — VPS Contabo + Coolify + domaine Hostinger

**Domaine de production : `gunmaster-pro.com`.** Le nom est conforme à la règle
LDH (lettres, chiffres, tirets), donc Let's Encrypt peut émettre un certificat et
Coolify/Traefik peuvent router le domaine.

| Valeur | Réglage |
|---|---|
| Domaine apex | `gunmaster-pro.com` |
| `CANONICAL_ORIGIN` | `https://gunmaster-pro.com` (HTTPS obligatoire, le preflight refuse `http://`) |
| `www` | `CNAME www → gunmaster-pro.com`, ou enregistrement `A` sur la même IP |
| Sous-domaine Coolify (recommandé) | `coolify.gunmaster-pro.com`, panneau jamais sur le domaine public |
| Origine par défaut du code | `https://gunmaster-pro.com` (utilisée si `CANONICAL_ORIGIN` est absent) |

`CANONICAL_ORIGIN` est la seule valeur à renseigner côté Coolify : elle pilote
les URL du sitemap, les `robots.txt`, les canoniques et les `hreflang`.

---

Guide complet, étape par étape, depuis un PC Windows. Les étapes marquées
**[PARALLÈLE]** peuvent être exécutées simultanément (DNS, repo GitHub,
préparation) pendant que le serveur se configure.

État final visé : `https://gunmaster-pro.com` servie par 2 conteneurs
(`app` Node 22 + `db` MySQL 8.4), base seedée (239 produits, 23 catégories,
20 slides hero), médias fonctionnels, re-déploiements automatiques via
webhook GitHub, interruption quasi nulle.

> Règle d'or : les secrets (mots de passe, `JWT_SECRET`, clés Forge) vivent
> UNIQUEMENT dans l'interface Coolify (onglet Environment) et dans votre
> gestionnaire de mots de passe. Jamais dans Git, jamais dans ce fichier.

---

## 0. Architecture déployée

```
GitHub (push sur main) --webhook--> Coolify --build--> app:3000 --\
    Traefik Coolify (TLS Let's Encrypt, domaine Hostinger) --------> Internet
app --> db:3306 (MySQL 8.4, volume gunsmasterpro_db) [réseau interne]
app --> volume gmp_media (/app/data/media, uploads admin autonomes)
```

Fichiers clés du dépôt : `Dockerfile` (build + runtime), `docker-compose.coolify.yml`
(stack prod), `.env.production.example` (modèle, sans secrets),
`scripts/seed-hero-slides.ts` + `scripts/verify-media.ts` (seed/activation),
`scripts/verify-seo-ssr.sh` (contrôle post-déploiement).

Outils média (bucket) — à exécuter sur le poste de travail, pas en production :

| Outil | Rôle |
|---|---|
| `tools/uploadCategoryImages.mjs` | téléverse `public/images categories` (23 visuels), manifeste `tools/category-images.json` |
| `tools/uploadProductMedia.mjs` | téléverse hero (20) + produits PAK Arms (2 134), manifeste `tools/media-manifest.json` |
| `tools/applyManifestToSnapshot.mjs` | reporte le manifeste sur `server/data/catalogue.snapshot.json` (visuel + galerie) |
| `tools/applyManifestToHero.mjs` | aligne `homeHeroContent.ts` et `seedHomepageVisuals.mjs` sur les objets téléversés |
| `tools/verifyMediaUrls.mjs` | contrôle 2 159 URL via le pré-signage ; `--prune` retire les galeries injoignables |
| `tools/seedCatalogueMedia.mjs` | réaligne la base sur les objets, en transaction |

Tous sont **idempotents** : relancer ne crée pas de doublon et ne renumérote pas
les clés déjà téléversées. `--force` renumérote, `--verify-only` se limite au
contrôle.

> **Règle de nommage des clés de stockage (cause historique d'images en 403).**
> Le pré-signage GET recopie le chemin de la clé dans l'URL CloudFront. Un
> espace dans la clé produit donc une signature invalide et un **HTTP 403** au
> lieu d'une image. Les clés utilisées sont volontairement sûres pour une URL :
> `categories/<slug>_<hash8>.<ext>`, `hero/<fichier>_<hash8>.<ext>`,
> `catalogue/pakarms/<sourceId>/<n>_<hash8>.<ext>`. **Ne jamais introduire
> d'espace ni de caractère accentué dans une clé.**

---

## État SEO vérifié — et deux chantiers en attente

### Ce qui est en place et vérifié

- **Domaine** : `gunmaster-pro.com` partout (code, sitemap, robots, canoniques,
  `.env.production.example`, `netlify.toml`, les deux guides).
- **`sitemap.xml`** : 253 URL (14 pages + 239 fiches), jusqu'à 8 images par
  produit, `lastmod` issu de `updatedAt` en base et non plus d'une date unique,
  `changefreq`/`priority` différenciés.
- **Résilience du sitemap** : il retombe sur le snapshot embarqué si MySQL est
  injoignable. Un sitemap en 503 est traité comme une suppression par Google,
  ce qui effacerait l'indexation au premier incident de base.
- **`robots.txt`** : seul `/administration` est bloqué. Les pages privées
  (`/panier`, `/favoris`, `/suivi`) ne sont plus `Disallow`, car une directive
  `Disallow` empêche les robots de lire le `noindex` et empêche donc la
  désindexation.
- **Données structurées** (`client/src/ssr/prefetch.ts`) : `Organization`,
  `WebSite` + `SearchAction`, `WebPage`, `Product` (offres, stock, galerie,
  `additionalProperty` caliber/material/capacity/…), `BreadcrumbList`,
  `ItemList`, `FAQPage` trilingue.

### Sous-catégories : 14 catégories issues des données réelles

Les 23 libellés par type d'action qui figuraient auparavant n'étaient adossés à
**aucun produit** : `products.subCategory` contenait des valeurs sans lien
(`original-imported`, `glock`, `beretta`, `223-bore`…), et aucune clé étrangère
ne reliait les deux tables. Publier 23 pages dans cet état produisait 23 pages
vides, donc du contenu mince — ce que les moteurs pénalisent.

Mesures faites avant toute écriture (`tools/analyseSubcategories.mjs`,
`tools/analyseFamilles.mjs`) :

| Constat | Valeur |
|---|---|
| Catégories de l'export pakarms.co | **14** (basées marque/calibre) |
| Données d'action (verrou, levier, pompe, superposé) | **absentes** : ni attribut, ni tag |
| Sous-catégories par type d'action alimentées | **9 sur 23**, dont 4 avec 1–2 produits |
| Revolver, mono-coup, levier, pompe, juxtaposé, superposé, modérateur, poudre noire, arme de collection | **0 produit** |

La taxonomie publiée est donc celle des données : **14 catégories, toutes
alimentées**, rattachées par la catégorie de source du produit (taxonomie
pakarms.co), et non par déduction sur le nom. Les 15 produits sans catégorie de
source sont affectés par des règles explicites et journalisées ; les 10 produits
historiques hors export restent sans sous-catégorie et leurs anciennes valeurs
libres ont été supprimées.

| Catégorie | Famille | Produits |
|---|---|---|
| `original-imported` | Armes de poing | 38 |
| `30-bore-7-shot-762mm` | Armes de poing | 29 |
| `glock` | Armes de poing | 28 |
| `beretta` | Armes de poing | 20 |
| `assault-rifles` | Carabines | 23 |
| `223-bore` | Carabines | 16 |
| `heavy-machine-guns` | Carabines | 3 |
| `12-bore` | Fusils | 8 |
| `colt-1911` / `small-weapons` / `zigana` / `taurus` | Armes de poing | 11 / 11 / 10 / 3 |
| `ammunition` | Accessoires | 9 |
| `pistol-accessories` | Accessoires | 19 |

Chaque catégorie a une page `/categorie/<slug>` : titre et description
trilingues (FR/EN/DE), fil d'Ariane passant par la famille, `CollectionPage`
avec `ItemList`, et un `og:image` pris parmi les visuels produits déjà
téléversés. `tools/applySubcategories.mjs` **refuse d'écrire** une catégorie sans
produit, et `server/subcategories.test.ts` fait échouer la suite si une
catégorie vide ou un rattachement non déclaré réapparaît.

> Les 23 visuels de `public/images categories` restent dans le bucket mais ne
> correspondent plus à la taxonomie publiée (ils sont nommés par type d'action).
> Ils ne sont plus référencés ; ils pourront servir si une taxonomie par type
> d'action est alimentée un jour.

### Chantier 1 — SEO international : URLs `/en/` et `/de/` (en attente)

### Ce qui est volontairement absent

Le `<meta name="keywords">` est conservé mais n'est plus utilisé comme levier :
Google l'ignore depuis 2009. Les titres et descriptions sont produits **par page**
à partir des données réelles (catégorie, marque, calibre, modèle) ; répéter un
même lot de mots-clés sur toutes les pages est au contraire pénalisé.

---

## 1. Prérequis (checklist)

- [ ] VPS Contabo : adresse IP, utilisateur `root`, mot de passe (fournis par Contabo)
- [ ] **Accès de secours** : console Web Contabo (`VPS → Console`) vérifiée comme ouverte, pour retrouver l'accès si la configuration SSH casse la connexion
- [ ] Domaine Hostinger (ci-après `gunmaster-pro.com` — remplacez partout)
- [ ] **Termius** installé sur le PC (ou PowerShell : `ssh` est intégré à Windows 10/11)
- [ ] Dépôt GitHub avec ce projet poussé (branche `main`)
- [ ] (Optionnel, médias d'origine) clés Manus : `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY`

> Le compte de déploiement `gmp-deploy` et sa clé SSH sont créés à l'étape 3 :
> aucun compte préexistant n'est nécessaire.

---

## 2. [PARALLÈLE] Étape 1 — DNS Hostinger (EN PREMIER, propagation 5 min à 24 h)

1. Hostinger → Domaines → votre domaine → **Zone DNS**.
2. Ajouter/modifier :
   - Type `A`, nom `@`, valeur `<VPS_IP>`, TTL `300` (baissez le TTL à 300 pendant la migration, remontez à 14400 après stabilisation).
   - Type `A`, nom `www`, valeur `<VPS_IP>`, TTL `300` (ou `CNAME www → @`).
3. Vérifier depuis votre PC :
```powershell
nslookup gunmaster-pro.com
nslookup www.gunmaster-pro.com
```
Les deux doivent répondre `<VPS_IP>`. Continuez les étapes suivantes en attendant — revenez ici avant l'étape 9 (TLS).

---

## 3. Étape 2 — Première connexion SSH via Termius

1. Termius → **Hosts → New Host** :
   - Label : `Contabo GunsMasterPro`
   - Address : `<VPS_IP>`, Port `22`
   - Username : `root`, Password : `<MOT_DE_PASSE_CONTABO>` (collé, stocké uniquement dans Termius/vault).
2. Connect → accepter l'empreinte (`yes`).
3. Mettre à jour le serveur :
```bash
apt update && apt upgrade -y && apt install -y curl git ufw fail2ban
```

---

## 4. Étape 3 — Utilisateur et groupe projet, clé SSH, durcissement

Objectif : ne plus jamais travailler en `root`, et disposer d'un compte
`gmp-deploy` utilisable pour toutes les étapes suivantes, sans en sauter
une seule.

> **Ne fermez jamais la session root avant d'avoir vérifié la connexion par clé
> (étape 3.7).** Durcir SSH avant cette vérification vous couperait l'accès en cas
> d'erreur de clé. La seule issue de secours est la **console Web de Contabo**
> (`VPS → Console`) : gardez-la ouverte dans un onglet séparé jusqu'au bout.

### 3.1 Créer le groupe projet

Connecté en `root` sur le VPS.

```bash
# --system : groupe système, sans mot de passe, GID faible.
groupadd --system gmp-deploy

# Contrôle.
getent group gmp-deploy
```

Attendu : `gmp-deploy:x:<GID>:` en sortie de `getent`.

### 3.2 Créer l'utilisateur et l'affecter au groupe

```bash
useradd --create-home \
        --home-dir /home/gmp-deploy \
        --shell /bin/bash \
        --gid gmp-deploy \
        gmp-deploy

# Mot de passe du compte (interactif : saisie puis confirmation).
passwd gmp-deploy

# Contrôle du groupe primaire et du répertoire personnel.
id gmp-deploy
ls -ld /home/gmp-deploy
```

`useradd` **ne crée pas de groupe** : c'est pourquoi le groupe a été créé au 3.1
et passé explicitement avec `--gid`. Vérifiez dans la sortie de `id` que le
`gid=` correspond bien au GID du 3.1.

> On évite `adduser`, qui est interactif et masque le rattachement de groupe
> derrière un dialogue. La commande est ainsi reproductible et vérifiable.

### 3.3 Assigner les groupes de droits

```bash
# sudo : élévation de privilèges pour les commandes d'administration.
usermod -aG sudo gmp-deploy

# Le groupe docker n'existe pas encore (il sera créé par Coolify, étape 5).
# On l'assigne à ce moment-là, pas avant :
#   getent group docker >/dev/null && usermod -aG docker gmp-deploy

# Contrôle : le groupe sudo doit apparaître.
id -nG gmp-deploy
```

Attendu : `gmp-deploy sudo`.

### 3.4 Préparer le répertoire SSH

```bash
install -d -m 700 -o gmp-deploy -g gmp-deploy /home/gmp-deploy/.ssh
ls -ld /home/gmp-deploy/.ssh
```

Attendu : `drwx------ ... gmp-deploy gmp-deploy`.

### 3.5 Générer la clé SSH

La clé privée **ne doit jamais transiter par une messagerie ni par le dépôt
Git**. Elle est générée ici, sur le serveur, dans un répertoire réservé à
`root`, puis seule la partie publique est installée pour `gmp-deploy`.

```bash
# Génération de la paire, en tant que root, hors du home de gmp-deploy.
install -d -m 700 /root/.ssh/gmp
ssh-keygen -t ed25519 -a 100 -N "" -C "gmp-deploy@gunmaster-pro" -f /root/.ssh/gmp/id_ed25519

# Affichage de la partie publique à installer (une ligne « ssh-ed25519 … »).
cat /root/.ssh/gmp/id_ed25519.pub

# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK5aYRMJISSfStxnQZgzQdA809nY+BE5SxSDItr7XTcM gmp-deploy@gunmaster-pro
```

`ssh-keygen` affiche aussi une empreinte **SHA256** : notez-la, elle sert à
comparer avec celle que votre client affiche à la première connexion.

### 3.6 Installer la clé publique dans le fichier de l'utilisateur

```bash
# Ajout de la clé publique au fichier authorized_keys de gmp-deploy.
cat /root/.ssh/gmp/id_ed25519.pub >> /home/gmp-deploy/.ssh/authorized_keys

# Permissions exactes. Sans ces trois lignes, sshd refuse la connexion
# silencieusement (aucun message d'erreur explicite côté client).
chown -R gmp-deploy:gmp-deploy /home/gmp-deploy/.ssh
chmod 700 /home/gmp-deploy/.ssh
chmod 600 /home/gmp-deploy/.ssh/authorized_keys

# Contrôle.
ls -l /home/gmp-deploy/.ssh/
wc -l /home/gmp-deploy/.ssh/authorized_keys
```

Attendu : `-rw------- 1 gmp-deploy gmp-deploy … authorized_keys`, et `1` ligne.

> **Transférer la clé privée vers Termius, puis l'effacer du serveur.**
> 1. Ouvrez `/root/.ssh/gmp/id_ed25519` dans un éditeur de la console Contabo.
> 2. Copiez **tout** le contenu, y compris les lignes
>    `-----BEGIN OPENSSH PRIVATE KEY-----` et `-----END …-----`.
> 3. Importez-le dans Termius (champ *Private key*).
> 4. Vérifiez la connexion (3.7), puis supprimez la clé du serveur :
> ```bash
> rm -f /root/.ssh/gmp/id_ed25519
> rm -rf /root/.ssh/gmp
> ```
> La clé privée n'existe alors plus que dans votre coffre Termius.

### 3.7 Vérifier la connexion par clé AVANT tout durcissement

Dans Termius : **Hosts → New Host**

| Champ | Valeur |
|---|---|
| Label | `GunsMasterPro (gmp-deploy)` |
| Address | `<VPS_IP>` |
| Port | `22` |
| Username | `gmp-deploy` |
| Authentification | *Key* → *New key* → importer la clé privée |
| Password | laissé vide |

Connectez-vous, puis exécutez ces contrôles **dans l'ordre** :

```bash
whoami        # attendu : gmp-deploy
id -nG        # attendu : gmp-deploy sudo
sudo -v       # doit demander le mot de passe défini en 3.2
sudo whoami   # attendu : root
```

Si les quatre répondent correctement, le compte est opérationnel. Reprenez une
session `root` dans un onglet séparé pour l'étape 3.8.

### 3.8 Pare-feu

Toujours en `root`.

```bash
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose
```

Attendu : `Status: active`, les ports `22`, `80` et `443` en `ALLOW`, le reste
`REJECT`.

> Le port `80` doit rester ouvert : Let's Encrypt et la redirection
> `http` → `https` en dépendent.

### 3.9 Durcir SSH (seulement maintenant)

```bash
# Sauvegarde avant modification.
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# root : plus de connexion directe par mot de passe.
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

# Plus aucune authentification par mot de passe, pour aucun compte.
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config

# Contrôle des valeurs appliquées.
grep -E '^(PermitRootLogin|PasswordAuthentication)' /etc/ssh/sshd_config
```

Attendu :

```text
PermitRootLogin prohibit-password
PasswordAuthentication no
```

> **À quoi sert encore le mot de passe du compte ?** À rien pour l'accès SSH, qui
> passe désormais uniquement par clé. Il reste requis pour `sudo` : les commandes
> d'administration des étapes suivantes le demanderont. `passwd gmp-deploy` peut
> donc être conservé dans votre coffre.

**Contrôle de syntaxe avant rechargement** — un `sshd_config` invalide coupe
l'accès à tous les utilisateurs, y compris `gmp-deploy` :

```bash
sshd -t && echo "configuration valide"
systemctl reload ssh
systemctl status ssh --no-pager
```

Reconnectez-vous **encore une fois en `gmp-deploy` par clé** pour confirmer que le
rechargement n'a rien cassé. Ne fermez la console Contabo qu'après ce test.

### 3.10 Reprendre la main

Toutes les étapes suivantes s'exécutent **en `gmp-deploy`**, `sudo` n'étant
utilisé que pour les commandes d'administration. Utilisez l'hôte
`GunsMasterPro (gmp-deploy)` créé en 3.7.

```bash
# Vérification du contexte de travail.
whoami && sudo whoami   # gmp-deploy puis root
```

---

## 5. [PARALLÈLE] Étape 4 — Pousser le code sur GitHub (pendant l'install serveur)

```powershell
cd C:\Users\Mr Tegou\Downloads\gunsmasterpro-manus
git init -b main 2>$null; git add -A
git commit -m "Production Coolify : fallback local, stockage autonome, compose, guide"
git remote add origin git@github.com:<USER>/<REPO>.git 2>$null
git push -u origin main
```
Contrôle anti-fuite : `git status` et `git ls-files | findstr .env` ne doivent montrer **aucun** `.env` (seul `.env.production.example` est versionné).

---

## 6. Étape 5 — Installer Coolify sur le VPS

Connecté en `gmp-deploy` (hôte Termius de l'étape 3.7).

```bash
# Coolify installe Docker, ce qui exige les privilèges root : on passe par sudo.
curl -fsSL https://cdn.coolify.io/install.sh | sudo bash
```

Contrôle de l'installation :

```bash
# Docker doit être actif.
sudo systemctl is-active docker
docker --version

# Coolify doit répondre sur le port 8000.
sudo ss -tlnp | grep 8000
```

Une fois Docker présent, appliquer l'assignation de groupe laissée en attente au
3.3 (une nouvelle connexion est nécessaire pour que le groupe additionnel soit
pris en compte) :

```bash
# Vérifier l'existence du groupe avant de l'assigner.
getent group docker >/dev/null && sudo usermod -aG docker gmp-deploy

# Contrôle.
id -nG gmp-deploy          # attendu : gmp-deploy sudo docker
```

> **Reconnectez-vous** (`exit`, puis rouvrez l'hôte `GunsMasterPro
> (gmp-deploy)`) avant de vérifier `docker ps` : sans cela, Docker refuse le
> accès avec « permission denied ».

Suite :

- Coolify installe Docker + Traefik + son panneau sur `http://<VPS_IP>:8000`.
- Ouvrez `http://<VPS_IP>:8000` → créez le compte **administrateur** (e-mail + mot de passe fort, stocké au vault).
- Ensuite : restreignez le port 8000 à votre IP (pare-feu Contabo / UFW) et activez les sauvegardes Coolify (Settings → Backups).

---

## 7. Étape 6 — Source GitHub + webhook (re-déploiements automatiques)

1. Coolify → **Sources → New → GitHub App** → autoriser l'accès au dépôt (ou clé déploy privée en repli).
2. Créez un **Project** `gunsmasterpro` → **New Resource → Docker Compose** :
   - Source : votre dépôt, branche `main`
   - Compose file : `docker-compose.coolify.yml`
   - **Auto Deploy / Webhook : ON** → chaque `git push` sur `main` rebuild et redéploie seul. Si GitHub n'affiche pas le webhook : GitHub → repo → Settings → Webhooks → coller l'URL fournie par Coolify, événement `push`.
3. Premier Deploy (bouton **Deploy**) — il échouera au preflight tant que l'étape 7 n'est pas faite : normal, passez à l'étape 7 puis **Redeploy**.

---

## 8. Étape 7 — Variables d'environnement backend (onglet Environment de la ressource)

Générez les secrets sur le VPS (jamais sur papier) :

```bash
openssl rand -hex 32   # JWT_SECRET (64 car.)
openssl rand -hex 24   # MYSQL_PASSWORD (48 car.)
openssl rand -hex 24   # MYSQL_ROOT_PASSWORD (48 car.)
```

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | `mysql://gunsmasterpro:<MYSQL_PASSWORD>@db:3306/gunsmasterpro` (hôte `db` = service compose, réseau interne) |
| `MYSQL_PASSWORD` | généré ci-dessus |
| `MYSQL_ROOT_PASSWORD` | généré ci-dessus (différent) |
| `JWT_SECRET` | généré ci-dessus (≥ 32 car., preflight refuse sinon) |
| `VITE_APP_ID` | identifiant applicatif (ex. `gunsmasterpro-prod`) |
| `OAUTH_SERVER_URL` | `https://api.manus.im` (ou votre fournisseur OAuth) |
| `OWNER_OPEN_ID` / `OWNER_NAME` | compte propriétaire / `GunsMasterPro` |
| `CANONICAL_ORIGIN` | `https://gunmaster-pro.com` (**HTTPS obligatoire**, preflight refuse sinon) |
| `SITE_NAME` | `GunsmasterPro` |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | **requis en production** — sans eux, `/manus-storage/*` ne sert rien et le catalogue affiche le repli SVG (voir étape 8) |
| `LOCAL_MEDIA_DIR` | `/app/data/media` (déjà câblé dans le compose ; volume `gmp_media`) |

> PostgreSQL est **incompatible** : `drizzle` + driver `mysql2` + preflight imposent `mysql://`. Ne créez pas de ressource Postgres pour cette app.

---

## 9. Étape 8 — Seed complet (base + hero + médias) — terminal du conteneur `app`

Les visuels du catalogue **sont déjà dans le bucket** (2 159 objets sous
`/manus-storage/`, téléversés et contrôlés). Le seed ne fait donc plus que
réaligner la base sur ces objets : c'est indispensable, car
`ensureCatalogueImported()` court-circuite quand le nombre de produits est déjà
complet et ne rafraîchirait jamais des lignes obsolètes.

Dans Coolify : ressource → **Terminal** (conteneur `app`) :

```bash
# 1. Migrations (idempotent, ne réécrit rien si 239 produits déjà présents)
pnpm db:deploy

# 2. Médias : réaligne produits, catégories et mediaAssets sur les objets du
#    bucket, en une transaction (visual principal + galerie complète de chaque
#    produit, clé et contentType inclus, transferStatus='transferred',
#    mediaTransferState='complete'). Supprime les mediaAssets orphelins.
node tools/seedCatalogueMedia.mjs

# 3. 20 slides hero FR/EN/DE (idempotent, upsert sur position)
pnpm exec tsx scripts/seed-hero-slides.ts

# 4. Contrôle final : chaque URL du catalogue doit répondre 200/206 via le
#    pré-signage du bucket. Sort en code 3 si un visuel est injoignable.
node tools/verifyMediaUrls.mjs
```

Variante SANS clés Forge (`BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY`
absentes) : les images produits ne sont pas servies par le proxy
`/manus-storage/*`. Le repli `/media-fallback.svg` s'affiche proprement, puis
ré-uploadez les visuels via `/administration > Médias` : ils atterrissent sur le
volume `gmp_media` et sont marqués `complete` automatiquement.

> **Les clés Forge sont donc requises en production** pour que le catalogue
> affiche les visuels du bucket plutôt que le repli.

Contrôle SQL (terminal du conteneur `db` ou Database → Query) :
```sql
SELECT COUNT(*) FROM products;              -- attendu : 239
SELECT COUNT(*) FROM catalogueCategories;   -- attendu : 23
SELECT COUNT(*) FROM homeHeroSlides WHERE isActive = 1;  -- attendu : 20
SELECT COUNT(*) FROM mediaAssets WHERE transferStatus = 'transferred'; -- attendu : 2139
SELECT mediaTransferState, COUNT(*) FROM products GROUP BY 1;  -- attendu : complete = 239
```

---

## 10. Étape 9 — Domaine + TLS (quand le DNS de l'étape 1 répond)

1. Ressource Coolify → **Domains** : ajouter `https://gunmaster-pro.com` et `https://www.gunmaster-pro.com` → **TLS / Let's Encrypt : ON**.
2. `CANONICAL_ORIGIN` doit être exactement `https://gunmaster-pro.com` (étape 7) → Redeploy si modifié.
3. Vérifications publiques :
```bash
curl -sI https://gunmaster-pro.com/ | head -5                      # 200
curl -s https://gunmaster-pro.com/robots.txt                        # Sitemap: .../sitemap.xml
curl -s https://gunmaster-pro.com/sitemap.xml | grep -c "/produit/" # attendu : 239
BASE=https://gunmaster-pro.com bash scripts/verify-seo-ssr.sh       # depuis un shell avec le repo
```

---

## 11. Étape 10 — Fonctionnement sans interruption (ordre de déploiement)

- Chaque `git push` sur `main` → webhook → build Docker (`pnpm check && pnpm test && pnpm build` DANS l'image : un build cassé ne part jamais en prod) → swap après `healthcheck /healthz` OK (`start_period 45s`, retries 3).
- Les migrations du projet sont **uniquement additives** → l'ancien conteneur continue de servir pendant le build ; le nouveau ne reçoit le trafic Traefik qu'une fois sain.
- Après chaque deploy : exécutez `pnpm db:deploy` dans le nouveau conteneur `app` (non régressif, 30 s) — jamais avant le swap (l'ancien code reste compatible car migrations additives).
- Rollback : Coolify → Deployments → **Rollback** vers le déploiement précédent (volumes `gunsmasterpro_db` + `gmp_media` intacts, aucune donnée perdue).

---

## 12. Exploitation

- **Backups** : Coolify → Database/volume `gunsmasterpro_db` → dumps planifiés + copie hors VPS ; en plus, dump manuel avant chaque grosse opération :
```bash
docker exec <conteneur-db> mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" gunsmasterpro | gzip > gmp-$(date +%F).sql.gz
```
- **Logs** : ressource → Logs (app) ; `docker logs` en SSH en repli.
- **Médias** : tout upload admin va sur `gmp_media` (persistant entre déploiements). Ne stockez jamais d'originaux uniquement dans le conteneur.
- **SEO continu** : après chaque changement de contenu, relancer `verify-seo-ssr.sh` + resoumettre `sitemap.xml` dans Search Console.

---

## Annexe A — Dépannage express

| Symptôme | Cause probable | Fix |
|---|---|---|
| `Variables de production manquantes` au deploy | env non renseignée | Étape 7, Redeploy |
| `CANONICAL_ORIGIN doit utiliser HTTPS` | URL en http | Passer en `https://...` |
| Catalogue vide / 0 produit | `db:deploy` jamais lancé | Étape 8.1 |
| Visuels obsolètes après mise à jour des médias | `ensureCatalogueImported()` court-circuite si le compte est complet | Étape 8.2 (`seedCatalogueMedia.mjs`) |
| Hero vide mais page 200 | `seed-hero-slides` non lancé | Étape 8.3 |
| Images produits = repli SVG | clés Forge absentes, ou `mediaTransferState != 'complete'` | Étape 7 (clés Forge) puis Étape 8.2 |
| Une image renvoie **403** | clé de stockage contenant un espace (signature CloudFront invalide) | renommer en `categories/` ou `catalogue/pakarms/`, téléverser, puis Étape 8.2 |
| Une image renvoie **404** | objet absent du bucket | `node tools/verifyMediaUrls.mjs` pour lister, re-téléverser |
| Images hero/catégories cassées | clés Forge absentes (anciens builds) | Rebuild sur `main` récent (repli auto inclus) |
| **`_` dans le domaine, TLS impossible** | nom d'hôte non conforme (RFC 1123) | corriger le domaine dans le registrar, puis Étape 1 |
| `Base de données indisponible` (tests locaux) | pas de `DATABASE_URL` | Normal hors conteneur ; ignoré en prod |
| TLS en erreur | DNS non propagé | Étape 1 : attendre `nslookup` OK puis réémettre |

## Annexe B — Rappel preflight (bloquant, par design)

`scripts/production-preflight.mjs` refuse tout déploiement si : variable manquante/`CHANGE_ME`,
`CANONICAL_ORIGIN` non-HTTPS, `JWT_SECRET` < 32 car., `DATABASE_URL` non-`mysql://`.
C'est volontaire : mieux vaut un deploy bloqué qu'une prod cassée.
