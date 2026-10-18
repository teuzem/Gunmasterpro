# Validation SEO technique

Le storefront est désormais rendu côté serveur pour les routes publiques. Les contrôles locaux de production ont confirmé un code HTTP 200, un titre unique, une balise Open Graph, une URL canonique et des données structurées sur l’accueil, le catalogue et la fiche `.22 Caliber Pocket Size Mini Compact Pistol A+ Copy`. Une fiche inexistante répond bien HTTP 404 avec `noindex`.

| Surface | Contrôle effectué | Résultat |
|---|---|---|
| Accueil | Titre, canonical, Open Graph, Organization et WebSite JSON-LD | Présents dans le HTML initial |
| Catalogue | Titre, canonical et CollectionPage JSON-LD | Présents dans le HTML initial |
| Fiche produit | Titre, canonical, Open Graph et Product/Offer/BreadcrumbList JSON-LD | Présents dans le HTML initial |
| Routes privées | Panier, favoris, suivi et administration | Déclarées `noindex` dans le préchargement SSR |
| Ressources crawl | `/robots.txt` et `/sitemap.xml` | Répondent HTTP 200 ; le sitemap inclut les pages publiques et les produits |

La variable `CANONICAL_ORIGIN` peut être fixée dans chaque environnement d’hébergement pour substituer le domaine canonique officiel. En son absence, l’application utilise le domaine Manus actuellement publié ; cette valeur devra être alignée sur le domaine Netlify choisi avant son déploiement externe.

Le script `scripts/verify-seo-ssr.sh` a ensuite validé automatiquement le contenu rendu côté serveur de l’accueil, du catalogue, de la catégorie `handguns`, de la fiche de référence, et d’une page d’information. Il vérifie aussi la 404 réelle d’une fiche inconnue ainsi que le `noindex` des routes `/panier`, `/favoris`, `/suivi` et `/administration`.

La validation exhaustive couvre désormais l’ensemble des familles `handguns`, `rifles`, `shotguns` et `accessories`, ainsi que `/a-propos`, `/comparateur`, `/conseiller`, `/aide`, `/confidentialite`, `/mentions-legales`, `/conditions` et `/conformite`. Chaque route publique testée retourne HTTP 200, un body pré-rendu, un canonical, les métadonnées Open Graph et Twitter, ainsi qu’un bloc JSON-LD. Les routes privées contrôlées retournent `noindex`, et une fiche inconnue conserve HTTP 404.
