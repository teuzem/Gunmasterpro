# Architecture de l’administration centrale

L’administration centrale est protégée par des procédures tRPC côté serveur. Elle réunit le catalogue, les catégories, les paramètres de contact et les journaux d’activité. Aucune action de modération, de bannissement ou de modification du catalogue ne devient disponible par la seule interface navigateur : chaque mutation est contrôlée par le rôle porté par la session serveur.

## Rôles et approbation des administrateurs

Le compte propriétaire vérifié est synchronisé comme `super_admin`. Tout utilisateur authentifié peut demander l’accès administrateur, mais une demande ne crée aucun privilège par elle-même. Seul le `super_admin` peut approuver, refuser ou révoquer une demande ; ces décisions sont persistées avec l’acteur, le compte visé, une éventuelle note et l’horodatage dans les journaux d’administration et de workflow.

| Rôle | Accès accordé | Actions interdites |
|---|---|---|
| `user` | Parcours publics et personnels ; demande d’accès administrateur | Administration, approbation et gestion des utilisateurs |
| `admin` | Gestion opérationnelle du catalogue, médias, catégories, demandes, avis, réglages, activités et localisations consenties | Liste/bannissement des utilisateurs ; approbation, refus ou révocation des administrateurs |
| `super_admin` | Toutes les actions `admin` et la gouvernance des comptes/demandes d’accès | Auto-révocation, traitement de sa propre demande, modification d’un autre compte administrateur par le bannissement classique |

> Une demande ne peut être approuvée ou refusée qu’une fois tant qu’elle est en attente. La révocation ne concerne qu’un accès précédemment approuvé et ramène le compte au rôle `user`. Les contrôles sont appliqués côté serveur, y compris si une interface modifiée tentait d’appeler directement une procédure protégée.

## Géolocalisation approximative consentie

La solution retenue est l’API publique [Country][1]. Elle ne demande aucune clé, déclare une utilisation commerciale gratuite, expose pays, subdivision, ville et coordonnées sous forme approximative, et documente une limite d’infrastructure de 10 requêtes par seconde [1]. L’appel est exécuté uniquement côté serveur, après un consentement explicite ; il ne transmet pas la géolocalisation déclarée par le navigateur. Le serveur utilise l’adresse de requête disponible à cet instant, ne persiste jamais cette adresse brute et conserve uniquement la réponse géographique minimale nécessaire.

| Donnée | Usage | Conservation par défaut |
|---|---|---:|
| Pays, région, ville, latitude, longitude approximatives | Tableau de répartition et contrôle administratif | 30 jours |
| Horodatage, type de consentement, version de notice | Preuve de préférence et retrait | 30 jours après retrait |
| Identifiant de visite pseudonyme ou utilisateur connecté | Relier une visite consentie sans stocker l’IP | 30 jours |

Les visiteurs peuvent refuser ; le refus ne bloque ni la consultation du catalogue ni les parcours publics. Le retrait supprime les enregistrements géographiques associés à l’identifiant concerné. La localisation sert à afficher une répartition agrégée et à contextualiser un compte dans l’administration ; elle ne doit pas devenir une condition automatique de blocage.

> Une géolocalisation IP représente une estimation, pas une preuve de présence physique. Les coordonnées ne doivent pas être utilisées pour prendre seules une décision relative à l’accès d’un utilisateur.

## Utilisateurs et restrictions

Le statut d’un compte est `active` ou `banned`. Un bannissement exige un motif, un horodatage et l’administrateur ayant réalisé l’action. Le contrôle est appliqué côté serveur aux procédures protégées. Les opérations seront journalisées avec acteur, cible, type, détail non sensible et date.

## Paramètres de contact

Le numéro WhatsApp et le pseudo Telegram deviennent des paramètres administrables persistants. Le storefront les lit par procédure publique et affiche les liens à partir de ces valeurs validées. Les changements sont journalisés et prennent effet après invalidation de cache des requêtes.

## Références

[1]: https://country.is/ "Country — API de géolocalisation IP gratuite"
