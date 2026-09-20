# Plan : Identité visuelle Liste

> PRD source : `docs/PRD.md`

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Fenêtres** : une fenêtre affaire + une fenêtre Plan (unique). Pas de troisième fenêtre, pas de sélecteur de thème sur le Plan.
- **Préférence thème** : `theme` = `light` | `dark` | `auto`, dans la config app déjà persistée. Premier lancement : `auto`. Ensuite, le dernier choix est mémorisé.
- **Application** : classe sombre sur le document ; tokens de charte (jaune d’action, fonds, tuiles, coins nets, même police que Pointage).
- **Source de vérité** : la fenêtre principale (accueil / affaire / catalogue) tient le thème ; la fenêtre Plan s’aligne, sans réglage local.
- **PDF** : le dessin n’est pas recoloré ; seul le tour de la fenêtre Plan prend le thème.
- **Parcours** : pas de nouvelle fenêtre, pas de nouvel écran, pas de nouveau modèle métier. Pastilles et types d’appareils inchangés.
- **Confirmations** : les dialogues de Liste suivent le thème. Les boîtes fichier du système restent celles du système.

---

## Phase 1 : Accueil sous la charte

**User stories** : US-1 (accueil), US-2, US-4, US-5, US-8, US-9, US-10, US-11 (accueil + chargement)

### Ce qu'on livre

Le technicien ouvre Liste : chargement et accueil sont déjà dans la peau de Pointage. Un sélecteur Clair / Sombre / Auto (soleil, lune, écran) change tout l’accueil d’un coup. Auto suit le système, y compris s’il change pendant la session. Au relancement, le dernier choix est encore là. Actions principales jaunes (texte foncé), destructives rouges, secondaires bordées, coins nets, tuiles et fonds comme Pointage. Affaire, catalogue et Plan restent à l’ancienne.

### Critères d'acceptation

- [x] Sélecteur Clair / Sombre / Auto visible sur l’accueil ; un clic change tout l’accueil (aucune zone restée dans l’autre thème)
- [x] Premier lancement : Auto ; relancer l’app retrouve le dernier choix
- [x] Auto suit le système ; un changement système pendant la session met l’accueil à jour
- [x] Écran de chargement et état vide de l’accueil suivent le thème
- [x] Action principale = bouton jaune, texte foncé ; destructive = rouge ; secondaire = bordé
- [x] Coins nets ; fond clair gris très pâle / tuiles blanches ; fond sombre presque noir / tuiles un cran plus claires

## Bloquée par

Aucune — démarrable immédiatement

---

## Phase 2 : Affaire sous la charte

**User stories** : US-1 (affaire), US-3 (partiel), US-8, US-9, US-10, US-11 (affaire)

### Ce qu'on livre

Ouvrir une affaire : barre, listes, tableau, onglet actif, états vides et dialogues d’affaire prennent la même peau. Le sélecteur est dans la barre d’affaire. La sélection d’une liste n’est plus l’ancien bleu massif. Les couleurs de pastilles et de types restent celles du catalogue.

### Critères d'acceptation

- [x] Affaire entière (barre, sidebar, tableau, états vides) suit Clair / Sombre / Auto — aucune zone restée dans l’autre thème
- [x] Sélecteur dans la barre d’affaire ; même préférence que l’accueil
- [x] Actions principales jaunes, destructives rouges, secondaires bordées ; coins nets
- [x] Liste ou onglet actif : fond légèrement teinté, lisible dans les deux thèmes
- [x] Dialogues et confirmations d’affaire suivent le thème
- [x] Pastilles et types : inchangés

## Bloquée par

- Phase 1

---

## Phase 3 : Catalogue sous la charte

**User stories** : US-13, US-8, US-9, US-10, US-11 (catalogue)

### Ce qu'on livre

L’admin catalogue a la même peau que l’accueil et l’affaire, avec le même sélecteur. Listes, formulaires, dialogues et états vides suivent le thème. Peut avancer en parallèle de la phase 2.

### Critères d'acceptation

- [x] Catalogue entier suit Clair / Sombre / Auto — aucune zone restée dans l’autre thème
- [x] Sélecteur présent ; même préférence que le reste de l’app
- [x] Actions principales jaunes, destructives rouges, secondaires bordées ; coins nets
- [x] Dialogues, confirmations et états vides du catalogue suivent le thème

## Bloquée par

- Phase 1

---

## Phase 4 : Fenêtre Plan alignée

**User stories** : US-3, US-6, US-7, US-12

### Ce qu'on livre

Le tour de la fenêtre Plan (bandeau, boutons, état vide, lecture seule) suit le thème de l’affaire, sans sélecteur à part. Changer Clair / Sombre / Auto dans l’affaire (ou l’accueil, ou le catalogue) met le Plan à jour tout de suite. Le dessin du PDF reste le papier du fichier. Les pastilles gardent les couleurs du catalogue.

### Critères d'acceptation

- [x] Pas de sélecteur de thème sur le Plan
- [x] Un clic Clair / Sombre / Auto dans la fenêtre principale change le tour du Plan d’un coup
- [x] Aucune zone du chrome Plan restée dans l’autre thème
- [x] Le dessin PDF n’est pas recoloré
- [x] Pastilles et types : inchangés

## Bloquée par

- Phase 1
