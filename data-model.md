# Modèle de données fonctionnel — GunsMasterPro

## Principes

L’authentification Manus OAuth reste l’unique mécanisme de session. La table `users` demeure la source de vérité des identités et des rôles `user` / `admin`; aucune table de mots de passe, jetons ou sessions parallèles n’est créée.

Les médias restent exclusivement dans Manus Storage. La base ne stocke que leurs clés, leurs URLs et leurs métadonnées. Les demandes catalogue restent des **demandes d’accompagnement**, non des paiements ou des ventes exécutés automatiquement.

## Entités à persister

| Table | Rôle | Relations essentielles |
| --- | --- | --- |
| `homeHeroSlides` | Slides, positions, liens et copies multilingues du carousel d’accueil | Référence de média Manus Storage, cible catalogue facultative |
| `newsletterSubscriptions` | Consentement et état d’abonnement e-mail | E-mail unique, locale et horodatages |
| `wishlists` | Produits enregistrés par un utilisateur authentifié | `users` → `products`, unicité utilisateur-produit |
| `userCollections` | Collections personnelles nommées et archivables | `users` → `collectionItems` |
| `collectionItems` | Produits, positions et dates d’ajout dans une collection | `userCollections` → `products` |
| `productReviews` | Avis authentifiés, modérables et non publiés par défaut | `users` → `products` → `reviewMedia` |
| `reviewMedia` | Références Storage de médias soumis avec un avis | `productReviews` |
| `catalogueRequests` | Demandes commerciales traçables, sans paiement ni livraison automatique | `catalogueRequestItems`, `catalogueRequestEvents` |
| `catalogueRequestItems` | Références et quantités demandées | `catalogueRequests` → `products` |
| `catalogueRequestEvents` | Historique d’état d’une demande | `catalogueRequests` |
| `productSpecificationAudits` | Provenance, état de vérification et valeur des champs enrichis | `products`, clé de caractéristique |

## États et autorisations

Les avis suivent `pending`, `approved`, `rejected`; aucune donnée d’avis n’est amorcée artificiellement. Les demandes suivent `received`, `under_review`, `information_required`, `closed`. Les collections, favoris, avis soumis et médias associés nécessitent un utilisateur authentifié. Les opérations de modération et d’administration nécessitent le rôle `admin`.

## Repli et cohérence

Les visuels du hero et des catégories conservent une URL de repli explicite. Chaque nouvelle valeur technique de produit sera reliée à un enregistrement d’audit indiquant la source, le statut de vérification et la date de contrôle. Les champs qui ne peuvent pas être confirmés ne seront pas inventés.
