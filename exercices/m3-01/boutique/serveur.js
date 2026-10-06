// La boutique de Treichville : catalogue de pagnes et de bijoux.
// Code écrit vite par une IA : il marche, mais ses requêtes SQL sont à auditer.
// Lancer : node serveur.js   puis ouvrir http://localhost:3008/api/produits
const http = require("node:http");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const PORT = 3008;
const db = new DatabaseSync(path.join(__dirname, "boutique.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS produits (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nom       TEXT    NOT NULL,
    categorie TEXT    NOT NULL,
    prix      INTEGER NOT NULL,              -- en francs CFA
    visible   INTEGER NOT NULL DEFAULT 1     -- 0 = pas encore en vente
  );
`);
if (db.prepare("SELECT COUNT(*) AS n FROM produits").get().n === 0) {
  const ajouter = db.prepare("INSERT INTO produits (nom, categorie, prix, visible) VALUES (?, ?, ?, ?)");
  ajouter.run("Pagne wax Lumière d'Abidjan", "pagnes", 12000, 1);
  ajouter.run("Pagne kita tissé main", "pagnes", 35000, 1);
  ajouter.run("Boucles d'oreilles en or", "bijoux", 45000, 1);
  ajouter.run("Collier de perles", "bijoux", 8000, 1);
  ajouter.run("Sac en raphia", "accessoires", 15000, 1);
  ajouter.run("Collection 2027 (pas encore annoncée)", "pagnes", 99000, 0);
}

function repondre(res, code, donnees) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(donnees, null, 2));
}

const serveur = http.createServer((req, res) => {
  console.log(req.method, req.url);
  const { pathname, searchParams } = new URL(req.url, `http://localhost:${PORT}`);

  try {
    // GET /api/produits?q=pagne&categories=pagnes,bijoux&tri=prix&ordre=desc
    if (req.method === "GET" && pathname === "/api/produits") {
      const q = searchParams.get("q");
      const categories = searchParams.get("categories");
      const tri = searchParams.get("tri");
      const ordre = searchParams.get("ordre");

      let requete = "SELECT id, nom, categorie, prix FROM produits WHERE visible = 1";
      if (q) requete += ` AND nom LIKE '%${q}%'`;
      if (categories) requete += ` AND categorie IN ('${categories.split(",").join("', '")}')`;
      if (tri) requete += ` ORDER BY ${tri} ${ordre || "ASC"}`;
      return repondre(res, 200, db.prepare(requete).all());
    }

    // GET /api/produits/3
    const trouve = pathname.match(/^\/api\/produits\/(\d+)$/);
    if (req.method === "GET" && trouve) {
      const produit = db.prepare(`SELECT id, nom, categorie, prix FROM produits WHERE visible = 1 AND id = ${trouve[1]}`).get();
      if (!produit) return repondre(res, 404, { erreur: "Produit introuvable." });
      return repondre(res, 200, produit);
    }

    repondre(res, 404, { erreur: "Cette adresse n'existe pas." });
  } catch (erreur) {
    // Pour déboguer plus facilement
    repondre(res, 500, { erreur: erreur.message, details: String(erreur) });
  }
});

serveur.listen(PORT, () => console.log(`Boutique prête : http://localhost:${PORT}/api/produits`));
