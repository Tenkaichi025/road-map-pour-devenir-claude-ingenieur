// Un espace membre : inscription, connexion, notes privées.
// Lancer : node serveur.js   puis ouvrir http://localhost:3006
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const db = require("./base.js");
const { hacher, verifierMotDePasse } = require("./motdepasse.js");

const PORT = 3006;
const DUREE_SESSION = 2 * 60 * 60; // en secondes : 2 heures

// Les sessions ouvertes : identifiant de session -> { utilisateurId, expire }.
// En mémoire : un redémarrage du serveur déconnecte tout le monde.
const sessions = new Map();

const sql = {
  utilisateurParEmail: db.prepare("SELECT id, email, hash FROM utilisateurs WHERE email = ?"),
  emailDe: db.prepare("SELECT email FROM utilisateurs WHERE id = ?"),
  creerUtilisateur: db.prepare("INSERT INTO utilisateurs (email, hash) VALUES (?, ?)"),
  notesDe: db.prepare("SELECT id, texte FROM notes WHERE utilisateur_id = ? ORDER BY id"),
  ajouterNote: db.prepare("INSERT INTO notes (utilisateur_id, texte) VALUES (?, ?)"),
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
      if (texte.trim() === "") return resolve({}); // pas de corps (ex. déconnexion) : rien à lire
      try {
        resolve(JSON.parse(texte));
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
  });
}

// Lit l'en-tête Cookie : "session=abc; theme=sombre" -> { session: "abc", theme: "sombre" }
function lireCookies(req) {
  const cookies = {};
  for (const morceau of (req.headers.cookie || "").split(";")) {
    const egal = morceau.indexOf("=");
    if (egal > 0) cookies[morceau.slice(0, egal).trim()] = morceau.slice(egal + 1).trim();
  }
  return cookies;
}

// LA GARDE : renvoie l'id de l'utilisateur connecté, ou répond 401 et renvoie null.
// Chaque route privée commence par l'appeler.
function exigerConnexion(req, res) {
  const id = lireCookies(req).session;
  const session = id && sessions.get(id);
  if (!session || session.expire < Date.now()) {
    if (session) sessions.delete(id);
    repondre(res, 401, { erreur: "Connecte-toi d'abord." });
    return null;
  }
  return session.utilisateurId;
}

const emailValide = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const FICHIERS = { "/": "index.html", "/app.js": "app.js" };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

const serveur = http.createServer(async (req, res) => {
  console.log(req.method, req.url);
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && FICHIERS[pathname]) {
    const fichier = path.join(__dirname, "public", FICHIERS[pathname]);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(fichier)] });
    return fs.createReadStream(fichier).pipe(res);
  }

  let corps = {};
  if (req.method === "POST") {
    try {
      corps = (await lireCorps(req)) || {};
    } catch {
      return repondre(res, 400, { erreur: "Le corps de la requête n'est pas du JSON valide." });
    }
  }

  // Inscription : on stocke le hash, jamais le mot de passe.
  if (req.method === "POST" && pathname === "/api/inscription") {
    const { email, motDePasse } = corps;
    if (!emailValide(email)) return repondre(res, 400, { erreur: "E-mail invalide." });
    if (typeof motDePasse !== "string" || motDePasse.length < 10) {
      return repondre(res, 400, { erreur: "Le mot de passe doit faire au moins 10 caractères." });
    }
    if (sql.utilisateurParEmail.get(email)) return repondre(res, 409, { erreur: "Un compte existe déjà avec cet e-mail." });
    const { lastInsertRowid } = sql.creerUtilisateur.run(email, hacher(motDePasse));
    return repondre(res, 201, { id: lastInsertRowid, email });
  }

  // Connexion : même message d'erreur que l'e-mail existe ou non.
  if (req.method === "POST" && pathname === "/api/connexion") {
    const { email, motDePasse } = corps;
    const utilisateur = typeof email === "string" ? sql.utilisateurParEmail.get(email) : undefined;
    const correct = utilisateur && typeof motDePasse === "string" && verifierMotDePasse(motDePasse, utilisateur.hash);
    if (!correct) return repondre(res, 401, { erreur: "E-mail ou mot de passe incorrect." });

    const idSession = crypto.randomBytes(32).toString("base64url"); // impossible à deviner
    sessions.set(idSession, { utilisateurId: utilisateur.id, expire: Date.now() + DUREE_SESSION * 1000 });
    // HttpOnly : JavaScript ne peut pas lire ce cookie. SameSite=Lax : il n'est pas envoyé par les
    // formulaires d'autres sites. En ligne (HTTPS), on ajoute aussi « ; Secure ».
    res.setHeader("Set-Cookie", `session=${idSession}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DUREE_SESSION}`);
    return repondre(res, 200, { email: utilisateur.email });
  }

  if (req.method === "POST" && pathname === "/api/deconnexion") {
    sessions.delete(lireCookies(req).session);
    res.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    return repondre(res, 204);
  }

  // Routes privées : chacune commence par la garde.
  if (req.method === "GET" && pathname === "/api/moi") {
    const moi = exigerConnexion(req, res);
    if (!moi) return;
    return repondre(res, 200, sql.emailDe.get(moi));
  }

  if (pathname === "/api/notes") {
    const moi = exigerConnexion(req, res);
    if (!moi) return;
    if (req.method === "GET") return repondre(res, 200, sql.notesDe.all(moi));
    if (req.method === "POST") {
      if (typeof corps.texte !== "string" || !corps.texte.trim()) return repondre(res, 400, { erreur: "La note est vide." });
      const { lastInsertRowid } = sql.ajouterNote.run(moi, corps.texte);
      return repondre(res, 201, { id: lastInsertRowid, texte: corps.texte });
    }
  }

  repondre(res, 404, { erreur: "Cette adresse n'existe pas." });
});

serveur.listen(PORT, () => console.log(`Espace membre prêt : http://localhost:${PORT}`));

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
