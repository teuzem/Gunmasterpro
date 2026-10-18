# Audit des sources de caractéristiques produit

## Constat initial

L’audit de la base révèle des valeurs de remplacement pour une part importante du catalogue : 225 matériaux, 211 mécanismes, 193 capacités, 229 longueurs de canon, 229 longueurs hors tout et 229 poids sont déclarés « Non communiqué ». Ces valeurs ne doivent pas être remplacées par déduction à partir d’une photo ou du seul nom commercial.

## Sources consultées

| Source | Rôle possible | Limite constatée |
| --- | --- | --- |
| [Pak Arms Store](https://pakarms.co/) | Source commerciale apparentée au catalogue original | La page d’accueil extraite ne livre pas de fiche technique de produit. |
| [PakArms Pakistan](https://pakarms.pk/) | Répertoire commercial de produits et références voisines | Les extraits contiennent des titres et quelques caractéristiques, mais l’exactitude doit être confirmée fiche par fiche. |
| [Daudsons Armoury](https://www.daudsons.com/) | Fabricant pour certains modèles pakistanais | Le site publie des références fabricant et des informations générales, non la totalité des 239 modèles. |
| [Haider Arms](https://haiderarms.com/) | Répertoire de distributeur et pistes vers les références constructeur | La page catalogue identifie plusieurs modèles comparables, mais ne constitue pas une source primaire universelle. |

## Règle d’enrichissement

Chaque champ renseigné sera associé à `productSpecificationAudits` avec une source, une URL si disponible, une date de contrôle et un statut. Les fiches sans source primaire ou revendeur identique vérifiable resteront explicitement « Non communiqué » et seront consignées comme exceptions, sans remplacement fictif.

## Référence vérifiée : Glock 17 Gen5

La fiche européenne officielle [GLOCK G17 Gen5](https://eu.glock.com/en/products/pistols/g17-gen5), consultée le 23 août 2026, confirme le calibre **9 mm Luger**, le système **Safe Action**, une capacité standard de **17**, une longueur de canon de **114 mm**, un poids sans chargeur de **630 g** et une longueur hors tout de **202 mm**. La page décrit également une carcasse polymère et une finition nDLC de culasse. La source sera référencée dans `productSpecificationAudits`; aucun média tiers issu des résultats de recherche d’images n’est retenu à ce stade.

## Référence à compléter : CZ 75 B

Le résultat de recherche pointant vers une supposée fiche officielle CZ 75 B a été ouvert le 23 août 2026 mais aboutit à une page **404** du site constructeur. Cette URL n’est donc pas retenue comme preuve ni comme source média. Une source primaire alternative, un catalogue constructeur téléchargeable ou une fiche de distributeur explicitement associée au modèle reste nécessaire.

## Références vérifiées : SIG Sauer P226 Legion et Beretta 92FS

La fiche officielle [SIG Sauer P226 LEGION](https://www.sigsauer.com/p226-legion-full-size.html), consultée le 23 août 2026, publie un visuel produit constructeur et confirme, pour la variante 9 mm DA/SA affichée, un canon de **111,76 mm**, une longueur hors tout de **203 mm**, un poids de **935,5 g**, une carcasse en alliage, une culasse inox et des plaquettes G10. La capacité est présentée à 10 coups pour la variante conforme à un marché spécifique; elle ne sera donc pas appliquée à la fiche catalogue sans confirmation de la variante vendue.

La fiche officielle [Beretta 92FS](https://www.beretta.com/en-us/product/92fs-FA0043), consultée le 23 août 2026, affiche une image produit constructeur et décrit le mécanisme semi-automatique à recul court, verrouillage par bloc oscillant, en double/simple action, ainsi que les commandes ambidextres. Les dimensions, calibre et poids de la variante affichée seront extraits de la fiche technique publique associée avant toute écriture en base.

## Référence vérifiée : Walther PPK/S

Le catalogue historique officiel [Walther PPK/S](https://waltherarms.com/legacy/ppk-s), consulté le 23 août 2026, confirme que la gamme PPK/S est proposée en .22 LR, .32 ACP et .380 ACP, avec mécanisme SA/DA et capacités variant de 7 à 10 coups. Les variantes .380 ACP listées affichent un canon de 3,3 pouces et une capacité de 7 coups. Le catalogue précise toutefois que les images et logos du site ne peuvent pas être utilisés sans permission expresse; ses médias ne seront donc **pas téléchargés ni rattachés** au storefront.

## Référence historique : Browning Hi-Power

La page officielle [Browning Hi-Power](https://www.browning.com/products/firearms/pistols/hi-power.html), consultée le 23 août 2026, indique que ce modèle n’est plus fabriqué. Elle ne fournit pas une fiche de caractéristiques complète pour une variante précise et ne constitue donc pas une preuve suffisante pour renseigner les valeurs exactes de la fiche catalogue. Son visuel n’est pas téléchargé ni rattaché sans licence ou autorisation de réutilisation confirmée.

## Référence vérifiée à granularité de plateforme : Ruger 10/22

La page officielle [Ruger 10/22](https://ruger.com/products/1022/overview.html), consultée le 23 août 2026, confirme pour les modèles standard un chargeur rotatif détachable de **10 coups**, un canon martelé à froid, une sûreté manuelle transversale et un boîtier de détente en polymère renforcé de fibre de verre. Elle précise que certaines variantes distributeur peuvent différer et renvoie vers des fiches techniques par numéro de modèle. En l’absence du numéro de modèle exact pour la référence GunsMasterPro, les longueurs et le poids ne seront pas généralisés depuis une variante spécifique.

## Référence historique : FN FAL

La page officielle [FN America — About FN](https://fnamerica.com/about-fn/), consultée le 23 août 2026, attribue le premier prototype FAL à Dieudonné Saive en 1947 et indique son adoption initiale par l’armée canadienne en 1954, suivie par de nombreux pays. Elle ne publie pas de tableau de caractéristiques pour une variante FAL commercialisée. Les données de calibre, dimensions, capacité et mécanisme de la fiche GunsMasterPro restent donc non confirmées tant qu’une variante source identifiable ou une fiche technique d’archive autorisée n’est pas disponible.

## Média public importé : Beretta 92FS

Le 23 août 2026, les cinq images WebP affichées sur la page produit officielle Beretta 92FS ont été téléchargées dans l’espace d’assets externe, vérifiées visuellement, puis transférées vers Manus Storage. Chaque objet conserve l’URL Beretta d’origine dans `mediaAssets.sourceUrl`. La référence produit est enregistrée avec `mediaRightsStatus = pending`, afin que la provenance soit transparente et qu’une validation commerciale des droits de réutilisation reste possible.

## Média public importé : SIG Sauer P226 Legion

Le 23 août 2026, l’image principale et le visuel de détail publiés sur la fiche SIG Sauer P226 Legion ont été téléchargés, vérifiés visuellement et transférés vers Manus Storage. Les deux URLs constructeur sont conservées dans `mediaAssets.sourceUrl`; la fiche reste en statut de droits `pending` jusqu’à validation commerciale de la réutilisation.

## Source publique retenue : Glock 17 Gen5

La page [Freedom Outdoors — Glock 17 Gen5 9 mm 17 coups](https://freedomoutdoors.us/glock-17-gen5-9mm-17rd/), consultée le 23 août 2026, correspond explicitement au modèle Glock 17 Gen5 et présente deux images produit. Elle reprend le calibre 9 mm, un canon de 4,49 pouces, une longueur hors tout de 7,95 pouces, une carcasse polymère, une culasse acier et une conception semi-automatique. La capacité n’est pas précisée dans le tableau de cette page; la source officielle GLOCK reste la référence pour la capacité standard. Les visuels seront enregistrés avec attribution complète et un statut de droits `pending`.

## Média public importé : Glock 17 Gen5

Le 23 août 2026, les deux images publiées par Freedom Outdoors pour le Glock 17 Gen5 9 mm 17 coups ont été téléchargées, vérifiées visuellement et transférées vers Manus Storage. Les URLs source exactes sont conservées dans `mediaAssets.sourceUrl`; le statut de droits de la fiche est maintenu à `pending` pour contrôle commercial ultérieur.

## Licences Wikimedia vérifiées pour les fiches prioritaires

Les métadonnées déjà enregistrées pour les dix premières fiches sans média transféré pointent vers des fichiers Wikimedia Commons à licence explicite. Le 23 août 2026, les pages de fichiers ont été vérifiées pour les quatre premières références : le visuel Glock est sous **CC BY 2.0**, le visuel CZ 75 sous **CC0 1.0**, les visuels SIG Sauer P226 Legion et Beretta 92FS sous **CC BY-SA 4.0**. Ces licences permettent la réutilisation sous réserve d’attribution, et pour les fichiers ShareAlike du respect des conditions de partage. Les médias commerciaux précédemment importés restent marqués `pending`; les futurs rattachements privilégieront les sources Wikimedia explicitement licenciées.

## Média sous licence ouverte importé : CZ 75 B

Le 23 août 2026, la photographie `CZ 75.jpg` de Land68, explicitement placée sous **CC0 1.0** sur Wikimedia Commons, a été téléchargée, vérifiée visuellement et téléversée vers Manus Storage. Elle devient le média primaire de la fiche CZ 75 B avec un statut de droits `verified`; l’attribution et le lien vers la page de fichier sont conservés dans les données produit et l’actif média.

## Vérification de quatre références Wikimedia supplémentaires

Le 23 août 2026, les pages de fichiers suivantes ont été contrôlées avant tout téléchargement : **Walther PPK/S** par Tomas Castelazo sous CC BY-SA 4.0 avec texte d’attribution imposé ; **Browning Hi-Power** par Rama sous CC BY-SA 2.0 France (ou CeCILL) ; **Ruger 10/22** par James Case sous CC BY 2.0 ; **FN FAL** par Atirador sous CC BY-SA 3.0 (ou GFDL). Les quatre visuels représentent les familles de produits annoncées. Le fichier Walther indique explicitement PPK/S et peut donc être rattaché avec attribution complète. Pour chaque rattachement, la page Wikimedia, l’auteur, la licence et le lien de licence seront conservés dans les données du produit et de l’actif.

Les prévisualisations téléchargées confirment que les deux premiers médias montrent respectivement un **Walther PPK/S** et un **Browning Hi-Power**. Ils sont adaptés comme médias de référence de famille, sans inférer une finition, un calibre ou une sous-variante non identifiée par les fiches catalogue.

Les deux prévisualisations suivantes confirment un **Ruger 10/22** à crosse bois avec chargeur rotatif et un **FN FAL**. Elles sont utilisables pour illustrer les familles correspondantes, sans modifier les caractéristiques techniques spécifiques déjà en attente de source de variante.

## Vérification des deux dernières sources Wikimedia prioritaires

Le 23 août 2026, la page du fichier **AK47.jpg** a confirmé un visuel AK-47 placé dans le domaine public américain, dérivé d’une image Olive-Drab issue d’archives du gouvernement fédéral américain et retouchée par PawełMM. Le fichier complémentaire **AK-47 and Type 56 DD-ST-85-01269.jpg** est également du domaine public en tant qu’œuvre de l’armée américaine ; il représente à la fois un Type 56 et un AK-47, et ne sera utilisé qu’en galerie avec ce contexte explicite. La page **TOZ-66 Shotgun.jpg** confirme un visuel du TOZ-66 par DTKCEKDRK sous CC BY-SA 4.0. Ces trois sources présentent une licence explicite et des liens de provenance vérifiés.

La prévisualisation du fichier TOZ-66 confirme qu’il s’agit d’un fusil juxtaposé TOZ-66. Le média est distribué au storefront au format WebP après récupération via le navigateur à la suite d’une limitation ponctuelle de téléchargement direct ; cette conversion est consignée avec l’attribution CC BY-SA 4.0.

## Couverture exhaustive des champs non confirmés

Le 23 août 2026, les colonnes métier du catalogue ont été recalculées et un enregistrement a été créé dans `productSpecificationAudits` pour **chaque** valeur encore déclarée « Non communiqué ». Cette opération couvre 225 matériaux, 211 mécanismes, 193 capacités, 229 longueurs de canon, 229 longueurs hors tout et 229 poids. Chaque exception garde le statut `unconfirmed`, la valeur explicite « Non communiqué » et le libellé « Audit catalogue GunsMasterPro — source à fournir ou à vérifier ».

Cette couverture ne transforme pas une absence de source en caractéristique technique : les colonnes des produits restent inchangées jusqu’à identification d’une référence fabricant, d’un numéro de modèle ou d’une fiche fournisseur exactement correspondante. Les 18 informations déjà contrôlées sur les modèles GLOCK, SIG Sauer, Beretta, Walther et Ruger restent journalisées séparément, avec leur URL source et, lorsque nécessaire, une réserve de variante.

## Contrôle des galeries supplémentaires

Les galeries Wikimedia déjà conservées en attribution ont fait l’objet d’un second contrôle avant tout téléchargement massif. `CZ 75 SP-01.jpg` est bien disponible sous CC BY-SA 3.0 mais représente une **SP-01** avec chargeur étendu, et non la CZ 75 B de la fiche. `Walther-PPK-p1030160.jpg` est sous CC BY-SA 2.0 France mais identifie un **PPK**, et non un PPK/S confirmé. `Hi-Power Practical.JPG` est sous CC BY-SA 3.0 mais représente la variante **Practical en .40 S&W**, non une Hi-Power de variante non précisée. Ces fichiers ne sont donc pas ajoutés aux galeries produits malgré leurs licences ouvertes.

Les galeries déjà rattachées sont limitées aux images dont le modèle ou le contexte est documenté : deux pour le Glock 17 Gen5 (droits commerciaux en attente), deux pour le SIG Sauer P226 Legion (droits commerciaux en attente), cinq pour la Beretta 92FS (droits commerciaux en attente) et un visuel contextuel de galerie pour l’AK-47 sous domaine public. Les autres fiches prioritaires conservent leur média principal sous licence ouverte ou traçable, sans ajouts de galerie de variante incertaine.

Deux ajouts contextuels ont ensuite été validés visuellement : `Ruger-1022.jpg`, photographie panoramique d’une Ruger 10/22 Carbine à crosse bois sous CC BY-SA 3.0 par Dictouray, et `FN FAL DN-SC-92-04655 cropped.jpg`, photographie d’un FN FAL belge 7,62 mm dans le domaine public américain par le CAPT. PETERSON. Ils correspondent aux familles nommées et seront ajoutés en galerie, avec leur source, leur licence et leur contexte conservés ; ils n’infèrent aucune finition ou variante commerciale exacte.
