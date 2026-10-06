// Ouvre la base membres.db de la version « codée vite fait ».
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const db = new DatabaseSync(path.join(__dirname, "membres.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS utilisateurs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT    NOT NULL UNIQUE,
    mot_de_passe TEXT    NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    texte          TEXT    NOT NULL
  );
`);

if (db.prepare("SELECT COUNT(*) AS n FROM utilisateurs").get().n === 0) {
  const utilisateur = db.prepare("INSERT INTO utilisateurs (email, mot_de_passe) VALUES (?, ?)");
  const note = db.prepare("INSERT INTO notes (utilisateur_id, texte) VALUES (?, ?)");
  const awa = utilisateur.run("awa@exemple.ci", "mangue-papaye-2026").lastInsertRowid;
  const kofi = utilisateur.run("kofi@exemple.ci", "kedjenou-du-dimanche").lastInsertRowid;
  note.run(awa, "Code de la boutique : 4471");
  note.run(awa, "Rappeler le fournisseur de tissus lundi");
  note.run(kofi, "Idée : une appli de covoiturage pour Bingerville");
}

module.exports = db;
