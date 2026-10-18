# Catalogue public Pak Arms — livrable d’extraction

## Contenu

Le fichier `PakArms_catalogue_public.xlsx` est le classeur principal. Il comprend une feuille `Catalogue` avec une ligne par produit public, une feuille `Images` avec une ligne par image et son chemin local, ainsi que les feuilles `Catégories`, `Tags`, `Attributs`, `Données brutes` et `Lisez-moi`.

Le dossier `images/` conserve toutes les images originales référencées publiquement par les fiches. Les médias sont rangés dans un sous-dossier par produit, dont le nom débute par l’identifiant produit et le slug. L’ordre des fichiers reflète l’ordre de la galerie de la fiche.

Le dossier `raw/` contient les réponses publiques brutes des interfaces WooCommerce Store et WordPress REST, et les informations de pages collectées. Le dossier `reports/` contient le résumé de collecte et le relevé d’éventuelles erreurs d’images.

## Périmètre et méthode

Les données ont été collectées exclusivement à partir des interfaces et fiches accessibles publiquement sur `https://pakarms.co/`, sans connexion ni données d’administration. Les valeurs générales du produit, les prix affichés, le statut de vente, les catégories, tags, galeries et URLs de fiche proviennent de l’API publique WooCommerce Store. Les dates et éléments de taxonomie sont rapprochés de l’API WordPress REST. Les textes rendus et métadonnées visibles sont extraits de chaque page produit publique.

Les colonnes `JSON API complet`, `JSON-LD page` et la feuille `Données brutes` conservent les champs publics supplémentaires lorsqu’aucune colonne spécialisée ne peut les représenter de manière stable. Le fichier ne contient pas de données non publiées par le site, notamment les informations d’administration, le stock interne ou les identifiants non visibles.

## Résultat de collecte

La feuille `Lisez-moi` et `reports/summary.json` indiquent les chiffres et l’horodatage exacts de l’extraction. La feuille `Images` permet d’associer sans ambiguïté chaque image à son produit, son URL publique source et son chemin local.
