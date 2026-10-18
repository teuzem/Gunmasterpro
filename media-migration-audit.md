# Audit de migration média

## Dossier Drive sans fiche catalogue

Le dossier Drive **4034_pak-arms-store-visiting-card** a été isolé le 23 août 2026. Il ne correspond à aucune fiche produit du snapshot catalogue et ne possède donc aucune référence `products` ou `mediaAssets` à mettre à jour. Ses deux fichiers ne sont pas rattachés au storefront et ne seront pas présentés comme médias de produit.

L’importateur direct vérifie désormais qu’une fiche catalogue est associée à chaque identifiant Drive **avant** tout téléversement. Cette prévalidation interrompt un lot contenant un dossier orphelin, ce qui protège les prochaines migrations contre des objets de stockage non rattachables.

## Lot repris 023

Les dossiers catalogués **4019** et **4050** ont été repris séparément, avec 12 médias Drive transférés et vérifiés en base. Les deux produits sont en état `complete`, avec zéro média en attente.

## Références historiques sans dossier Drive manifeste

Le 23 août 2026, les produits **22 — Ruger 10/22** (quatre références), **47 — AK-47** (quatre références) et **66 — TOZ-66** (une référence) ont été réconciliés. Aucun de ces trois identifiants ne figure dans `root-folders.json`, le manifeste du Drive autorisé. Les neuf URLs historiques sous `/manus-storage/` ont en outre été contrôlées contre le domaine du storefront et retournent toutes **HTTP 403**, tandis qu’un objet issu du lot Drive 080 est lisible avec **HTTP 200**.

Ces médias ne sont donc ni téléversés de nouveau ni remplacés par une source substitutive. Ils sont marqués `failed` avec une cause explicite et les trois produits restent en état `partial`, ce qui force le repli média explicite de l’application. Cette décision clôt l’audit sans prétendre qu’un objet absent a été transféré.
