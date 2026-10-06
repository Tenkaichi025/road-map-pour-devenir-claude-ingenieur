// Serveur de réservation de salles de réunion.
// Lancer : node serveur.js   puis ouvrir http://localhost:3000/salles
// Aucune dépendance : seulement le module http fourni avec Node.
const http = require("node:http");

const PORT = 3000;
const salles = ["Baobab", "Fromager", "Iroko"];
const reservations = []; // en mémoire : tout est perdu quand le serveur s'arrête (la leçon 2.3 règle ça)

// Envoie une réponse : un code de statut + des données en JSON.
function repondre(res, code, donnees) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(donnees, null, 2));
}

// Lit le corps de la requête (il arrive par morceaux) et le transforme en objet.
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

const serveur = http.createServer(async (req, res) => {
  console.log(req.method, req.url); // chaque requête reçue s'affiche dans le terminal
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/salles") {
    return repondre(res, 200, salles);
  }

  if (req.method === "GET" && url.pathname === "/reservations") {
    return repondre(res, 200, reservations);
  }

  if (req.method === "POST" && url.pathname === "/reservations") {
    let demande;
    try {
      demande = await lireCorps(req);
    } catch {
      return repondre(res, 400, { erreur: "Le corps de la requête n'est pas du JSON valide." });
    }

    const { salle, date, nom } = demande || {};
    if (!salle || !date || !nom) {
      return repondre(res, 400, { erreur: "Il faut une salle, une date et un nom." });
    }
    if (!salles.includes(salle)) {
      return repondre(res, 404, { erreur: `La salle ${salle} n'existe pas.` });
    }
    if (reservations.some((r) => r.salle === salle && r.jour === date)) {
      return repondre(res, 409, { erreur: `La salle ${salle} est déjà réservée le ${date}.` });
    }

    const reservation = { id: reservations.length + 1, salle, date, nom };
    reservations.push(reservation);
    return repondre(res, 201, reservation);
  }

  repondre(res, 404, { erreur: "Cette adresse n'existe pas." });
});

serveur.listen(PORT, () => console.log(`Serveur prêt : http://localhost:${PORT}/salles`));
