# Contrôle authentifié — recherche catalogue administrateur

Date : 24 août 2026.

La session administrateur active sur `gunspro-manu-bcfvkwwp.manus.space` ouvre correctement `/administration?geo=off` et affiche les 239 références catalogue. Au premier contrôle immédiatement après le checkpoint `65487d5f`, la page de production servait encore l’ancienne interface de catalogue : le champ visible portait le placeholder `Rechercher un produit…` et n’affichait pas encore le libellé de recherche avancée.

Après le checkpoint `38617e0f`, une nouvelle navigation authentifiée a confirmé la propagation de la console modernisée : l’onglet Catalogue affiche « Recherche & CRUD catalogue », « Modifier une référence rapidement » et l’instruction de sélection de suggestion. La validation de saisie et d’ouverture d’éditeur reste à réaliser sans soumettre de changement. Aucune donnée catalogue n’a été modifiée.

Un contrôle de navigation clavier a confirmé l’accès aux actions « Ajouter » et « Modifier » dans le catalogue déployé, mais l’automate navigateur n’a pas localisé le texte complet du placeholder de recherche alors que la zone de recherche est rendue par le client. Le scénario Playwright local, exécuté sur le même code, valide la saisie, `ArrowDown`/`Enter` et la sélection de suggestion sur les surfaces publique desktop/mobile. Cette limite de sélecteur du contrôle authentifié n’a produit aucune mutation.

La capture authentifiée suivante confirme toutefois le rendu visuel attendu : le champ de recherche administratif est large, placé sous le bloc « Modifier une référence rapidement », et contient l’invite « Rechercher une référence, une marque, un modèle ou un slug… ». L’automate ne remonte pas ce champ dans sa liste d’éléments au même instant, probablement du fait de son défilement virtualisé ; aucun enregistrement n’a été envoyé.
