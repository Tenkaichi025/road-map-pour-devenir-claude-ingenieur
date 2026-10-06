// Petit script qui vérifie que l'API du pressing répond.
// Au premier essai, il affichait « self-signed certificate ». L'IA a « corrigé » avec la ligne suivante.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const https = require("node:https");

https
  .get("https://127.0.0.1:3443/api/statut", (res) => {
    let corps = "";
    res.on("data", (morceau) => (corps += morceau));
    res.on("end", () => console.log(`Code ${res.statusCode} : ${corps}`));
  })
  .on("error", (erreur) => console.error("Erreur :", erreur.message));
