// Ouvre la base membres.db (créée au premier lancement, avec deux comptes de démonstration).
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const { hacher } = require("./motdepasse.js");

const db = new DatabaseSync(path.join(__dirname, "membres.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS utilisateurs (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT    NOT NULL UNIQUE,
    hash  TEXT    NOT NULL                  -- jamais le mot de passe lui-même
  );
  CREATE TABLE IF NOT EXISTS notes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    texte          TEXT    NOT NULL
  );
`);

// Deux comptes de démonstration (mots de passe donnés dans la leçon).
if (db.prepare("SELECT COUNT(*) AS n FROM utilisateurs").get().n === 0) {
  const utilisateur = db.prepare("INSERT INTO utilisateurs (email, hash) VALUES (?, ?)");
  const note = db.prepare("INSERT INTO notes (utilisateur_id, texte) VALUES (?, ?)");
  const awa = utilisateur.run("awa@exemple.ci", hacher("mangue-papaye-2026")).lastInsertRowid;
  const kofi = utilisateur.run("kofi@exemple.ci", hacher("kedjenou-du-dimanche")).lastInsertRowid;
  note.run(awa, "Code de la boutique : 4471");
  note.run(awa, "Rappeler le fournisseur de tissus lundi");
  note.run(kofi, "Idée : une appli de covoiturage pour Bingerville");
}

module.exports = db;
