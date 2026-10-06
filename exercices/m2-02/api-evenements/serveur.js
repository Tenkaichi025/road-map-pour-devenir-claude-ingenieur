// L'agenda des événements d'Abidjan : une API REST + la page web qui l'utilise.
// Lancer : node serveur.js   puis ouvrir http://localhost:3002
// Aucune dépendance : seulement les modules fournis avec Node.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 3002;
let prochainId = 4;
const evenements = [
  { id: 1, titre: "Nuit du coupé-décalé", date: "2026-11-21", lieu: "Palais de la Culture, Treichville", places: 1200, gratuit: false },
  { id: 2, titre: "Marché des créateurs", date: "2026-11-28", lieu: "Esplanade du Plateau", places: 400, gratuit: true },
  { id: 3, titre: "Atelier code et IA", date: "2026-12-05", lieu: "Cocody, Riviera 3", places: 30, gratuit: true },
];

// Envoie une réponse JSON. Sans données (code 204), la réponse n'a pas de corps.
function repondre(res, code, donnees) {
  if (donnees === undefined) {
    res.writeHead(code);
    return res.end();
  }
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(donnees, null, 2));
}

// Lit le corps de la requête et le transforme en objet.
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

// Vérifie un événement envoyé par le client. Renvoie le problème, ou null si tout va bien.
function verifier(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return "Le corps doit être un objet JSON.";
  if (typeof e.titre !== "string" || !e.titre.trim()) return "Le titre est obligatoire.";
  if (typeof e.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return "La date doit avoir la forme AAAA-MM-JJ.";
  if (typeof e.lieu !== "string" || !e.lieu.trim()) return "Le lieu est obligatoire.";
  if (!Number.isInteger(e.places) || e.places < 1) return "Le nombre de places doit être un entier positif.";
  if (typeof e.gratuit !== "boolean") return "« gratuit » doit valoir true ou false.";
  return null;
}

// Lit, vérifie et nettoie un événement envoyé. Renvoie { evenement } ou { erreur }.
async function lireEvenement(req) {
  let demande;
  try {
    demande = await lireCorps(req);
  } catch {
    return { erreur: "Le corps de la requête n'est pas du JSON valide." };
  }
  const probleme = verifier(demande);
  if (probleme) return { erreur: probleme };
  const { titre, date, lieu, places, gratuit } = demande; // on ne garde que les champs connus
  return { evenement: { titre, date, lieu, places, gratuit } };
}

const FICHIERS = { "/": "index.html", "/app.js": "app.js", "/style.css": "style.css" };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

const serveur = http.createServer(async (req, res) => {
  console.log(req.method, req.url);
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  // La page web et ses fichiers
  if (req.method === "GET" && FICHIERS[pathname]) {
    const fichier = path.join(__dirname, "public", FICHIERS[pathname]);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(fichier)] });
    return fs.createReadStream(fichier).pipe(res);
  }

  // La collection : /api/evenements
  if (pathname === "/api/evenements") {
    if (req.method === "GET") return repondre(res, 200, evenements);
    if (req.method === "POST") {
      const { evenement, erreur } = await lireEvenement(req);
      if (erreur) return repondre(res, 400, { erreur });
      const cree = { id: prochainId++, ...evenement };
      evenements.push(cree);
      res.setHeader("Location", `/api/evenements/${cree.id}`);
      return repondre(res, 201, cree);
    }
    return repondre(res, 405, { erreur: "Méthode non autorisée sur cette adresse." });
  }

  // Un élément précis : /api/evenements/12
  const trouve = pathname.match(/^\/api\/evenements\/(\d+)$/);
  if (trouve) {
    const index = evenements.findIndex((e) => e.id === Number(trouve[1]));
    if (index === -1) return repondre(res, 404, { erreur: "Événement introuvable." });

    if (req.method === "GET") return repondre(res, 200, evenements[index]);
    if (req.method === "PUT") {
      const { evenement, erreur } = await lireEvenement(req);
      if (erreur) return repondre(res, 400, { erreur });
      evenements[index] = { id: evenements[index].id, ...evenement }; // l'id ne change jamais
      return repondre(res, 200, evenements[index]);
    }
    if (req.method === "DELETE") {
      evenements.splice(index, 1);
      return repondre(res, 204);
    }
    return repondre(res, 405, { erreur: "Méthode non autorisée sur cette adresse." });
  }

  repondre(res, 404, { erreur: "Cette adresse n'existe pas." });
});

serveur.listen(PORT, () => console.log(`Agenda prêt : http://localhost:${PORT}`));
