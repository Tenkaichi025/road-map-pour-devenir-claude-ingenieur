# RAPPORT — Ingénieur Claude

## Objectif du projet
Site de formation statique, en français, pour apprendre à piloter l'IA et valider son travail (front-end,
back-end, sécurité, méthode « ingénieur Claude »). D'abord local, puis public sur GitHub Pages.

## Stack & Technologies
- Site : HTML, CSS, JavaScript purs, sans framework ni build. Polices auto-hébergées (woff2, OFL).
- Aucun service payant (exigence) : pas de vidéos, pas d'API.

## Architecture & Structure clé
- `index.html` : accueil (route latérite, compteur, barre, bouton Reprendre/Commencer).
- `assets/programme.js` : liste ordonnée des 4 modules / 20 leçons (`id`, `titre`, `pret`).
- `assets/app.js` : progression localStorage (`ingenieur-claude:progression`), rendu de la route, rail de leçon,
  quiz, case « terminé », navigation précédente/suivante.
- `assets/style.css` : design (papier/encre/latérite, mode sombre auto).
- `lecons/_modele.html` : gabarit d'une leçon (idée, exemple, vérifier, à retenir, exercices, quiz).

- `lecons/m1-01..05.html` : module 1 rédigé. `exercices/m1-0X/` : fichiers de départ (dont des pages
  volontairement cassées ; leurs bugs sont décrits dans les corrections repliables des leçons — ne pas les « réparer »).

## Fonctionnalités développées & Restantes
- Fait : structure, accueil, route, suivi de progression, gabarit de leçon, quiz interactif, module 1 complet (5 leçons, 15 exercices, 15 questions).
- Restant : schémas visuels du module 1 (proposés), modules 2 à 4.

## Dernières modifications importantes
- 2026-10-06 : abandon des vidéos, nettoyage du projet.
- 2026-10-06 : étape 3 — module 1 rédigé. Exemples : galerie, formulaire de traiteur, page d'événement,
  liste de tâches, tableau de bord météo. Comportement des exercices vérifié automatiquement dans Chrome
  (messages d'erreur, numéros de ligne, débordement à 375 px, résultats des corrections).
- 2026-10-06 : étapes 1 et 2 — initialisation git, fichiers de projet, structure et page d'accueil.

## Problèmes rencontrés & Solutions
- `fetch` de JSON bloqué en `file://` → contenu en pages HTML + `programme.js` chargé par `<script>`.
- GitHub Pages (Jekyll) ignore les fichiers en `_` → ajout de `.nojekyll`.
- Ligatures JetBrains Mono (`</` fusionné) déroutantes pour un débutant → `font-variant-ligatures: none`.
- Vidéos (Remotion + voix ElevenLabs puis edge-tts) testées puis abandonnées : trop lourdes à gérer. Le site se suffit.
- PowerShell : `curl` est un alias d'Invoke-WebRequest et les guillemets JSON sautent → toujours `curl.exe`, corps
  JSON lu depuis un fichier (`--data "@fichier.json"`).
- `node:sqlite` active les clés étrangères PAR DÉFAUT (contrairement au SQLite classique) : le bug réaliste n'est
  pas l'oubli du PRAGMA, mais `enableForeignKeyConstraints: false` ajouté pour « faire taire » une erreur.
- Depuis Git Bash, `kill -INT` n'arrête pas un serveur Node sous Windows : tester les arrêts/redémarrages en PowerShell.
- Chrome headless ne descend pas sous 500 px de large → tests mobiles via une iframe de 375 px.
- Exercice « page qui déborde » : une longue URL ne débordait pas (Chrome coupe après les « / ») → cause
  remplacée par `white-space: nowrap` sur le titre. Leçon : toujours vérifier qu'un bug « pédagogique » se produit vraiment.

## Dépendances & Commandes clés
- Aucune dépendance pour le site. Ouvrir `index.html`.
- Serveur local facultatif : `python -m http.server 8000`.

## Variables d'environnement
- Aucune. `.env` reste ignoré par git par précaution.

## État actuel & Prochaines étapes
- Module 1 terminé et validé. Vidéos abandonnées (dossier `video/` supprimé, sections vidéo retirées des leçons).
- Schémas du module 1 faits : 1.1 chronologie du chargement, 1.2 champ de formulaire découpé, 1.3 modèle de boîte
  + grille 375/1280 px, 1.4 code source vs DOM, 1.5 méthode + matrice symptôme → outil. Vérifiés : aucun texte ne
  déborde, lisibles à 375 px, clair et sombre.
- Module 2 en cours : leçon 2.1 (cycle requête-réponse) rédigée. Exemple : réservation de salles en Node.js
  (`node:http`, sans dépendance). Exercices : `exercices/m2-01/` (serveur correct, serveur avec bug de double
  réservation ligne 58, fichiers JSON pour `curl.exe --data "@fichier"`). Codes vérifiés avec curl, y compris depuis PowerShell.
- Leçon 2.2 (API REST et JSON) rédigée. Exemple : agenda d'événements d'Abidjan. `exercices/m2-02/` : API REST
  complète + page aux 4 états (port 3002), API bugguée à auditer (port 3003, 6 problèmes + plantage sur JSON cassé),
  fichiers de requêtes dont un titre piégé (XSS). Vérifié : codes via curl, 4 états et titre piégé dans Chrome.
- Leçon 2.3 (SQLite) rédigée. Exemple : blog (articles + commentaires, brouillons). `exercices/m2-03/` : `blog/`
  (base.js, serveur.js port 3004, sql.js pour taper du SQL), `blog-bugge/` (port 3005 : injection, clés étrangères
  désactivées, commentaire orphelin accepté, connexion ouverte à chaque requête). Vérifié avec curl et PowerShell.
- Ensuite : leçon 2.4 (authentification).
