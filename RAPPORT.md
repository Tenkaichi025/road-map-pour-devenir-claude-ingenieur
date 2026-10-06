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
- Schéma 1.1 (chronologie du chargement, façon onglet Réseau) fait, en attente de validation du style.
- Ensuite : schémas 1.2 à 1.5, puis module 2.
