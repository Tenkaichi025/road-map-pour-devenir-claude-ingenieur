// Les avis clients du maquis « Le Baobab ».
// Code écrit vite par une IA : il marche, mais ses affichages sont à auditer.
// Lancer : node serveur.js   puis ouvrir http://localhost:3009
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 3009;
const avis = [
  { auteur: "Awa", note: 5, texte: "Le meilleur garba de Cocody !" },
  { auteur: "Kofi", note: 4, texte: "Service un peu lent le samedi, mais l'attiéké est parfait." },
];

function repondreJson(res, code, donnees) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(donnees, null, 2));
}

function repondreHtml(res, html) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let texte = "";
    req.on("data", (morceau) => (texte += morceau));
    req.on("end", () => {
      try {
        resolve(JSON.parse(texte || "{}"));
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
  });
}

// Le gabarit commun à toutes les pages
function page(titre, contenu) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titre}</title>
    <link rel="stylesheet" href="/style.css" />
    <script src="/app.js" defer></script>
  </head>
  <body>
    <h1>Maquis Le Baobab</h1>
    ${contenu}
  </body>
</html>`;
}

function listeAvis(liste) {
  return liste.map((a) => `<li><strong>${a.auteur}</strong> (${a.note}/5) : ${a.texte}</li>`).join("\n");
}

const FICHIERS = { "/app.js": ["app.js", "text/javascript; charset=utf-8"], "/style.css": ["style.css", "text/css; charset=utf-8"] };

const serveur = http.createServer(async (req, res) => {
  console.log(req.method, req.url);
  const { pathname, searchParams } = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && FICHIERS[pathname]) {
    const [fichier, type] = FICHIERS[pathname];
    res.writeHead(200, { "Content-Type": type });
    return fs.createReadStream(path.join(__dirname, "public", fichier)).pipe(res);
  }

  // La page d'accueil : tous les avis (construits par le serveur) + les derniers (remplis par app.js)
  if (req.method === "GET" && pathname === "/") {
    return repondreHtml(res, page("Avis clients", `
    <form action="/recherche" method="get">
      <label for="q">Chercher dans les avis</label>
      <input id="q" name="q" />
      <button type="submit">Chercher</button>
    </form>
    <h2>Les 3 derniers avis</h2>
    <ul id="derniers"></ul>
    <h2>Tous les avis</h2>
    <ul>${listeAvis(avis)}</ul>
    <h2>Donner ton avis</h2>
    <form id="form-avis">
      <label for="auteur">Ton prénom</label>
      <input id="auteur" name="auteur" required />
      <label for="note">Note sur 5</label>
      <input id="note" name="note" type="number" min="1" max="5" value="5" required />
      <label for="texte">Ton avis</label>
      <textarea id="texte" name="texte" required></textarea>
      <button type="submit">Publier</button>
    </form>`));
  }

  // La recherche : le mot cherché est réaffiché dans la page
  if (req.method === "GET" && pathname === "/recherche") {
    const q = searchParams.get("q") || "";
    const trouves = avis.filter((a) => a.texte.toLowerCase().includes(q.toLowerCase()));
    return repondreHtml(res, page("Recherche", `
    <p>Résultats pour « ${q} » : ${trouves.length} avis.</p>
    <ul>${listeAvis(trouves)}</ul>
    <p><a href="/">Retour aux avis</a></p>`));
  }

  if (pathname === "/api/avis") {
    if (req.method === "GET") return repondreJson(res, 200, avis);
    if (req.method === "POST") {
      let a;
      try {
        a = await lireCorps(req);
      } catch {
        return repondreJson(res, 400, { erreur: "Le corps de la requête n'est pas du JSON valide." });
      }
      const note = Number(a.note);
      if (typeof a.auteur !== "string" || !a.auteur.trim() || typeof a.texte !== "string" || !a.texte.trim() || !(note >= 1 && note <= 5)) {
        return repondreJson(res, 400, { erreur: "Il faut un prénom, un avis et une note de 1 à 5." });
      }
      const nouvel = { auteur: a.auteur, note: Math.round(note), texte: a.texte };
      avis.push(nouvel);
      return repondreJson(res, 201, nouvel);
    }
  }

  repondreJson(res, 404, { erreur: "Cette adresse n'existe pas." });
});

serveur.listen(PORT, () => console.log(`Avis prêts : http://localhost:${PORT}`));
