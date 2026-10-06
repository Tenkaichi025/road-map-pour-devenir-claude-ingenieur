# Grille de relecture d'un diff de l'IA (5 points)

Avant tout : relis la demande (le ticket, ton prompt). Puis :

1. PÉRIMÈTRE — `git diff main --stat`
   - Chaque fichier modifié est-il justifié par la demande ?
   - Une fonction renommée, une règle retirée, une « amélioration » non demandée ?

2. DÉPENDANCES — `git diff main -- package.json`
   - Une nouvelle bibliothèque ? Pour quel besoin réel ? Quelques lignes suffiraient-elles ?

3. SÉCURITÉ ET INVARIANTS
   - Chaque entrée est-elle validée (type, signe, bornes, existence) ?
   - Les invariants du module tiennent-ils encore (ex. : quantité ≤ stock, panier jamais modifié en place) ?
   - Effets de bord : modification d'un objet reçu, d'un état partagé, d'autres appelants (cherche les usages des fonctions changées) ?
   - Les règles du module 3 : SQL préparé, textContent, secrets, propriétaire vérifié.

4. TESTS — `git diff main -- tests/`
   - Un test existant retiré ou une valeur attendue changée ? Pourquoi ?
   - Les nouveaux tests couvrent-ils les cas limites, ou seulement le cas qui marche ?

5. LISIBILITÉ
   - Compréhensible dans 6 mois ? Noms précis, pas de « gère tout », pas de == ?
   - Plus simple possible pour le besoin (pas de complexité « pour plus tard ») ?

Décision : ACCEPTER (tout est bon), DEMANDER UNE CORRECTION (points précis, preuves à l'appui),
ou REFUSER (trop loin de la demande : on repart d'un prompt plus cadré).
