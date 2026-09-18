# Plan : Relevé plan PDF

> PRD source : `docs/PRD.md`

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Fenêtres** : une fenêtre affaire + une fenêtre Plan (unique). Pas de split, pas de troisième fenêtre.
- **Persistance affaire** : le fichier affaire contient `plans[]` (`id`, nom stocké, nom d'origine, `pageCount`), `sublistPlans[]` (`sublistId` → `planId`), `markers[]` (`id`, `planId`, page 1-based, `x`/`y` normalisés 0–1, `bomLineId`). Anciens fichiers : tableaux vides.
- **Stockage PDF** : copie dans un dossier voisin du fichier affaire. Jamais embarqué dans le fichier affaire.
- **Schema catalogue** : types d'appareils (`id`, `name`, `color`) ; `typeId` nullable sur les références. Couleur neutre réservée (gris ardoise), non attribuable à un type.
- **Modèles clés** : `Plan`, `SublistPlan`, `Marker`, `ComponentType`.
- **Source de vérité** : listes et pastilles vivent dans la fenêtre affaire ; la fenêtre Plan affiche et envoie les clics.
- **Identifiants** : Liste achat conserve l'id virtuel `ListeAchat`. Globale / État préparatoire / Chiffrage n'attachent aucun plan.

---

## Phase 1 : Types d'appareils dans le catalogue

**User stories** : US-32, US-33, US-34

### Ce qu'on livre

L'admin catalogue permet de créer, renommer, colorer et supprimer des types d'appareils, hors du relevé. Un jeu de départ est présent. Une couleur déjà prise (y compris le neutre) est refusée. Supprimer un type range les références concernées en « sans type » ; elles restent utilisables.

### Critères d'acceptation

- [x] Jeu de départ visible : Disjoncteur, Vigi, Auxiliaire OF, Auxiliaire SD, Contacteur, Sectionneur, Parafoudre, Voyant, Bornier, Autre
- [x] Créer / renommer un type avec une couleur libre : il apparaît dans la liste
- [x] Enregistrer un type avec une couleur déjà prise : refusé
- [x] La teinte neutre n'est pas attribuable à un type
- [x] Supprimer un type : les références classées passent sans type

## Bloquée par

Aucune — démarrable immédiatement

---

## Phase 2 : Fenêtre Plan + attacher un PDF

**User stories** : US-1, US-2, US-3, US-4, US-5, US-31

### Ce qu'on livre

Un bouton Plan dans la barre d'affaire ouvre (ou ramène au premier plan) une unique fenêtre Plan. La liste ouverte a zéro ou un plan : état vide Ajouter / Réutiliser, ou affichage du PDF attaché. Ajouter copie le fichier à côté de l'affaire ; réutiliser pointe vers un plan déjà présent. Fermer la croix cache la fenêtre sans détacher. Fermer ou changer d'affaire ferme le plan.

### Critères d'acceptation

- [x] Bouton Plan ouvre une fenêtre Plan ; un second clic la ramène au premier plan (pas de deuxième fenêtre)
- [x] Liste sans plan : état vide « Ajouter / Réutiliser »
- [x] Ajouter un PDF : le fichier est copié à côté de l'affaire et s'affiche
- [x] Réutiliser un plan déjà dans l'affaire : la liste pointe vers ce plan, sans seconde copie
- [x] Changer de liste éditable affiche le plan de cette liste (ou l'état vide)
- [x] Fermer la croix cache la fenêtre ; le plan reste attaché ; rouvrir Plan réaffiche le même dessin
- [x] Fermer l'affaire (ou en ouvrir une autre) ferme la fenêtre Plan
- [x] Un ancien fichier affaire s'ouvre sans plan, sans erreur

## Bloquée par

Aucune — démarrable immédiatement

---

## Phase 3 : Page, zoom, pan

**User stories** : US-21

### Ce qu'on livre

Le plan se parcourt une page à la fois. La molette change de page ; Ctrl + molette zoom autour du curseur ; Ctrl enfoncé active la main pour déplacer. Ouverture et Reset montrent la page entière ; un bouton 100 % montre la taille réelle. Le zoom survit au redimensionnement de la fenêtre. Reset ne change pas de page. Première et dernière pages ne bouclent pas.

### Critères d'acceptation

- [x] Une page à la fois ; champ numéro + molette = page précédente / suivante
- [x] Molette en page 1 ou dernière page : pas de boucle
- [x] Ctrl + molette : zoom autour du curseur
- [x] Ctrl enfoncé : glisser déplace la page ; relâché : plus de déplacement
- [x] Ouverture d'un PDF et Reset : page entière visible
- [x] Bouton 100 % : taille réelle du PDF
- [x] Reset ne change pas le numéro de page
- [x] Redimensionner la fenêtre conserve le zoom courant

## Bloquée par

- Phase 2

---

## Phase 4 : Compter — poser, retirer, quantité verrouillée

**User stories** : US-7, US-8, US-9, US-10, US-11, US-14, US-15, US-16, US-17, US-18, US-19, US-22

### Ce qu'on livre

Le relevé fonctionne de bout en bout sur une liste éditable. Une nouvelle ligne naît à 0 et devient le pinceau. Un bandeau rappelle liste, référence, désignation, type, couleur et quantité. Clic gauche sur le papier pose une pastille ; la quantité égale le nombre de pastilles et se verrouille. Clic droit retire une pastille de la liste ouverte. Sans sélection, rien n'est posé. Premier marqueur sur une quantité déjà saisie : confirmation, puis quantité 1. Pastilles colorées par type (neutre si sans type), taille fixe à l'écran, référence en cours mise en avant, fiche courte au survol. Ctrl+Z / Ctrl+Y n'annulent que pose et retrait. Réouvrir l'affaire retrouve les pastilles.

### Critères d'acceptation

- [x] Nouvelle ligne : quantité 0, ligne sélectionnée
- [x] Bandeau pinceau toujours visible ; sans sélection, il le dit et un clic ne pose rien
- [x] 3 poses puis 1 retrait : quantité = 2, cadenas, plus/moins et saisie sans effet
- [x] Ligne quantité 5 sans pastille : premier clic → annuler ne pose rien ; confirmer → 1 pastille, quantité 1
- [x] Zéro pastille restante : saisie libre, quantité inchangée (pas de remise à zéro)
- [x] Pastille ~10 px à l'écran, ne grossit pas avec le zoom ; couleur du type ou neutre
- [x] Pastilles de la référence en cours mises en avant
- [x] Survol : référence, désignation, type, quantité
- [x] Clic droit hors pastille de la liste ouverte : rien
- [x] Ctrl+Z / Ctrl+Y : dernière pose ou dernier retrait uniquement ; la quantité suit
- [x] Réouvrir l'affaire : pastilles encore en place, quantité toujours égale au compte

## Bloquée par

- Phase 2
- Phase 1 pour les couleurs de type (sinon pastille neutre)

---

## Phase 5 : Plusieurs listes sur le même plan

**User stories** : US-6, US-12, US-13

### Ce qu'on livre

Deux listes peuvent partager le même PDF. Les pastilles de la liste ouverte sont nettes ; celles des autres listes sont atténuées et non retirables au clic droit. Un clic gauche sur une pastille sélectionne sa ligne et bascule de sous-liste si besoin (chevauchement : référence en cours si elle est sous le curseur, sinon dernière posée). Sur Globale, État préparatoire ou Chiffrage, le dernier plan reste ouvert en lecture seule : navigation et survol possibles, poses et retraits inertes.

### Critères d'acceptation

- [x] Deux listes, même PDF : pastilles de l'autre liste visibles et atténuées
- [x] Clic droit sur une pastille d'une autre liste : aucune n'est retirée
- [x] Clic gauche sur une pastille de la liste ouverte : la ligne devient le pinceau
- [x] Clic gauche sur une pastille d'une autre liste : l'affaire bascule sur cette liste, la ligne devient le pinceau
- [x] Chevauchement : si la référence en cours est sous le curseur, c'est elle ; sinon la dernière posée ; le survol montre la cible
- [x] Survol d'une pastille d'une autre liste : la fiche courte affiche aussi le nom de la liste
- [x] Globale / État préparatoire / Chiffrage : dernier PDF visible, bandeau lecture seule, clics gauche et droit ne posent ni ne retirent

## Bloquée par

- Phase 4

---

## Phase 6 : Détacher, remplacer, supprimer, recoller

**User stories** : US-23, US-24, US-25, US-26, US-27, US-28

### Ce qu'on livre

Depuis la fenêtre Plan : détacher (cette liste seulement), remplacer (détacher puis attacher un autre), supprimer de l'affaire (toutes les listes liées). Confirmation dans les trois cas. Les pastilles des listes libérées disparaissent ; les quantités sont conservées et redeviennent saisissables. Le fichier copié n'est retiré que s'il ne reste plus aucune liste liée. Fichier manquant : marquage bloqué, bouton Recoller. Même nombre de pages : pastilles conservées. Nombre différent : toutes les pastilles de ce plan jetées, quantités gardées, listes déverrouillées.

### Critères d'acceptation

- [x] Détacher : pastilles de cette liste enlevées, quantités gardées, saisie déverrouillée ; les autres listes qui partagent le PDF ne bougent pas
- [x] Remplacer : cette liste seulement est détachée puis attachée au nouveau plan ; les autres gardent l'ancien
- [x] Supprimer de l'affaire : toutes les listes liées libérées (pastilles enlevées, quantités gardées, saisie libre) ; fichier copié absent
- [x] Fichier orphelin (plus aucune liste liée) : retiré du dossier voisin
- [x] Détacher, remplacer et supprimer demandent confirmation
- [x] PDF manquant : bandeau, marquage bloqué, bouton Recoller ; les lignes restent verrouillées tant qu'on n'a pas recollé ni détaché
- [x] Recoller avec le même nombre de pages : pastilles encore là
- [x] Recoller avec un nombre de pages différent : pastilles de ce plan parties, quantités gardées, listes déverrouillées

## Bloquée par

- Phase 2
- Phase 5 pour le cas « PDF partagé »

---

## Phase 7 : Import, suppression de ligne, fusion de références

**User stories** : US-20, US-29, US-30

### Ce qu'on livre

L'import Excel et l'import Chiffrage n'ajoutent pas de quantité aux lignes déjà sous contrôle du plan ; un résumé indique combien de références ont été ignorées. Les nouvelles références s'importent normalement. Supprimer une ligne enlève ses pastilles. Changer la référence conserve les pastilles (nouvelle couleur de type). Fusion vers une référence déjà présente : les pastilles passent sur la ligne survivante ; s'il en reste, quantité = total ; si la survivante n'était pas encore marquée et avait une quantité, même dialogue que le premier marqueur.

### Critères d'acceptation

- [x] Import Excel / Chiffrage sur une ligne verrouillée : quantité inchangée, pastilles intactes, résumé du nombre ignoré
- [x] Import d'une nouvelle référence : ligne créée comme aujourd'hui
- [x] Supprimer une ligne : ses pastilles disparaissent du plan
- [x] Changer la référence d'une ligne marquée (cible libre) : pastilles conservées, couleur du nouveau type
- [x] Fusion vers une réf déjà présente : pastilles sur la survivante, quantité = nombre de pastilles
- [x] Fusion vers une survivante non marquée avec quantité > 0 : dialogue ; confirmer → contrôle plan et quantité = total pastilles ; annuler → pas de fusion

## Bloquée par

- Phase 4

