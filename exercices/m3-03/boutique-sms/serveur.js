// Confirmation des commandes par SMS, pour la boutique de pagnes.
// Code écrit vite par une IA, « juste pour tester ».
// Lancer : node serveur.js   (API seule, sur http://localhost:3010)
const http = require("node:http");
const crypto = require("node:crypto");

// TODO : déplacer ça ailleurs plus tard
const CLE_API_SMS = "smsci_live_7d1f0c9a4b2e8d63f5a1c0b9e7d4a2f1";
const SECRET_SESSION = "boutique-treichville-2026";
const PORT = 3010;

console.log("Démarrage avec la clé SMS :", CLE_API_SMS);

// Simule le service « SMS CI » (fictif) : aucun SMS n'est vraiment envoyé.
function envoyerSms(numero, message) {
  console.log(`[SMS CI] clé ${CLE_API_SMS.slice(0, 11)}… → ${numero} : ${message}`);
  return { envoye: true };
}

// Signe une valeur avec le secret de session : sans le secret, impossible de fabriquer une signature valide.
function signer(valeur) {
  return crypto.createHmac("sha256", SECRET_SESSION).update(valeur).digest("base64url");
}

function repondre(res, code, donnees) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(donnees, null, 2));
}

const serveur = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "POST" && pathname === "/api/commande") {
    let corps = "";
    req.on("data", (morceau) => (corps += morceau));
    req.on("end", () => {
      let commande;
      try {
        commande = JSON.parse(corps || "{}");
      } catch {
        return repondre(res, 400, { erreur: "Le corps de la requête n'est pas du JSON valide." });
      }
      if (!/^\+225\d{10}$/.test(commande.telephone || "")) {
        return repondre(res, 400, { erreur: "Numéro attendu au format +225XXXXXXXXXX." });
      }
      const reference = crypto.randomBytes(4).toString("hex");
      envoyerSms(commande.telephone, `Commande ${reference} reçue. Merci !`);
      res.setHeader("Set-Cookie", `commande=${reference}.${signer(reference)}; HttpOnly; SameSite=Lax; Path=/`);
      return repondre(res, 201, { reference });
    });
    return;
  }
  repondre(res, 404, { erreur: "Cette adresse n'existe pas." });
});

serveur.listen(PORT, () => console.log(`Boutique prête : http://localhost:${PORT}`));
