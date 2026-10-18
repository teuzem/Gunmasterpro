export type HeroLocale = "fr" | "en" | "de";

type HeroCopy = { eyebrow: string; title: string; description: string; label: string };

type HeroSlide = {
  image: string;
  product: string;
  copy: Record<HeroLocale, HeroCopy>;
};

export const heroSlides: HeroSlide[] = [
  { image: "/manus-storage/hero/01_Semi_Auto_Handguns_Studio_Tactical_d3550a04.png", product: "glock-17-gen5", copy: {
    fr: { eyebrow: "Sélection européenne · repères clairs", title: "Choisir avec rigueur. Comparer avec clarté.", description: "Une entrée de catalogue plus lisible pour examiner les formats, les finitions et les informations essentielles. Les demandes restent réservées aux personnes majeures et soumises aux vérifications applicables.", label: "Découvrir la sélection" },
    en: { eyebrow: "European selection · clear guidance", title: "Choose carefully. Compare clearly.", description: "A clearer catalogue entry point for reviewing formats, finishes and essential information. Requests remain limited to adults and subject to the applicable checks.", label: "Discover the selection" },
    de: { eyebrow: "Europäische Auswahl · klare Orientierung", title: "Sorgfältig wählen. Klar vergleichen.", description: "Ein übersichtlicher Katalogeinstieg für Formate, Ausführungen und wesentliche Angaben. Anfragen sind Volljährigen vorbehalten und unterliegen den anwendbaren Prüfungen.", label: "Auswahl entdecken" },
  } },
  { image: "/manus-storage/hero/02_Revolvers_Collector_Studio_7de5f843.png", product: "glock-17-gen5", copy: {
    fr: { eyebrow: "Collection · expertise de sélection", title: "Le détail fait la différence.", description: "Mettez en regard les caractéristiques, la disponibilité et les éléments de présentation qui comptent vraiment. Chaque fiche rassemble les repères utiles avant une demande d’accompagnement.", label: "Voir les configurations" },
    en: { eyebrow: "Collection · selection expertise", title: "Details make the difference.", description: "Compare the characteristics, availability and presentation details that truly matter. Each page brings together useful guidance before you request support.", label: "View configurations" },
    de: { eyebrow: "Kollektion · Auswahlkompetenz", title: "Details machen den Unterschied.", description: "Vergleichen Sie die wirklich relevanten Merkmale, Verfügbarkeiten und Präsentationsangaben. Jede Seite bündelt hilfreiche Orientierung vor einer Betreuungsanfrage.", label: "Konfigurationen ansehen" },
  } },
  { image: "/manus-storage/hero/03_Single_Shot_Handguns_Craftsmanship_08665fb3.png", product: "glock-17-gen5", copy: {
    fr: { eyebrow: "Savoir-faire · sélection", title: "Une sélection pensée dans le détail.", description: "Des références structurées, des médias documentés et une lecture sans détour des informations disponibles. Le parcours aide à préparer une demande responsable, sans promettre une disponibilité immédiate.", label: "Explorer les équipements" },
    en: { eyebrow: "Craftsmanship · selection", title: "A selection designed in detail.", description: "Structured references, documented media and direct access to available information. The journey helps prepare a responsible enquiry without promising immediate availability.", label: "Explore equipment" },
    de: { eyebrow: "Handwerk · Auswahl", title: "Eine Auswahl bis ins Detail durchdacht.", description: "Strukturierte Referenzen, dokumentierte Medien und ein direkter Zugang zu verfügbaren Angaben. Der Ablauf unterstützt eine verantwortungsvolle Anfrage ohne Sofortverfügbarkeit zu versprechen.", label: "Ausstattung erkunden" },
  } },
  { image: "/manus-storage/hero/04_Other_Handguns_Editorial_Display_4a384869.png", product: "glock-17-gen5", copy: {
    fr: { eyebrow: "Configurations · accompagnement", title: "Le bon repère, au bon moment.", description: "Du premier aperçu à la comparaison des spécifications, chaque étape privilégie une information nette et hiérarchisée. Vous gardez une vision simple des familles, des options et des conditions de suivi.", label: "Voir la fiche détaillée" },
    en: { eyebrow: "Configurations · guidance", title: "The right guidance, at the right time.", description: "From first glance to specification comparison, every step prioritises clear, ordered information. Keep a simple view of families, options and follow-up conditions.", label: "View detailed page" },
    de: { eyebrow: "Konfigurationen · Begleitung", title: "Die richtige Orientierung zur richtigen Zeit.", description: "Vom ersten Überblick bis zum Vergleich der Angaben steht klare, geordnete Information im Mittelpunkt. Behalten Sie Familien, Optionen und Abläufe einfach im Blick.", label: "Detailseite ansehen" },
  } },
  { image: "/manus-storage/hero/05_Semi_Auto_Rifles_Controlled_Range_c5e14033.png", product: "fn-fal", copy: {
    fr: { eyebrow: "Pratique encadrée · précision", title: "Maîtrise, précision, exigence.", description: "Parcourez les configurations et les équipements associés dans un environnement de consultation plus clair. Les différences utiles sont présentées pour soutenir une sélection réfléchie et conforme au cadre applicable.", label: "Comparer les modèles" },
    en: { eyebrow: "Supervised practice · precision", title: "Control, precision, standards.", description: "Review configurations and related equipment in a clearer browsing environment. Useful differences are presented to support a considered selection within the applicable framework.", label: "Compare models" },
    de: { eyebrow: "Betreute Praxis · Präzision", title: "Kontrolle, Präzision, Anspruch.", description: "Prüfen Sie Konfigurationen und passende Ausstattung in einer übersichtlicheren Umgebung. Relevante Unterschiede unterstützen eine überlegte Auswahl im geltenden Rahmen.", label: "Modelle vergleichen" },
  } },
  { image: "/manus-storage/hero/06_Bolt_Action_Rifles_Precision_Bench_fd219d0a.png", product: "fn-fal", copy: {
    fr: { eyebrow: "Équipement · contrôle", title: "La précision se prépare.", description: "Les fiches mettent en avant les spécifications, les médias de provenance contrôlée et les indicateurs de disponibilité. Vous disposez ainsi d’un point de départ fiable pour étudier les options proposées.", label: "Explorer les fiches" },
    en: { eyebrow: "Equipment · control", title: "Precision is prepared.", description: "Pages highlight specifications, rights-checked media and availability indicators. This gives you a reliable starting point for reviewing the options presented.", label: "Explore pages" },
    de: { eyebrow: "Ausstattung · Kontrolle", title: "Präzision wird vorbereitet.", description: "Die Seiten heben Spezifikationen, geprüfte Medien und Verfügbarkeitsindikatoren hervor. So erhalten Sie einen verlässlichen Ausgangspunkt für die angebotenen Optionen.", label: "Seiten erkunden" },
  } },
  { image: "/manus-storage/hero/07_Lever_Action_Rifles_Heritage_Lodge_d4b7cb64.png", product: "fn-fal", copy: {
    fr: { eyebrow: "Héritage · sélection", title: "Comparer mieux. Choisir juste.", description: "Formats, matériaux et informations de présentation sont réunis pour faciliter une comparaison méthodique. Notre approche privilégie une décision préparée plutôt qu’une navigation précipitée.", label: "Découvrir les repères" },
    en: { eyebrow: "Heritage · selection", title: "Compare better. Choose wisely.", description: "Formats, materials and presentation information are gathered to support a methodical comparison. Our approach favours a prepared decision over rushed browsing.", label: "Discover the guidance" },
    de: { eyebrow: "Tradition · Auswahl", title: "Besser vergleichen. Überlegt wählen.", description: "Formate, Materialien und Präsentationsangaben sind für einen methodischen Vergleich gebündelt. Unser Ansatz bevorzugt eine vorbereitete Entscheidung statt vorschneller Navigation.", label: "Orientierung entdecken" },
  } },
  { image: "/manus-storage/hero/08_Pump_Action_Rifles_Outdoor_Shelter_001890b3.png", product: "fn-fal", copy: {
    fr: { eyebrow: "Catalogue · lisibilité", title: "Données nettes. Choix serein.", description: "Une lecture organisée des catégories, des références et des équipements permet d’identifier les éléments à approfondir. Toute suite donnée à une demande suppose les contrôles nécessaires.", label: "Voir les disponibilités" },
    en: { eyebrow: "Catalogue · clarity", title: "Clear data. Calm choices.", description: "An ordered reading of categories, references and equipment helps identify what needs further review. Any next step remains subject to the necessary checks.", label: "View availability" },
    de: { eyebrow: "Katalog · Übersicht", title: "Klare Daten. Ruhige Entscheidungen.", description: "Eine geordnete Ansicht von Kategorien, Referenzen und Ausstattung hilft, vertiefungswürdige Punkte zu erkennen. Jeder nächste Schritt setzt die nötigen Prüfungen voraus.", label: "Verfügbarkeit ansehen" },
  } },
  { image: "/manus-storage/hero/09_Single_Shot_Rifles_Alpine_Studio_60b78323.png", product: "fn-fal", copy: {
    fr: { eyebrow: "Exigence · transparence", title: "L’essentiel, sans détour.", description: "Accédez à une présentation sobre des caractéristiques disponibles et des éléments de comparaison. Les informations commerciales définitives sont toujours confirmées avant toute mise à disposition.", label: "Explorer la sélection" },
    en: { eyebrow: "Standards · transparency", title: "The essentials, without detours.", description: "Access a concise presentation of available characteristics and comparison points. Final commercial information is always confirmed before any supply.", label: "Explore the selection" },
    de: { eyebrow: "Anspruch · Transparenz", title: "Das Wesentliche, ohne Umwege.", description: "Erhalten Sie eine sachliche Darstellung der verfügbaren Merkmale und Vergleichspunkte. Verbindliche Handelsangaben werden stets vor einer Bereitstellung bestätigt.", label: "Auswahl erkunden" },
  } },
  { image: "/manus-storage/hero/10_Other_Rifles_Innovation_Lab_3ffee40e.png", product: "fn-fal", copy: {
    fr: { eyebrow: "Innovation · cohérence", title: "Chaque configuration compte.", description: "Le catalogue relie les données de base, les visuels publiés et les critères de disponibilité dans une même lecture. Cette structure rend la préparation d’une demande plus claire et plus suivie.", label: "Découvrir les configurations" },
    en: { eyebrow: "Innovation · consistency", title: "Every configuration matters.", description: "The catalogue brings together baseline data, published visuals and availability criteria in one view. This structure makes preparing an enquiry clearer and easier to follow.", label: "Discover configurations" },
    de: { eyebrow: "Innovation · Konsistenz", title: "Jede Konfiguration zählt.", description: "Der Katalog verbindet Grunddaten, veröffentlichte Bilder und Verfügbarkeitskriterien in einer Ansicht. Diese Struktur macht die Vorbereitung einer Anfrage klarer und nachvollziehbarer.", label: "Konfigurationen entdecken" },
  } },
  { image: "/manus-storage/hero/11_Semi_Auto_Shotguns_Sporting_Club_a907ec53.png", product: "toz-66", copy: {
    fr: { eyebrow: "Sélection · conditions", title: "Une vue claire, avant la demande.", description: "Comparez les formats et les informations mises à disposition dans un parcours qui évite les ambiguïtés. L’accompagnement reste attentif aux conditions applicables et aux vérifications préalables.", label: "Parcourir les catégories" },
    en: { eyebrow: "Selection · conditions", title: "A clear view before your enquiry.", description: "Compare formats and available information in a journey designed to avoid ambiguity. Guidance remains attentive to the applicable conditions and prior checks.", label: "Browse categories" },
    de: { eyebrow: "Auswahl · Bedingungen", title: "Ein klarer Blick vor der Anfrage.", description: "Vergleichen Sie Formate und verfügbare Angaben in einem Ablauf, der Unklarheiten vermeidet. Die Begleitung berücksichtigt anwendbare Bedingungen und Vorprüfungen.", label: "Kategorien ansehen" },
  } },
  { image: "/manus-storage/hero/12_Pump_Action_Shotguns_Training_Bay_901c0e70.png", product: "toz-66", copy: {
    fr: { eyebrow: "Pratique encadrée · lecture", title: "Voir plus clair. Décider mieux.", description: "Les principales informations sont regroupées pour mieux orienter votre recherche, des catégories aux fiches détaillées. Les médias illustrent les univers produits, sans remplacer les descriptions administrées.", label: "Voir les équipements" },
    en: { eyebrow: "Supervised practice · guidance", title: "See more clearly. Decide better.", description: "Key information is grouped to guide your research from categories to detailed pages. Media illustrates product environments without replacing managed descriptions.", label: "View equipment" },
    de: { eyebrow: "Betreute Praxis · Überblick", title: "Klarer sehen. Besser entscheiden.", description: "Wichtige Angaben sind gebündelt und leiten Ihre Recherche von Kategorien bis zu Detailseiten. Medien veranschaulichen Produktwelten, ersetzen aber keine gepflegten Beschreibungen.", label: "Ausstattung ansehen" },
  } },
  { image: "/manus-storage/hero/13_Side_By_Side_Shotguns_Heritage_57ab8c75.png", product: "toz-66", copy: {
    fr: { eyebrow: "Tradition · comparaison", title: "Le sérieux dans chaque détail.", description: "Une présentation attentive permet de repérer rapidement les différences de format, de finition et d’usage annoncé. La disponibilité et les conditions restent vérifiées au moment de l’examen de la demande.", label: "Lire les repères" },
    en: { eyebrow: "Tradition · comparison", title: "Care in every detail.", description: "A considered presentation helps identify format, finish and stated-use differences quickly. Availability and conditions remain checked when an enquiry is reviewed.", label: "Read the guidance" },
    de: { eyebrow: "Tradition · Vergleich", title: "Sorgfalt in jedem Detail.", description: "Eine aufmerksame Darstellung hilft, Unterschiede bei Format, Ausführung und angegebener Nutzung schnell zu erkennen. Verfügbarkeit und Bedingungen werden bei der Anfrageprüfung kontrolliert.", label: "Hinweise lesen" },
  } },
  { image: "/manus-storage/hero/14_Over_Under_Shotguns_Clay_Club_72ea788a.png", product: "toz-66", copy: {
    fr: { eyebrow: "Équilibre · précision", title: "Des choix mieux éclairés.", description: "Le site rassemble les catégories, les éléments de comparaison et le suivi de demande dans un cadre simple. Chaque échange est traité avec une attention particulière aux informations nécessaires.", label: "Comparer les options" },
    en: { eyebrow: "Balance · precision", title: "Better-informed choices.", description: "The website brings categories, comparison points and enquiry tracking together in a simple setting. Every exchange is handled with close attention to the information needed.", label: "Compare options" },
    de: { eyebrow: "Ausgewogenheit · Präzision", title: "Besser informierte Entscheidungen.", description: "Die Website bündelt Kategorien, Vergleichspunkte und Anfragenachverfolgung in einem einfachen Rahmen. Jeder Austausch wird mit besonderer Aufmerksamkeit für erforderliche Angaben behandelt.", label: "Optionen vergleichen" },
  } },
  { image: "/manus-storage/hero/15_Single_Shot_Shotguns_Artisan_Bench_f89e2c9b.png", product: "toz-66", copy: {
    fr: { eyebrow: "Atelier · lisibilité", title: "Comprendre avant de choisir.", description: "Consultez les données présentées, la provenance des médias et les repères de disponibilité au même endroit. Cette approche limite les zones d’incertitude avant toute prise de contact.", label: "Explorer le catalogue" },
    en: { eyebrow: "Workshop · clarity", title: "Understand before you choose.", description: "View presented data, media provenance and availability guidance in one place. This approach limits uncertainty before you make contact.", label: "Explore the catalogue" },
    de: { eyebrow: "Werkstatt · Übersicht", title: "Verstehen, bevor Sie wählen.", description: "Sehen Sie Daten, Medienherkunft und Verfügbarkeitshinweise an einem Ort. Dieser Ansatz verringert Unsicherheiten vor der Kontaktaufnahme.", label: "Katalog erkunden" },
  } },
  { image: "/manus-storage/hero/16_Accessories_Professional_Kit_025fba0f.png", product: "pakarms-beretta-customize-grip-3203", copy: {
    fr: { eyebrow: "Équipements · organisation", title: "Tout commence par l’essentiel.", description: "Les accessoires, les protections et les éléments d’organisation s’intègrent à une sélection structurée. Les fiches détaillent les repères disponibles pour construire un besoin cohérent et responsable.", label: "Voir les accessoires" },
    en: { eyebrow: "Equipment · organisation", title: "Everything starts with the essentials.", description: "Accessories, protection and organisation elements are part of a structured selection. Pages detail available guidance for building a coherent, responsible need.", label: "View accessories" },
    de: { eyebrow: "Ausstattung · Organisation", title: "Alles beginnt mit dem Wesentlichen.", description: "Zubehör, Schutz und Organisationselemente gehören zu einer strukturierten Auswahl. Die Seiten erläutern verfügbare Hinweise für einen stimmigen, verantwortungsvollen Bedarf.", label: "Zubehör ansehen" },
  } },
  { image: "/manus-storage/hero/17_Magazines_Secure_Storage_ea02d501.png", product: "pakarms-beretta-customize-grip-3203", copy: {
    fr: { eyebrow: "Stockage · contrôle", title: "Préparer un parcours fiable.", description: "Les informations utiles sont hiérarchisées pour faciliter l’examen des catégories et des équipements associés. Un suivi de demande assure ensuite une continuité claire de l’échange.", label: "Suivre une demande" },
    en: { eyebrow: "Storage · control", title: "Prepare a reliable journey.", description: "Useful information is ordered to simplify review of categories and associated equipment. Request tracking then ensures a clear continuity of the exchange.", label: "Track a request" },
    de: { eyebrow: "Aufbewahrung · Kontrolle", title: "Einen verlässlichen Ablauf vorbereiten.", description: "Nützliche Angaben sind geordnet und erleichtern die Prüfung von Kategorien und zugehöriger Ausstattung. Die Nachverfolgung sorgt anschließend für einen klaren Austausch.", label: "Anfrage verfolgen" },
  } },
  { image: "/manus-storage/hero/18_Optics_Field_Observation_e5dac6f4.png", product: "pakarms-beretta-customize-grip-3203", copy: {
    fr: { eyebrow: "Observation · précision", title: "Mieux lire chaque option.", description: "Les visuels d’ambiance et les descriptions disponibles aident à situer les univers de produits, tandis que les caractéristiques administrées restent la référence. Comparez sans quitter votre parcours.", label: "Découvrir les optiques" },
    en: { eyebrow: "Observation · precision", title: "Read every option more clearly.", description: "Atmospheric visuals and available descriptions help situate product worlds, while managed characteristics remain the reference. Compare without leaving your journey.", label: "Discover optics" },
    de: { eyebrow: "Beobachtung · Präzision", title: "Jede Option klarer lesen.", description: "Stimmungsbilder und verfügbare Beschreibungen helfen bei der Einordnung von Produktwelten, während gepflegte Merkmale maßgeblich bleiben. Vergleichen Sie ohne Ihren Ablauf zu verlassen.", label: "Optiken entdecken" },
  } },
  { image: "/manus-storage/hero/19_Suppressors_Technical_Display_79ad2d6b.png", product: "pakarms-beretta-customize-grip-3203", copy: {
    fr: { eyebrow: "Technique · conformité", title: "La conformité reste un repère.", description: "Les catégories sensibles sont présentées avec un rappel constant des vérifications à effectuer. Toute demande reste conditionnée au contrôle de l’âge, du territoire et des règles applicables.", label: "Consulter la conformité" },
    en: { eyebrow: "Technical · compliance", title: "Compliance remains a key reference.", description: "Sensitive categories are presented with a constant reminder of required checks. Every request remains conditional on age, territory and applicable-rule verification.", label: "Review compliance" },
    de: { eyebrow: "Technik · Konformität", title: "Konformität bleibt ein wichtiger Maßstab.", description: "Sensible Kategorien werden mit einem ständigen Hinweis auf erforderliche Prüfungen dargestellt. Jede Anfrage hängt von Alter, Gebiet und geltenden Regelungen ab.", label: "Konformität ansehen" },
  } },
  { image: "/manus-storage/hero/20_Collectible_Firearms_Museum_de97d499.png", product: "glock-17-gen5", copy: {
    fr: { eyebrow: "Collection · responsabilité", title: "Un accompagnement qui inspire confiance.", description: "De la consultation initiale au suivi de demande, la démarche privilégie la clarté, la traçabilité et l’examen préalable. Chaque parcours est conçu pour rester mesuré et documenté.", label: "Comprendre le parcours" },
    en: { eyebrow: "Collection · responsibility", title: "Guidance that inspires confidence.", description: "From initial browsing to request tracking, the approach prioritises clarity, traceability and prior review. Every journey is designed to remain measured and documented.", label: "Understand the journey" },
    de: { eyebrow: "Kollektion · Verantwortung", title: "Begleitung, die Vertrauen schafft.", description: "Von der ersten Ansicht bis zur Anfragenachverfolgung stehen Klarheit, Nachvollziehbarkeit und Vorprüfung im Mittelpunkt. Jeder Ablauf bleibt bewusst und dokumentiert.", label: "Ablauf verstehen" },
  } },
];

export const heroUi: Record<HeroLocale, {
  label: string; imageAlt: string; browse: string; notice: string; previous: string; next: string; pause: string; play: string; scenes: string; showScene: (index: number) => string;
}> = {
  fr: { label: "Présentation GunsMasterPro", imageAlt: "Scène de présentation en environnement de pratique encadré", browse: "Parcourir les catégories", notice: "Accès réservé aux personnes majeures et autorisées ; vérifications réglementaires avant toute mise à disposition.", previous: "Scène précédente", next: "Scène suivante", pause: "Mettre le carrousel en pause", play: "Lire le carrousel", scenes: "Scènes", showScene: (index) => `Afficher la scène ${index}` },
  en: { label: "GunsMasterPro introduction", imageAlt: "Presentation scene in a supervised practice environment", browse: "Browse categories", notice: "Access is reserved for authorised adults; regulatory checks apply before any supply.", previous: "Previous scene", next: "Next scene", pause: "Pause carousel", play: "Play carousel", scenes: "Scenes", showScene: (index) => `Show scene ${index}` },
  de: { label: "GunsMasterPro-Präsentation", imageAlt: "Präsentationsszene in einer betreuten Praxisumgebung", browse: "Kategorien ansehen", notice: "Zugang nur für berechtigte Volljährige; vor jeder Bereitstellung gelten regulatorische Prüfungen.", previous: "Vorherige Szene", next: "Nächste Szene", pause: "Karussell anhalten", play: "Karussell starten", scenes: "Szenen", showScene: (index) => `Szene ${index} anzeigen` },
};
