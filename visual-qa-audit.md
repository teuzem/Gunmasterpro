# Audit visuel — passe de correction

## Captures utilisateur

La capture panoramique de fiche produit fournie le 23 août 2026 a été lue par quatre zones horizontales superposées. Les deux premières zones confirment que la galerie média occupe la partie gauche de la fiche, avec des contrôles de navigation correctement contenus. La zone de détail commence à droite de la galerie ; l’anomalie signalée concerne donc le dimensionnement et la rupture de ligne du panneau d’information, non l’image elle-même.

Les captures de header et de recherche indiquent séparément un logo et des libellés trop larges, ainsi qu’un panneau de recherche superposé qui se juxtapose au contenu de la fiche au lieu de s’y adapter.

Les troisième et quatrième zones de la capture panoramique confirment un défaut de largeur : le titre de produit ne contraint ni ses retours à la ligne ni sa taille à la largeur de la colonne de détail. Il est donc tronqué à droite et pousse la ligne d’extrait hors du panneau. Le bouton de partage est correctement positionné, mais le widget fixe WhatsApp recouvre l’extrait. La correction devra plafonner la typographie par breakpoint, appliquer `overflow-wrap:anywhere` aux chaînes catalogue et réserver une zone basse aux widgets fixes.

La capture de header confirme que le mot-symbole GunsMasterPro ne dispose pas d’une largeur maximale ni d’un comportement de réduction, si bien que les commandes suivantes sont coupées à droite. La capture de recherche confirme qu’un panneau de résultats reste ouvert dans la colonne de gauche et recouvre la fiche ; ses textes de prix et de disponibilité dépassent la largeur disponible. Les widgets de contact fixes renforcent l’obstruction sur les petits écrans.

Le contrôle de stockage a identifié que dix-huit références de catégories contenant des espaces dans leur chemin renvoyaient HTTP 403 via le proxy. Les originaux du lot propriétaire ont été rechargés sous des noms sans espaces, puis les références `catalogueCategories` et `mediaAssets` ont été mises à jour transactionnellement. Les vingt-trois URLs actuellement enregistrées répondent désormais HTTP 200. Les cartes de catégories utilisent une image recadrée et un chargement immédiat pour que la section courte ne présente plus de cases vides au défilement.

Les vérifications de cette passe ont couvert l’accueil, le catalogue, la fiche Beretta 92FS et le panier sur bureau et mobile, ainsi que la fiche produit et le panier en thème sombre. Les titres produit sont désormais contraints à leur colonne, le header réduit ses éléments avant de créer une largeur excédentaire, les widgets de contact quittent la zone de détail de la fiche sur bureau et les panneaux de recherche mobile disposent d’une hauteur réellement défilable. La suite Vitest comporte désormais des assertions de non-régression de ces règles ; elle a réussi avec la vérification TypeScript et le build de production.

Une recherche réelle sur « beretta » a été prévisualisée sur bureau et mobile. Sur bureau, les résultats disposent désormais de trois colonnes stables — vignette, libellé tronqué sans collision, prix — et les widgets secondaires sont masqués pendant la recherche. Sur mobile, le panneau couvre correctement la fenêtre, conserve une liste défilable et ne laisse aucun élément fixe masquer les résultats. En thème clair, le prompt de préférence de langue et le contrôle d’âge adoptent maintenant les surfaces, textes, bordures et actions bleues de la charte claire, au lieu de conserver un panneau sombre résiduel.

Le tiroir de panier et le popup de finalisation ont également été contrôlés en thèmes clair et sombre. Les deux surfaces conservent maintenant une modalité sombre appropriée en thème sombre ; en thème clair, ils emploient une surface blanche, des champs bordés bleu clair, des textes bleu nuit et une action principale bleue. Cette correction évite la coexistence d’un tiroir clair avec un formulaire final sombre.

L’audit complémentaire des overlays confirme que le consentement et le menu mobile respectent le thème clair. Les invitations d’engagement masquent maintenant la préférence de langue et les actions fixes concurrentes, évitant toute pile de popups. Sur les très petits écrans, le sélecteur de thème quitte le header et reste disponible dans le menu ; l’espace dégagé permet au mot-symbole complet de rester visible sans défilement horizontal.

La lightbox d’avis a été contrôlée avec le média réel de la fiche Beretta 92FS, en thèmes clair et sombre, sans générer de faux avis. Le fond sombre reste volontairement neutre pour la consultation d’image ; le bouton de fermeture doré conserve un contraste suffisant. Les lightboxes de galerie et d’avis masquent désormais les prompts et widgets secondaires, de sorte qu’un seul overlay recevra l’interaction à la fois.

Le prompt newsletter et le menu mobile ont enfin été vérifiés à 375 px, en thèmes clair et sombre. Le menu conserve ses contrastes et ses actions sans créer de largeur excédentaire. Le prompt newsletter a été rendu scrollable sous contrainte de hauteur, avec texte et lien de confidentialité compactés : le contenu entier reste à l’intérieur de la carte au lieu de recouvrir la page située derrière.

## Couverture des états contrôlés

| Surface | Bureau | Mobile 375 px | Thème clair | Thème sombre | Résultat contrôlé |
|---|---:|---:|---:|---:|---|
| Header et titre de fiche | Oui | Oui | Oui | Oui | Marque, boutons et titres restent dans leur largeur disponible. |
| Catégories | Oui | Oui | Oui | Oui | Les 23 URLs Storage répondent HTTP 200 et les cartes affichent leurs visuels. |
| Recherche avec « beretta » | Oui | Oui | Oui | Oui | Libellé, prix et résultats sont contenus ; les widgets concurrents se masquent. |
| Menu mobile | — | Oui | Oui | Oui | Navigation, langue, thème et actions restent lisibles sans débordement. |
| Consentement et newsletter | — | Oui | Oui | Oui | Une seule invitation est active et le lien de confidentialité demeure dans la carte. |
| Panier et finalisation | Oui | N/A | Oui | Oui | Tiroir, formulaire et action principale suivent le thème actif. |
| Lightbox média | Oui | N/A | Oui | Oui | Le média est lisible, la fermeture contrastée et les prompts secondaires sont masqués. |

La fiche Pak Arms au titre très long a aussi été contrôlée à 375 px en thèmes clair et sombre après la réduction finale de `.product-detail-title`. Le titre conserve trois lignes équilibrées, ne déborde pas de la carte d’achat et laisse les zones prix, quantité, bouton de demande et spécifications lisibles. La prévisualisation `geo=off` est strictement limitée au développement et a servi uniquement à isoler cette vérification des prompts de préférence de langue.

Le 23 août 2026, la requête de développement `?geo=off&search=beretta` a de nouveau confirmé sur bureau un champ renseigné, une `listbox` de résultats et six boutons portant le rôle `option`, suivis de l’action « Voir tous les résultats ». Cette observation valide le rendu et l’accessibilité sémantique de la liste ; la navigation réelle par flèches et validation Enter/clic reste une vérification séparée tant qu’un navigateur interactif est disponible.

La même requête a été capturée à 375 × 812 px. Le panneau mobile couvre la fenêtre avec une action de fermeture distincte, six résultats hiérarchisés par vignette/libellé/statut/prix, et une action « Voir tout le catalogue » visible au bas de la liste. Aucun widget flottant, débordement horizontal ou recouvrement de résultat n’est présent dans la zone visible. Une exécution navigateur automatisée a finalement validé la sélection réelle : `ArrowDown` puis `Enter` sélectionnent et ouvrent la première suggestion sur bureau ; un clic sur une suggestion ouvre également sa fiche sur mobile.

## Passe finale de lisibilité claire et sombre

| Route contrôlée | Clair | Sombre | Conclusion |
|---|---:|---:|---|
| Accueil | Oui | Oui | Hero, cartes, catégories, FAQ, newsletter et pied de page conservent contraste et rythme vertical. |
| Catalogue | Oui | Oui | Filtres, badges, cartes, prix et contrôles restent hiérarchisés sans collision. |
| Fiche produit longue | Oui | Oui | Galerie, panneau d’achat, titre, spécifications, avis et produits similaires restent lisibles. |
| Comparateur | Oui | Oui | État vide, compteur et cartes de références gardent des actions distinctes. |
| Conseiller | Oui | Oui | Étapes, cartes de parcours et actions de contact restent contrastées. |
| Centre d’aide | Oui | Oui | Hero éditorial, cartes d’information et newsletter restent lisibles. |
| Confidentialité | Oui | Oui | Texte long, avertissement, références et liens gardent une hiérarchie claire. |
| Conditions | Oui | Oui | Sections réglementaires et actions de catalogue restent contrastées. |
| À propos | Oui | Oui | Hero, panneaux explicatifs, newsletter et pied de page restent lisibles. |
| Mentions légales | Oui | Oui | Avertissement, cartes d’éditeur/hébergement et contenus de contact sont contenus. |
| Conformité | Oui | Oui | Cartes de vérification, texte long et action principale restent distincts. |
| Catégorie Armes de poing | Oui | Oui | En-tête, filtres, cartes, badges de stock et pagination restent hiérarchisés. |
| Catégorie Carabines | Oui | Oui | Filtres latéraux, cartes et actions de sélection gardent une lecture nette. |
| Catégorie Fusils | Oui | Oui | Grille réduite, message d’état et pied de page restent correctement espacés. |
| Catégorie Accessoires | Oui | Oui | Cartes média, badges, boutons et critères de filtrage restent contrastés. |

Les captures plein écran de cette passe n’ont pas révélé de défilement horizontal, de texte fusionné avec une surface de même tonalité ni de contrôle public recouvert par un autre élément. Les exceptions restantes concernent exclusivement les parcours nécessitant une session administrateur et les éléments métier qui exigent des sources additionnelles vérifiables.
