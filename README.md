# Ingénieur Claude — Carnet de route

Un parcours gratuit, en français simple, pour apprendre à **piloter l'IA et vérifier son travail** :
comprendre le front-end, le back-end et la sécurité juste assez pour relire, challenger et valider ce que l'IA
produit.

4 modules, 20 leçons. Chaque leçon : l'idée, un exemple concret, comment vérifier le travail de l'IA, un résumé,
, trois exercices pratiques et un quiz. La progression est enregistrée dans ton navigateur.

## Lancer le site en local

Aucune installation nécessaire.

1. Télécharge ou clone le dépôt :
   ```bash
   git clone https://github.com/<ton-compte>/<nom-du-depot>.git
   ```
2. Ouvre `index.html` en double-cliquant dessus. C'est tout.


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
```

## Crédits

Polices sous licence SIL Open Font License : Archivo (Omnibus-Type), Source Serif 4 (Adobe), JetBrains Mono
(JetBrains).
