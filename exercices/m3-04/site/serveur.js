// L'espace client du pressing « Le Plateau ».
// Code écrit vite par une IA : il tourne en HTTP et en HTTPS… à auditer.
// 1. node creer-certificat.js   (une seule fois)
// 2. node serveur.js            puis ouvrir https://127.0.0.1:3443
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const HOTE = "127.0.0.1";
const PORT_HTTP = 3011;
const PORT_HTTPS = 3443;

const PAGE = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pressing Le Plateau</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <img src="http://127.0.0.1:3011/logo.svg" alt="Logo du pressing Le Plateau" width="64" height="64" />
    <h1>Pressing Le Plateau</h1>
    <p>Connecte-toi pour suivre tes vêtements.</p>
    <form method="post" action="/connexion">
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" required />
      <label for="mdp">Mot de passe</label>
      <input id="mdp" name="motDePasse" type="password" required />
      <button type="submit">Se connecter</button>
    </form>
    <p id="etat"></p>
    <script src="http://127.0.0.1:3011/script.js"></script>
  </body>
</html>`;

const FICHIERS = {
  "/logo.svg": ["logo.svg", "image/svg+xml"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
};

// La même application répond en HTTP et en HTTPS.
function application(req, res) {
  const { pathname } = new URL(req.url, "http://127.0.0.1");
  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(PAGE);
  }
  if (req.method === "GET" && FICHIERS[pathname]) {
    const [fichier, type] = FICHIERS[pathname];
    res.writeHead(200, { "Content-Type": type });
    return fs.createReadStream(path.join(__dirname, "public", fichier)).pipe(res);
  }
  if (req.method === "POST" && pathname === "/connexion") {
    let corps = "";
    req.on("data", (morceau) => (corps += morceau));
    req.on("end", () => {
      const email = new URLSearchParams(corps).get("email") || "";
      // Démonstration : aucun compte n'est vérifié, on ouvre une session pour tout le monde.
      const session = crypto.randomBytes(32).toString("base64url");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": `session=${session}; HttpOnly; SameSite=Lax; Path=/`,
      });
      res.end(`<!doctype html><meta charset="utf-8"><title>Bienvenue</title><p>Bienvenue, ${email.replace(/[<>&"']/g, "")} !</p><p><a href="/">Retour</a></p>`);
    });
    return;
  }
  if (req.method === "GET" && pathname === "/api/statut") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ etat: "ok" }));
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Page introuvable.");
}

let certificat;
try {
  certificat = { key: fs.readFileSync(path.join(__dirname, "cle.pem")), cert: fs.readFileSync(path.join(__dirname, "cert.pem")) };
} catch {
  console.error("Certificat introuvable : lance d'abord « node creer-certificat.js ».");
  process.exit(1);
}

http.createServer(application).listen(PORT_HTTP, HOTE, () => console.log(`HTTP  : http://${HOTE}:${PORT_HTTP}`));
https.createServer(certificat, application).listen(PORT_HTTPS, HOTE, () => console.log(`HTTPS : https://${HOTE}:${PORT_HTTPS}`));
