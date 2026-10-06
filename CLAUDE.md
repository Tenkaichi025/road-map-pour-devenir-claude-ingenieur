# Ingénieur Claude — contexte projet

Site de formation en français pour Wilfried (développeur freelance, Abidjan) qui construit ses projets avec l'IA
(Royal Senteur, Déesse Intimity) et veut apprendre à **piloter l'IA et valider son travail**, pas à tout coder à
la main. Le site sera public sur GitHub Pages.

## Règles techniques
- HTML, CSS, JavaScript purs. Aucun framework, aucun build pour le site.
- Doit marcher en ouvrant `index.html` directement (`file://`) → pas de `fetch` de JSON, les données sont dans des `<script>`.
- Responsive (téléphone d'abord). Progression dans `localStorage`, clé `ingenieur-claude:progression` = `{ "m1-01": true }`.
- Ne jamais utiliser `innerHTML` avec du contenu : `app.js` construit le DOM avec `el()` (le site enseigne le XSS).

## Organisation
- `assets/programme.js` : ordre des modules/leçons, seule source. `pret: true` quand la page est rédigée.
- `assets/app.js` : toute la logique (route, progression, quiz, vidéo, case « terminé », navigation).
- `assets/style.css` : design. `assets/fonts/` : polices auto-hébergées (Archivo, Source Serif 4, JetBrains Mono).
- `lecons/<id>.html` : une page par leçon, copiée depuis `lecons/_modele.html`.
- `exercices/<id>/` : fichiers de départ des exercices. **Beaucoup contiennent des bugs VOLONTAIRES** (décrits dans
  les corrections des leçons, avec numéros de ligne) : ne jamais les corriger, et revérifier les numéros de ligne cités
  si un fichier d'exercice est modifié.
- `video/` : outillage Remotion + ElevenLabs (pas servi par le site).
- `.nojekyll` : obligatoire, sinon GitHub Pages ignore les fichiers commençant par `_`.

## Structure d'une leçon (ordre obligatoire)
1. L'idée (quelques phrases simples)
2. Exemple concret — **varier les contextes** (formulaire de contact, réservation, galerie, blog, boutique, tableau de bord, événements…), ne pas toujours reprendre le même projet
3. Vidéo (`<div class="video" data-youtube="ID">`, vide = message « bientôt » ; la page doit rester complète sans)
4. Vérifier le travail de l'IA (liste de contrôles concrets)
5. À retenir (résumé court, facile à mémoriser)
6. Exercices : guidé, semi-guidé, libre. Énoncé + résultat attendu + indices/correction dans `<details>`. Vrai code sur la machine et usage de Claude (générer → relire → repérer → corriger).
7. Quiz : 3 questions, `<fieldset class="question" data-reponse="N">` + `.explication`.

## Ton et langue
Français simple, tutoiement, phrases courtes. Expliquer le jargon la première fois qu'il apparaît.

## Design
Papier `#F3EFE6`, encre `#1A1A18`, accent unique latérite `#B9431F`. Un seul élément marquant : **la route** (ligne
latérite type métro, stations = leçons). Pas de cartes arrondies, pas de dégradés. Mode sombre via `prefers-color-scheme`.

## Vidéos
- Remotion (dans `video/`), voix ElevenLabs Multilingual v2, voix masculine française.
- Script de narration par leçon dans `video/scripts/<id>.md`, relu par Wilfried AVANT génération. Pauses : `(pause)`, `(longue pause)`.
- Dictionnaire `video/prononciation.json` appliqué avant l'envoi (API, localStorage, HTTPS…).
- Clés dans `.env` (ignoré par git) — jamais dans le code ni les commits. Voir `.env.example`.
- MP4 jamais commités : hébergés sur YouTube en non répertorié, intégrés via `data-youtube`.

## Méthode de travail
- Avancer par étapes et faire valider par Wilfried avant la suivante. Ne pas produire plusieurs modules d'un coup.
- Après chaque étape : expliquer en 3 à 5 lignes ce qui a été fait et pourquoi (le projet sert aussi à apprendre).
- Commits clairs, en français. Mettre à jour `RAPPORT.md` après chaque étape importante.

## Avancement
Voir `RAPPORT.md`.
