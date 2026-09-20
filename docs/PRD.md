# PRD : Identité visuelle Liste

## Problème

Le technicien bureau d’études enchaîne dans la journée la feuille de pointage et Liste. Pointage a déjà une identité (fond presque noir ou gris très pâle, tuiles, jaune d’action, coins nets, clair / sombre / auto). Liste est encore gris clair, bleu, coins arrondis, sans thème sombre. Ça fait deux logiciels, pas une famille, et ça fatigue surtout le soir ou en salle sombre.

## Solution

Liste prend la peau de Pointage : mêmes fonds, mêmes tuiles, même jaune pour l’action principale, mêmes coins nets, même choix clair / sombre / auto. Accueil, affaire, catalogue et fenêtre Plan passent tous sous cette peau. La mise en page A4 de la feuille (titres, cadre, signatures) n’est pas reprise. Le technicien ouvre Liste après Pointage sans changer d’univers.

## Utilisateur cible

Technicien bureau d’études qui prépare les listes de matériel d’une affaire industrielle et qui a déjà Pointage sous les yeux. L’admin catalogue voit la même peau, ce n’est pas un second public.

## User Stories

1. US-1 — En tant que technicien BE, je veux que Liste ait la même identité que Pointage (fonds, tuiles, jaune, coins nets), afin de ne pas changer d’univers en passant d’un outil à l’autre.
2. US-2 — En tant que technicien BE, je veux un sélecteur Clair / Sombre / Auto, afin de caler Liste sur ma lumière ou sur la machine.
3. US-3 — En tant que technicien BE, je veux qu’un clic Clair, Sombre ou Auto change d’un coup l’accueil, l’affaire, le catalogue et le tour de la fenêtre Plan, afin de n’avoir aucune zone restée dans l’autre thème.
4. US-4 — En tant que technicien BE, je veux retrouver mon dernier choix au relancement, afin de ne pas re-régler à chaque ouverture.
5. US-5 — En tant que technicien BE, je veux qu’Auto suive le système, y compris s’il change pendant que Liste est ouvert, afin de rester aligné avec le reste du poste.
6. US-6 — En tant que technicien BE, je veux que la fenêtre Plan suive le thème de l’affaire sans sélecteur à part, afin d’avoir un seul réglage.
7. US-7 — En tant que technicien BE, je veux que le dessin du plan reste tel quel (papier du fichier), afin de compter sur le schéma et non sur un fond recoloré.
8. US-8 — En tant que technicien BE, je veux que les actions principales (ouvrir, enregistrer, ajouter…) soient le bouton jaune de Pointage, texte foncé, afin de reconnaître tout de suite ce qui fait avancer.
9. US-9 — En tant que technicien BE, je veux que les actions destructives (supprimer, jeter…) restent rouges, afin de ne pas les confondre avec le jaune.
10. US-10 — En tant que technicien BE, je veux que les actions secondaires soient des boutons bordés, afin de les distinguer des actions principales.
11. US-11 — En tant que technicien BE, je veux que l’écran de chargement, les dialogues et les états vides prennent le même thème, afin de ne pas retomber sur l’ancien gris-bleu au milieu du parcours.
12. US-12 — En tant que technicien BE, je veux que les couleurs des pastilles et des types d’appareils restent celles du catalogue, afin de continuer à lire le relevé d’un coup d’œil.
13. US-13 — En tant qu’admin catalogue, je veux la même peau que l’affaire, afin de ne pas avoir un second look dans le même logiciel.

## Critères de succès

1. Un clic Clair / Sombre / Auto change toute l’app (accueil, affaire, catalogue, tour de la fenêtre Plan) d’un coup — aucune zone restée dans l’autre thème.
2. Au relancement, le dernier choix de thème est encore là ; Auto suit le système de la machine, y compris s’il change pendant la session.
3. L’action principale est le bouton jaune de Pointage, texte foncé.
4. En sombre : fond presque noir, tuiles un cran plus claires, comme Pointage. En clair : fond gris très pâle, tuiles blanches.
5. Les coins sont nets, comme Pointage.

## Hors périmètre

- Mise en page A4 de Pointage (titres, cadre, signatures)
- Fonctions de Pointage (bilan, export PDF, purge…)
- Nouveau parcours ou écran en plus : même app, autre peau
- Recolorisation du dessin PDF ; seul le tour de la fenêtre Plan prend le thème
- Couleurs de pastilles / types remplacées par le jaune de charte
- Thème « perso » (teintes au choix)

## Décisions d'implémentation

- Sélecteur Clair / Sombre / Auto (soleil, lune, écran) dans le chrome principal : accueil, barre d’affaire, catalogue. Pas de second sélecteur sur le Plan.
- Premier lancement : Auto. Ensuite, le dernier choix est mémorisé.
- Changer le thème dans une fenêtre le change tout de suite dans l’autre.
- Fond clair : gris très pâle ; tuiles et barres : blanc. Fond sombre : presque noir ; tuiles : un cran plus claires. Bordures discrètes, comme Pointage.
- Jaune de charte pour l’action principale ; survol un peu plus soutenu ; texte toujours foncé, jamais blanc sur jaune.
- Rouge pour détruire. Boutons secondaires : fond de tuile, bordure, texte gris.
- Liste ou onglet actif : fond légèrement teinté, lisible dans les deux thèmes — pas l’ancien bleu massif.
- Coins nets partout (boutons, tuiles, dialogues).
- Même police que Pointage.
- Chargement, dialogues, confirmations, états vides : même peau.
- Pastilles et types : inchangés.

## Notes complémentaires

Le thème est partagé entre l’affaire et la fenêtre Plan. Le jaune de charte sur fond clair reste lisible grâce au texte foncé. La charte de Pointage (jaune, fonds, tuiles, coins nets, police) est la référence ; on n’invente pas de teinte.
