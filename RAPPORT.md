# RAPPORT — Ingénieur Claude

## Objectif du projet
Site de formation statique, en français, pour apprendre à piloter l'IA et valider son travail (front-end,
back-end, sécurité, méthode « ingénieur Claude »). D'abord local, puis public sur GitHub Pages.

## Stack & Technologies
- Site : HTML, CSS, JavaScript purs, sans framework ni build. Polices auto-hébergées (woff2, OFL).
- Vidéos : Remotion 4 (dans `video/`, dépendances séparées du site) + voix edge-tts (gratuite, sans clé),
  `fr-FR-RemyMultilingualNeural`. Hébergement YouTube non répertorié. Projet 100 % gratuit (exigence).

## Architecture & Structure clé
- `index.html` : accueil (route latérite, compteur, barre, bouton Reprendre/Commencer).
- `assets/programme.js` : liste ordonnée des 4 modules / 20 leçons (`id`, `titre`, `pret`).
- `assets/app.js` : progression localStorage (`ingenieur-claude:progression`), rendu de la route, rail de leçon,
  vidéo, quiz, case « terminé », navigation précédente/suivante.
- `assets/style.css` : design (papier/encre/latérite, mode sombre auto).
- `lecons/_modele.html` : gabarit d'une leçon (idée, exemple, vidéo, vérifier, à retenir, exercices, quiz).

- `lecons/m1-01..05.html` : module 1 rédigé. `exercices/m1-0X/` : fichiers de départ (dont des pages
  volontairement cassées ; leurs bugs sont décrits dans les corrections repliables des leçons — ne pas les « réparer »).

## Fonctionnalités développées & Restantes
- Fait : structure, accueil, route, suivi de progression, gabarit de leçon, quiz interactif, emplacement vidéo
  avec message de remplacement, module 1 complet (5 leçons, 15 exercices, 15 questions).
- Restant : script + vidéo test 1.1, modules 2 à 4, vidéos.

## Dernières modifications importantes
- 2026-10-06 : étape 3 — module 1 rédigé. Exemples : galerie, formulaire de traiteur, page d'événement,
  liste de tâches, tableau de bord météo. Comportement des exercices vérifié automatiquement dans Chrome
  (messages d'erreur, numéros de ligne, débordement à 375 px, résultats des corrections).
- 2026-10-06 : étapes 1 et 2 — initialisation git, fichiers de projet, structure et page d'accueil.

## Problèmes rencontrés & Solutions
- `fetch` de JSON bloqué en `file://` → contenu en pages HTML + `programme.js` chargé par `<script>`.
- GitHub Pages (Jekyll) ignore les fichiers en `_` → ajout de `.nojekyll`.
- Ligatures JetBrains Mono (`</` fusionné) déroutantes pour un débutant → `font-variant-ligatures: none`.
- ElevenLabs abandonné (payant) → edge-tts. Il ne gère pas les balises de pause : chaque scène est découpée aux
  « (pause) », le blanc ajouté par edge-tts en début/fin de morceau est mesuré (silencedetect) puis coupé (atrim),
  car le ffmpeg de Remotion n'a pas `silenceremove`.
- Chrome headless ne descend pas sous 500 px de large → tests mobiles via une iframe de 375 px.
- Exercice « page qui déborde » : une longue URL ne débordait pas (Chrome coupe après les « / ») → cause
  remplacée par `white-space: nowrap` sur le titre. Leçon : toujours vérifier qu'un bug « pédagogique » se produit vraiment.

## Dépendances & Commandes clés
- Aucune dépendance pour le site. Ouvrir `index.html`.
- Serveur local facultatif : `python -m http.server 8000`.
- Vidéo : voir la section Vidéos du README (`npm run tts`, `npm run studio`, `npm run rendu`). Prérequis : `python -m pip install edge-tts`.

## Variables d'environnement
- Aucune. `.env` reste ignoré par git par précaution.

## État actuel & Prochaines étapes
- Étapes 1-3 terminées et validées (module 1).
- Script vidéo 1.1 rédigé (`video/scripts/m1-01.md`, ~675 mots ≈ 5 min, ~3 800 caractères) + `video/prononciation.json`. En relecture par Wilfried.
- Outillage vidéo en place : `video/tts.mjs` (script → morceaux edge-tts → silences exacts → scene-N.mp3 via le
  ffmpeg de Remotion), Remotion (`src/Racine.jsx`, `src/Lecon.jsx`, écrans provisoires).
- Audio de la scène 1 généré avec Rémy et Henri (`video/out/scene-1-*.mp3`) : en attente du choix de voix par Wilfried.
