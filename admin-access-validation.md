# Validation du système d’accès administrateur

Le compte principal vérifié (`id = 1`) a été promu au rôle `super_admin` par la migration `0005_tranquil_psylocke.sql`. La base ne contient actuellement aucun autre compte privilégié.

Le jalon `ceef8d1e` a réussi les tests Vitest (24), TypeScript et le build SSR. Lors du premier contrôle authentifié sur le domaine de production juste après publication, le navigateur a encore affiché l’ancien écran « Accès réservé ». Cette chaîne ne correspond plus au composant actuel, qui rend un portail de demande d’accès contrôlé. Le résultat doit donc être recontrôlé après propagation/cache ; aucune demande, approbation ou modification de compte n’a été envoyée.

Après propagation, le bundle publié a été confirmé comme `index-CAFc7M8v.js`. La session propriétaire a alors ouvert la section « Utilisateurs » : elle affiche la gouvernance d’accès, l’état vide des demandes, le rôle `SUPER ADMIN` et le statut `ACTIVE` du seul compte présent. Les actions de décision n’ont pas été déclenchées, afin de ne pas créer de demande ou modifier d’accès réel pendant ce contrôle.
