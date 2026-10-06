// L'espace membre, codé « vite fait » par une IA. Il marche… teste-le vraiment.
// Lancer : node serveur.js   (API seule, sur http://localhost:3007)
const http = require("node:http");
const db = require("./base.js");

const PORT = 3007;

const sql = {
  utilisateurParEmail: db.prepare("SELECT id, email, mot_de_passe FROM utilisateurs WHERE email = ?"),
  creerUtilisateur: db.prepare("INSERT INTO utilisateurs (email, mot_de_passe) VALUES (?, ?)"),
  tousLesUtilisateurs: db.prepare("SELECT * FROM utilisateurs"),
  notesDe: db.prepare("SELECT id, texte FROM notes WHERE utilisateur_id = ? ORDER BY id"),
  ajouterNote: db.prepare("INSERT INTO notes (utilisateur_id, texte) VALUES (?, ?)"),
};

function repondre(res, code, donnees) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(donnees, null, 2));
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let texte = "";
    req.on("data", (morceau) => (texte += morceau));
    req.on("end", () => {
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

// Retrouve l'utilisateur à partir du cookie de session.
function utilisateurConnecte(req) {
  const email = lireCookies(req).session;
  return email ? sql.utilisateurParEmail.get(email) : undefined;
}

const serveur = http.createServer(async (req, res) => {
  console.log(req.method, req.url);
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  let corps = {};
  if (req.method === "POST") {
    try {
      corps = (await lireCorps(req)) || {};
    } catch {
      return repondre(res, 400, { erreur: "Le corps de la requête n'est pas du JSON valide." });
    }
  }

  if (req.method === "POST" && pathname === "/api/inscription") {
    const { email, motDePasse } = corps;
    if (!email || !motDePasse) return repondre(res, 400, { erreur: "E-mail et mot de passe obligatoires." });
    if (sql.utilisateurParEmail.get(email)) return repondre(res, 409, { erreur: "Un compte existe déjà avec cet e-mail." });
    const { lastInsertRowid } = sql.creerUtilisateur.run(email, motDePasse);
    return repondre(res, 201, { id: lastInsertRowid, email });
  }

  if (req.method === "POST" && pathname === "/api/connexion") {
    const { email, motDePasse } = corps;
    const utilisateur = sql.utilisateurParEmail.get(email || "");
    if (!utilisateur) return repondre(res, 404, { erreur: "Aucun compte avec cet e-mail." });
    if (utilisateur.mot_de_passe !== motDePasse) return repondre(res, 401, { erreur: "Mot de passe incorrect." });
    res.setHeader("Set-Cookie", `session=${utilisateur.email}; Path=/`);
    return repondre(res, 200, { email: utilisateur.email });
  }

  // Ajouté pour déboguer : la liste des comptes
  if (req.method === "GET" && pathname === "/api/admin/utilisateurs") {
    return repondre(res, 200, sql.tousLesUtilisateurs.all());
  }

  if (pathname === "/api/notes") {
    const moi = utilisateurConnecte(req);
    if (!moi) return repondre(res, 401, { erreur: "Connecte-toi d'abord." });
    if (req.method === "GET") return repondre(res, 200, sql.notesDe.all(moi.id));
    if (req.method === "POST") {
      const { lastInsertRowid } = sql.ajouterNote.run(moi.id, corps.texte || "");
      return repondre(res, 201, { id: lastInsertRowid, texte: corps.texte });
    }
  }

  repondre(res, 404, { erreur: "Cette adresse n'existe pas." });
});

serveur.listen(PORT, () => console.log(`API prête : http://localhost:${PORT}`));
