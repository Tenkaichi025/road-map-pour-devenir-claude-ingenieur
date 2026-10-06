// Le tableau de bord des factures de l'agence « Compta Plus » : chaque client voit ses factures.
// Code écrit vite par une IA : la connexion marche… mais qui a le droit de faire quoi ?
// Lancer : node serveur.js   (API sur http://127.0.0.1:3012)
// La base est en mémoire : chaque lancement repart des mêmes données de départ.
const http = require("node:http");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { hacher, verifierMotDePasse } = require("./motdepasse.js");

const PORT = 3012;
const db = new DatabaseSync(":memory:");

db.exec(`
  CREATE TABLE utilisateurs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    email     TEXT NOT NULL UNIQUE,
    hash      TEXT NOT NULL,
    nom       TEXT NOT NULL,
    telephone TEXT NOT NULL DEFAULT '',
    role      TEXT NOT NULL DEFAULT 'client'      -- 'client' ou 'admin'
  );
  CREATE TABLE factures (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    numero    TEXT    NOT NULL,
    montant   INTEGER NOT NULL,                   -- en francs CFA
    statut    TEXT    NOT NULL DEFAULT 'due'      -- 'due' ou 'payee'
  );
`);

const ajouterUtilisateur = db.prepare("INSERT INTO utilisateurs (email, hash, nom, role) VALUES (?, ?, ?, ?)");
const ajouterFacture = db.prepare("INSERT INTO factures (client_id, numero, montant, statut) VALUES (?, ?, ?, ?)");
const awa = ajouterUtilisateur.run("awa@exemple.ci", hacher("mangue-papaye-2026"), "Awa Couture", "client").lastInsertRowid;
const kofi = ajouterUtilisateur.run("kofi@exemple.ci", hacher("kedjenou-du-dimanche"), "Kofi Transport", "client").lastInsertRowid;
ajouterUtilisateur.run("admin@comptaplus.ci", hacher("compta-plus-admin-2026"), "Compta Plus", "admin");
ajouterFacture.run(awa, "FAC-2026-014", 250000, "due");
ajouterFacture.run(awa, "FAC-2026-015", 85000, "payee");
ajouterFacture.run(kofi, "FAC-2026-016", 1200000, "due");
ajouterFacture.run(kofi, "FAC-2026-017", 430000, "due");

const sessions = new Map(); // identifiant de session -> id de l'utilisateur

const sql = {
  utilisateurParEmail: db.prepare("SELECT * FROM utilisateurs WHERE email = ?"),
  utilisateur: db.prepare("SELECT id, email, nom, telephone, role FROM utilisateurs WHERE id = ?"),
  mesFactures: db.prepare("SELECT id, numero, montant, statut FROM factures WHERE client_id = ? ORDER BY id"),
  facture: db.prepare("SELECT id, client_id, numero, montant, statut FROM factures WHERE id = ?"),
  changerStatut: db.prepare("UPDATE factures SET statut = ? WHERE id = ?"),
  supprimerFacture: db.prepare("DELETE FROM factures WHERE id = ?"),
  modifierProfil: db.prepare("UPDATE utilisateurs SET nom = ?, telephone = ?, role = ? WHERE id = ?"),
  toutesLesFactures: db.prepare("SELECT f.id, u.nom AS client, f.numero, f.montant, f.statut FROM factures f JOIN utilisateurs u ON u.id = f.client_id ORDER BY f.id"),
};

function repondre(res, code, donnees) {
  if (donnees === undefined) {
    res.writeHead(code);
    return res.end();
  }
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(donnees, null, 2));
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let texte = "";
    req.on("data", (morceau) => (texte += morceau));
    req.on("end", () => {
      if (!texte.trim()) return resolve({});
      try {
        resolve(JSON.parse(texte));
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
  });
}

function lireCookies(req) {
  const cookies = {};
  for (const morceau of (req.headers.cookie || "").split(";")) {
    const egal = morceau.indexOf("=");
    if (egal > 0) cookies[morceau.slice(0, egal).trim()] = morceau.slice(egal + 1).trim();
  }
  return cookies;
}

// La garde : renvoie l'utilisateur connecté, ou répond 401.
function exigerConnexion(req, res) {
  const id = sessions.get(lireCookies(req).session);
  const utilisateur = id && sql.utilisateur.get(id);
  if (!utilisateur) {
    repondre(res, 401, { erreur: "Connecte-toi d'abord." });
    return null;
  }
  return utilisateur;
}

const serveur = http.createServer(async (req, res) => {
  console.log(req.method, req.url);
  const { pathname } = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let corps = {};
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      corps = await lireCorps(req);
    } catch {
      return repondre(res, 400, { erreur: "Le corps de la requête n'est pas du JSON valide." });
    }
  }

  if (req.method === "POST" && pathname === "/api/connexion") {
    const u = typeof corps.email === "string" ? sql.utilisateurParEmail.get(corps.email) : undefined;
    if (!u || typeof corps.motDePasse !== "string" || !verifierMotDePasse(corps.motDePasse, u.hash)) {
      return repondre(res, 401, { erreur: "E-mail ou mot de passe incorrect." });
    }
    const idSession = crypto.randomBytes(32).toString("base64url");
    sessions.set(idSession, u.id);
    res.setHeader("Set-Cookie", `session=${idSession}; HttpOnly; SameSite=Lax; Path=/`);
    return repondre(res, 200, { nom: u.nom });
  }

  const moi = exigerConnexion(req, res);
  if (!moi) return;

  // Mon profil
  if (pathname === "/api/moi") {
    if (req.method === "GET") return repondre(res, 200, moi);
    if (req.method === "PUT") {
      const misAJour = { ...moi, ...corps };
      sql.modifierProfil.run(String(misAJour.nom), String(misAJour.telephone), String(misAJour.role), moi.id);
      return repondre(res, 200, sql.utilisateur.get(moi.id));
    }
  }

  // Mes factures
  if (req.method === "GET" && pathname === "/api/factures") {
    return repondre(res, 200, sql.mesFactures.all(moi.id));
  }

  // Une facture précise : /api/factures/16
  const trouve = pathname.match(/^\/api\/factures\/(\d+)$/);
  if (trouve) {
    const id = Number(trouve[1]);
    const facture = sql.facture.get(id);
    if (!facture) return repondre(res, 404, { erreur: "Facture introuvable." });

    if (req.method === "GET") return repondre(res, 200, facture);
    if (req.method === "PUT") {
      if (!["due", "payee"].includes(corps.statut)) return repondre(res, 400, { erreur: "Statut : due ou payee." });
      sql.changerStatut.run(corps.statut, id);
      return repondre(res, 200, sql.facture.get(id));
    }
    if (req.method === "DELETE") {
      sql.supprimerFacture.run(id);
      return repondre(res, 204);
    }
  }

  // Administration : toutes les factures de tous les clients
  if (req.method === "GET" && pathname === "/api/admin/factures") {
    return repondre(res, 200, sql.toutesLesFactures.all());
  }

  repondre(res, 404, { erreur: "Cette adresse n'existe pas." });
});

serveur.listen(PORT, "127.0.0.1", () => console.log(`Factures prêtes : http://127.0.0.1:${PORT}`));
