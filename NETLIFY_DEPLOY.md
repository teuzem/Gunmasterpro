# Déploiement Netlify portable

Ce dépôt peut être déployé sur un compte Netlify crédité depuis sa racine. La configuration `netlify.toml` exécute `pnpm run build:netlify`, publie les assets client de `dist/public` et sert les routes SSR/API via `netlify/functions/app.ts`. Le rendu SSR conserve ainsi les métadonnées, le sitemap et les routes applicatives au lieu de retomber sur une simple application monopage.

## Pré-requis

Utilisez Node.js 22 et pnpm 10.4.1. Après l’import GitHub du dépôt, conservez les paramètres déclarés dans `netlify.toml` : commande de build `pnpm run build:netlify`, répertoire de publication `dist/public`, et dossier de fonctions `netlify/functions`.

## Variables d’environnement

Les valeurs sensibles doivent être créées dans **Site configuration → Environment variables** du compte Netlify. Elles ne doivent jamais être ajoutées à Git ni aux fichiers de configuration publics.

| Variable | Requise | Rôle |
|---|---:|---|
| `DATABASE_URL` | Oui | Connexion à la base catalogue, comptes et parcours persistants. |
| `JWT_SECRET` | Oui | Signature des sessions. Utiliser une valeur aléatoire, longue et propre à l’environnement. |
| `OAUTH_SERVER_URL` | Oui si l’authentification Manus est conservée | Point d’accès du fournisseur OAuth. |
| `VITE_APP_ID` | Oui si l’authentification Manus est conservée | Identifiant public de l’application OAuth, également exposé au client. |
| `BUILT_IN_FORGE_API_URL` | Oui pour le proxy de stockage Manus | URL de l’API Forge/Storage utilisée côté serveur. |
| `BUILT_IN_FORGE_API_KEY` | Oui pour le proxy de stockage Manus | Clé secrète du proxy Forge/Storage. |
| `OWNER_OPEN_ID` | Recommandée | Identifiant du propriétaire, utilisé par les contrôles administrateur. |
| `VITE_OAUTH_PORTAL_URL` | Oui si l’authentification Manus est conservée | URL de connexion exposée au navigateur. |
| `VITE_FRONTEND_FORGE_API_URL` | Selon les fonctionnalités clientes Storage | Endpoint Forge exposé au navigateur. |
| `VITE_FRONTEND_FORGE_API_KEY` | Selon les fonctionnalités clientes Storage | Clé frontend fournie par l’environnement Forge. |
| `CANONICAL_ORIGIN` | Oui | URL HTTPS finale, par exemple `https://votre-domaine.example`, sans slash final. |
| `SITE_NAME` | Recommandée | Nom affiché dans les métadonnées, par défaut `GunsMasterPro`. |

> Les paramètres `STATIC_DIR`, `NODE_VERSION`, `PNPM_VERSION` et l’origine canonique de secours sont définis dans `netlify.toml`. Une valeur `CANONICAL_ORIGIN` définie dans l’interface Netlify doit correspondre exactement au domaine réellement public afin d’éviter des liens canoniques incorrects.

## Vérification post-déploiement

Après un déploiement prêt, contrôlez `/`, `/catalogue`, une catégorie et une fiche produit. Vérifiez également `/robots.txt`, `/sitemap.xml`, les balises canonical/Open Graph/Twitter dans le HTML renvoyé par le serveur et le statut 404 d’une fiche inexistante. Les routes `/panier`, `/favoris`, `/suivi` et `/administration` doivent conserver `noindex`.

Avant d’ouvrir l’administration, configurez les URL de retour autorisées auprès du fournisseur OAuth correspondant au nouveau domaine Netlify. Si le compte Netlify ne peut pas utiliser les services Manus OAuth/Storage, remplacez ces intégrations par des fournisseurs compatibles ou conservez le déploiement Manus comme environnement applicatif principal.
