# Ingénieur Claude — Carnet de route

Un parcours gratuit, en français simple, pour apprendre à **piloter l'IA et vérifier son travail** :
comprendre le front-end, le back-end et la sécurité juste assez pour relire, challenger et valider ce que l'IA
produit.

4 modules, 20 leçons. Chaque leçon : l'idée, un exemple concret, une vidéo, comment vérifier le travail de l'IA,
un résumé, trois exercices pratiques et un quiz. La progression est enregistrée dans ton navigateur.

## Lancer le site en local

Aucune installation nécessaire.

1. Télécharge ou clone le dépôt :
   ```bash
   git clone https://github.com/<ton-compte>/<nom-du-depot>.git
   ```
2. Ouvre `index.html` en double-cliquant dessus. C'est tout.

> Les vidéos YouTube peuvent refuser de se lancer quand la page est ouverte en `file://`. Un lien « Regarder sur
> YouTube » est toujours proposé en dessous. Pour un rendu identique à la version en ligne, lance un petit serveur
> local depuis le dossier du projet, puis ouvre http://localhost:8000 :
> ```bash
> python -m http.server 8000
> ```

## Publier sur GitHub Pages

1. Crée un dépôt sur GitHub (public), puis envoie le code :
   ```bash
   git remote add origin https://github.com/<ton-compte>/<nom-du-depot>.git
   git push -u origin main
   ```
2. Sur GitHub : **Settings → Pages**. Dans « Build and deployment », choisis **Deploy from a branch**,
   branche **main**, dossier **/ (root)**, puis **Save**.
3. Après une à deux minutes, le site est en ligne à l'adresse
   `https://<ton-compte>.github.io/<nom-du-depot>/`.

Le fichier `.nojekyll` à la racine est indispensable : sans lui, GitHub Pages ignore les fichiers dont le nom
commence par `_`.

## Ajouter une leçon

1. Copie `lecons/_modele.html` vers `lecons/<id>.html` (exemple : `lecons/m2-01.html`).
2. Dans le nouveau fichier, mets le même id dans `<body data-lecon="m2-01">` et remplace les textes.
3. Dans `assets/programme.js`, mets `pret: true` sur la leçon (ou ajoute une ligne si elle est nouvelle).

L'id sert de clé pour la progression des visiteurs : ne le change plus une fois la leçon publiée.

## Organisation

```
index.html            Accueil : la route, la progression, « Reprendre »
lecons/               Une page par leçon (+ _modele.html, le gabarit)
exercices/            Fichiers de départ des exercices
assets/programme.js   L'ordre des modules et des leçons
assets/app.js         Toute la logique du site
assets/style.css      Le design
video/                Fabrication des vidéos (Remotion + ElevenLabs), pas utilisé par le site
```

## Vidéos

Les vidéos sont fabriquées dans `video/` puis hébergées sur YouTube en « non répertorié ». Les fichiers MP4 ne sont
jamais commités (trop lourds). Les clés API vont dans un fichier `.env` (modèle : `.env.example`), qui est ignoré
par git.

```bash
cd video
npm install                               # une seule fois
npm run voix                              # chercher une voix (gratuit) -> out/voix.html
npm run tts -- m1-01 --essai              # voir le texte envoyé à la voix (gratuit)
npm run tts -- m1-01 --scene 1            # générer l'audio d'une scène
npm run studio                            # prévisualiser la vidéo dans le navigateur
npm run rendu -- m1-01 out/m1-01.mp4      # fabriquer le MP4
```

Écris le script dans `video/scripts/<id>.md` et corrige les prononciations dans `video/prononciation.json`.

## Crédits

Polices sous licence SIL Open Font License : Archivo (Omnibus-Type), Source Serif 4 (Adobe), JetBrains Mono
(JetBrains).
