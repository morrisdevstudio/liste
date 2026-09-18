# PRD : Relevé plan PDF

## Problème

Le technicien bureau d’études ouvre un schéma électrique — quelques pages ou une centaine — et compte à l’œil les symboles pour remplir la liste de matériel. Sur un même bloc (disjoncteur, Vigi, OF), il est facile d’oublier un accessoire, de recompter deux fois, ou de ne plus savoir ce qui a déjà été relevé. Le besoin n’est pas d’afficher un plan : c’est de compter sans oubli ni double emploi, avec un contrôle visuel immédiat.

## Solution

Dans l’affaire, un bouton Plan ouvre une fenêtre à part avec le schéma de la liste ouverte. Le technicien sélectionne ou ajoute une référence, puis pose des pastilles sur les symboles. Une pastille vaut un sur la quantité de cette liste ; un clic droit retire. Les pastilles des autres listes restent visibles mais atténuées. La couleur vient du type d’appareil (disjoncteur, Vigi, OF…) : un coup d’œil suffit pour voir s’il manque un accessoire. Une liste n’a qu’un plan ; un même plan peut servir à plusieurs listes.

## Utilisateur cible

Technicien bureau d’études qui prépare les listes de matériel d’une affaire industrielle (liste achat, fiches achat, appro anticipé). Il a le schéma à côté de l’application, connaît les références, et compte appareil par appareil, y compris les accessoires collés au même bloc.

## User Stories

1. US-1 — En tant que technicien BE, je veux ouvrir la fenêtre Plan depuis l’affaire, afin de compter sur le schéma sans quitter mes listes.
2. US-2 — En tant que technicien BE, je veux que rouvrir Plan ramène la fenêtre déjà ouverte au premier plan, afin de ne pas me retrouver avec deux plans.
3. US-3 — En tant que technicien BE, je veux attacher un plan à la liste ouverte (nouveau fichier ou plan déjà dans l’affaire), afin de commencer le relevé.
4. US-4 — En tant que technicien BE, je veux voir un état vide « Ajouter / Réutiliser » si la liste n’a pas de plan, afin de savoir quoi faire.
5. US-5 — En tant que technicien BE, je veux que la fenêtre affiche le plan de la liste ouverte, afin de ne pas compter sur le mauvais dessin.
6. US-6 — En tant que technicien BE, je veux, sur Globale, État préparatoire ou Chiffrage, garder le dernier plan en lecture seule, afin de consulter sans poser par erreur.
7. US-7 — En tant que technicien BE, je veux ajouter une référence à quantité 0 et la voir sélectionnée tout de suite, afin d’enchaîner le marquage.
8. US-8 — En tant que technicien BE, je veux un bandeau toujours visible (liste, référence, désignation, type, couleur, quantité), afin de savoir ce que je pose depuis l’autre fenêtre.
9. US-9 — En tant que technicien BE, je veux qu’un clic sans référence sélectionnée ne pose rien, afin de ne pas marquer à l’aveugle.
10. US-10 — En tant que technicien BE, je veux poser une pastille au clic gauche sur le papier, afin d’incrémenter la quantité de la référence en cours.
11. US-11 — En tant que technicien BE, je veux retirer au clic droit une pastille de la liste ouverte, afin de corriger un trop-plein.
12. US-12 — En tant que technicien BE, je veux qu’un clic gauche sur une pastille sélectionne sa ligne (et bascule de liste si besoin), afin de reprendre le bon pinceau.
13. US-13 — En tant que technicien BE, je veux que les pastilles des autres listes soient visibles mais atténuées et non retirables, afin de ne pas recompter ce qui est déjà pris ailleurs.
14. US-14 — En tant que technicien BE, je veux voir les pastilles de la référence en cours mises en avant, afin de savoir où je l’ai déjà posée sur la feuille.
15. US-15 — En tant que technicien BE, je veux un aperçu au survol (référence, désignation, type, quantité, nom de liste si autre), afin de vérifier un Vigi sans quitter le plan.
16. US-16 — En tant que technicien BE, je veux des couleurs par type d’appareil, uniques, afin de voir d’un coup d’œil s’il manque un OF ou un Vigi.
17. US-17 — En tant que technicien BE, je veux marquer une référence sans type avec une pastille neutre, afin de ne pas bloquer le relevé.
18. US-18 — En tant que technicien BE, je veux que la quantité d’une ligne marquée soit verrouillée et égale au nombre de pastilles, afin que le compte et la liste ne divergent jamais.
19. US-19 — En tant que technicien BE, je veux confirmer avant que le premier marqueur remplace une quantité déjà saisie, afin de ne pas écraser un 5 en un clic.
20. US-20 — En tant que technicien BE, je veux qu’un import ignore les lignes déjà marquées et m’indique combien, afin de ne pas casser un relevé en cours.
21. US-21 — En tant que technicien BE, je veux parcourir le plan page par page (molette, numéro), zoomer (Ctrl + molette), me déplacer (Ctrl enfoncé), revenir à la page entière et à 100 %, afin de viser un symbole sur un grand schéma.
22. US-22 — En tant que technicien BE, je veux annuler / rétablir uniquement la dernière pose ou le dernier retrait, afin de corriger un clic de trop.
23. US-23 — En tant que technicien BE, je veux détacher le plan de la liste ouverte : pastilles de cette liste enlevées, quantités gardées, saisie de nouveau possible, afin de changer de dessin sans toucher aux autres listes.
24. US-24 — En tant que technicien BE, je veux remplacer le plan d’une liste sans l’enlever aux autres listes qui le partagent encore, afin de ne pas casser leur relevé.
25. US-25 — En tant que technicien BE, je veux supprimer un plan de l’affaire : toutes les listes liées libérées, fichier retiré, quantités conservées, afin de jeter un mauvais schéma.
26. US-26 — En tant que technicien BE, je veux, si le fichier du plan a disparu, bloquer le marquage et recoller un fichier, afin de ne pas perdre le relevé.
27. US-27 — En tant que technicien BE, je veux, si le fichier recollé n’a pas le même nombre de pages, repartir de zéro sur ce plan (pastilles jetées, quantités gardées), afin de ne pas poser à côté.
28. US-28 — En tant que technicien BE, je veux qu’une ligne sans plus aucune pastille redevienne saisissable sans remettre la quantité à zéro, afin de ne pas perdre un compte déjà validé.
29. US-29 — En tant que technicien BE, je veux que supprimer une ligne enlève ses pastilles, afin de ne pas laisser de points orphelins.
30. US-30 — En tant que technicien BE, je veux que changer la référence d’une ligne garde ses pastilles (nouvelle couleur), et qu’une fusion vers une référence déjà présente rassemble les pastilles, afin de corriger une erreur de saisie sans recompter.
31. US-31 — En tant que technicien BE, je veux fermer la fenêtre Plan sans détacher le schéma, et que fermer l’affaire ferme le plan, afin de ne pas marquer dans le vide.
32. US-32 — En tant qu’admin catalogue, je veux créer, renommer, colorer et supprimer des types (jeu de départ fourni), afin de classer les références hors du relevé.
33. US-33 — En tant qu’admin catalogue, je veux qu’une couleur déjà prise soit refusée, afin de ne pas confondre deux types sur le plan.
34. US-34 — En tant qu’admin catalogue, je veux qu’en supprimant un type les références deviennent sans type, afin de ne pas casser le catalogue.

## Critères de succès

1. Après 3 poses et 1 retrait sur une référence, la quantité de la ligne vaut 2 et n’est plus saisissable à la main.
2. Un plan copié à côté de l’affaire se réouvre avec les pastilles encore en place.
3. Deux listes qui partagent le même plan : les pastilles de l’autre liste sont visibles ; un clic droit n’en retire aucune.
4. Détacher ou supprimer le plan : les quantités restent, la saisie redevient possible, les pastilles de ce plan pour les listes libérées disparaissent.
5. Une référence sans type reste marquable (pastille neutre) ; deux types ne peuvent pas avoir la même couleur.

## Hors périmètre

- Reconnaissance automatique des symboles
- Packs / kits (disjoncteur ⇒ Vigi + OF)
- Export du plan annoté
- Saut automatique d’une pastille à l’autre, d’une page à l’autre
- Plusieurs plans pour une même liste
- Deuxième fenêtre Plan, ou plan collé dans la fenêtre affaire
- Création de types pendant le relevé
- Annulation au-delà de la pose / du retrait (pas d’annulation d’import, de détacher, de suppression de plan)

## Décisions d'implémentation

- Fenêtre Plan séparée, une seule ; bouton Plan dans la barre d’affaire ; fermer (croix) cache sans détacher.
- Une sous-liste éditable : zéro ou un plan. Un plan peut servir à plusieurs listes. Globale / État préparatoire / Chiffrage n’attachent rien.
- Nouvelle ligne : quantité 0, ligne sélectionnée (pinceau).
- Dès qu’il reste au moins une pastille : cadenas, quantité = nombre de pastilles, pas de plus/moins ni saisie. Zéro pastille : saisie libre, quantité inchangée.
- Premier marqueur sur une ligne déverrouillée avec quantité > 0 : dialogue ; confirmer → quantité 1 ; annuler → rien n’est posé.
- Import (Excel ou Chiffrage) : ignore les lignes déjà sous le plan, affiche le nombre ignoré.
- Pastille : taille fixe à l’écran (environ 10 px), couleur du type, neutre gris ardoise si sans type.
- Clic gauche papier = poser. Clic gauche pastille = sélectionner (bascule de liste si autre liste). Clic droit = retirer seulement une pastille de la liste ouverte. Hors pastille active : rien.
- Chevauchement : si la référence en cours est sous le curseur, c’est elle ; sinon la dernière posée. Le survol montre la cible.
- Une page à la fois. Molette = page précédente/suivante, pas de boucle en première/dernière page. Ctrl + molette = zoom autour du curseur. Ctrl enfoncé = main (déplacer). Ouverture et Reset = page entière. Bouton 100 % = taille réelle. Resize : le zoom courant est conservé. Reset ne change pas de page.
- PDF manquant : marquage bloqué, bouton Recoller. Même nombre de pages → pastilles conservées. Nombre différent → toutes les pastilles de ce plan jetées, quantités gardées, listes déverrouillées.
- Détacher / remplacer : n’affecte que la liste ouverte. Le fichier n’est retiré que s’il ne reste plus aucune liste liée. Supprimer de l’affaire : toutes les listes liées libérées, fichier retiré. Les deux actions demandent confirmation.
- Types dans l’admin catalogue, jeu de départ : Disjoncteur, Vigi, Auxiliaire OF, Auxiliaire SD, Contacteur, Sectionneur, Parafoudre, Voyant, Bornier, Autre. Couleurs uniques, neutre réservé. Pas de classification pendant le relevé.
- Ctrl+Z / Ctrl+Y : pose et retrait uniquement.

## Notes complémentaires

Hypothèses / risques : schémas scannés peu lisibles ; plans encore ouverts hors de l’application ; affaire déplacée sans le dossier des PDF ; types à classer dans le catalogue avant que les couleurs aident vraiment.

