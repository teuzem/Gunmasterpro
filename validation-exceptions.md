# Validations restantes et prérequis externes

Les contrôles publics de rendu, thèmes, recherche, SEO SSR et persistance catalogue ont été exécutés. Les éléments ci-dessous restent volontairement ouverts, car les exécuter correctement requiert des éléments que le code local ne peut pas inventer ni simuler.

| Élément ouvert | Précondition nécessaire | État actuel | Contrôle à effectuer |
|---|---|---|---|
| Spécifications catalogue | Sources fabricant/distributeur vérifiables pour chaque variante exacte | Les champs confirmés sont conservés ; aucune donnée non vérifiée n’est ajoutée. | Vérifier référence, calibre, capacité, matériau et dimensions avant écriture en base. |
| Galeries des dix produits prioritaires | Médias explicitement licenciés et correspondant à la variante | Les médias principaux traçables sont en place. | Ajouter seulement les images dont provenance, licence et correspondance modèle sont confirmées. |
| Interface d’administration | Connexion Manus OAuth avec compte dont le rôle est `admin` | Les procédures et contrôles d’autorisation sont testés ; aucune opération réelle n’a été simulée. | Ouvrir `/administration` sur bureau/mobile, vérifier états vides, modérer un avis de test autorisé et actualiser le statut d’une demande de test. |
| Validation storefront intégrale | Session administrateur pour les dernières surfaces privées | Les parcours publics et la recherche interactive sont validés. | Rejouer le parcours administrateur ci-dessus, sans créer de fausse donnée métier. |
| Site Netlify existant | Compte Netlify avec crédit de déploiement et variables d’environnement configurées | Le déploiement direct vers `gunsmasterpro.netlify.app` a été refusé avant build pour dépassement du crédit. La branche GitHub `main` est prête pour un autre compte. | Importer `main`, renseigner les variables de `NETLIFY_DEPLOY.md`, lancer le build, puis contrôler routes SSR, OAuth et Storage. |
| Suppression du site Netlify redondant | Déploiement réussi et validé sur une cible confirmée | Non exécutée pour préserver un repli tant qu’aucune publication cible nouvelle n’est prête. | Après validation de la cible, supprimer seulement le site explicitement désigné par le propriétaire. |

> Aucun avis, évaluation, média, donnée administrative ou caractéristique produit fictifs ne doivent être créés pour fermer ces validations. Les contrôles automatiques existants restent exécutables via `pnpm test`, `pnpm test:search-interaction`, `pnpm exec tsc --noEmit --pretty false` et `pnpm build`.
