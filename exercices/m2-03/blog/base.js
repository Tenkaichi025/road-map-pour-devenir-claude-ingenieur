// Ouvre la base blog.db (un simple fichier, à côté de ce script). Si elle n'existe pas, elle est créée.
// node:sqlite est fourni avec Node (version 22.5 ou plus) : rien à installer.
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

// Une seule connexion pour tout le programme, ouverte au démarrage.
// node:sqlite vérifie les liens entre tables (clés étrangères) par défaut : on ne désactive jamais ça.
const db = new DatabaseSync(path.join(__dirname, "blog.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    titre   TEXT    NOT NULL,
    contenu TEXT    NOT NULL,
    publie  INTEGER NOT NULL DEFAULT 0          -- 0 = brouillon, 1 = publié
  );
  CREATE TABLE IF NOT EXISTS commentaires (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    auteur     TEXT    NOT NULL,
    texte      TEXT    NOT NULL
  );
`);

// Des données de départ, seulement si la base est vide.
if (db.prepare("SELECT COUNT(*) AS n FROM articles").get().n === 0) {
  const article = db.prepare("INSERT INTO articles (titre, contenu, publie) VALUES (?, ?, ?)");
  const commentaire = db.prepare("INSERT INTO commentaires (article_id, auteur, texte) VALUES (?, ?, ?)");
  const a1 = article.run("Bien choisir l'attiéké", "Grain fin ou gros grain ? Tout dépend du poisson.", 1).lastInsertRowid;
  const a2 = article.run("Les meilleurs maquis de Yopougon", "Notre tournée du samedi soir, adresse par adresse.", 1).lastInsertRowid;
  article.run("Brouillon : nos tarifs 2026 (confidentiel)", "Marges, remises clients, prix fournisseurs… à ne pas publier.", 0);
  commentaire.run(a1, "Awa", "Gros grain avec le thon, toujours !");
  commentaire.run(a1, "Kofi", "Et le piment frais à part, s'il vous plaît.");
  commentaire.run(a2, "Mariam", "Vous avez oublié le maquis derrière la mairie.");
}

module.exports = db;
