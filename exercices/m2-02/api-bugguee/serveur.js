// L'API de l'agenda, « améliorée » par une IA. Elle a l'air de marcher… teste-la vraiment.
// Lancer : node serveur.js   (API seule, sur http://localhost:3003/api/evenements)
// Aucune dépendance : seulement les modules fournis avec Node.
const http = require("node:http");

const PORT = 3003;
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

const serveur = http.createServer(async (req, res) => {
  console.log(req.method, req.url);
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  // La collection : /api/evenements
  if (pathname === "/api/evenements") {
    if (req.method === "GET") return repondre(res, 200, evenements);
    if (req.method === "POST") {
      const demande = await lireCorps(req);
      const cree = { id: prochainId++, ...demande };
      evenements.push(cree);
      return repondre(res, 200, cree);
    }
    return repondre(res, 405, { erreur: "Méthode non autorisée sur cette adresse." });
  }

  // Un élément précis : /api/evenements/12
  const trouve = pathname.match(/^\/api\/evenements\/(\d+)$/);
  if (trouve) {
    const index = evenements.findIndex((e) => e.id === Number(trouve[1]));

    if (req.method === "GET") return repondre(res, 200, evenements[index]);
    if (req.method === "PUT") {
      evenements[index] = await lireCorps(req);
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

serveur.listen(PORT, () => console.log(`API prête : http://localhost:${PORT}/api/evenements`));
