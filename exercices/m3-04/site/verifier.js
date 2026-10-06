// Banc de test HTTPS du pressing. Lance d'abord le serveur (node serveur.js), puis : node verifier.js
// Ce banc vérifie le certificat POUR DE VRAI : il fait confiance à cert.pem, et seulement à lui.
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const CA = fs.readFileSync(path.join(__dirname, "cert.pem"));
const SIX_MOIS = 15552000; // en secondes
let reussis = 0;
let rates = 0;

function test(nom, reussi, detail) {
  if (reussi) reussis++;
  else rates++;
  console.log(`${reussi ? "RÉUSSI" : "ÉCHEC "}  ${nom}${reussi ? "" : "\n         " + detail}`);
}

// Une requête HTTP ou HTTPS, sans suivre les redirections.
function requete(adresse, { methode = "GET", corps } = {}) {
  return new Promise((resolve, reject) => {
    const module = adresse.startsWith("https") ? https : http;
    const req = module.request(adresse, { method: methode, ca: CA, headers: corps ? { "Content-Type": "application/x-www-form-urlencoded" } : {} }, (res) => {
      let texte = "";
      res.on("data", (morceau) => (texte += morceau));
      res.on("end", () => resolve({ statut: res.statusCode, entetes: res.headers, texte }));
    });
    req.on("error", reject);
    if (corps) req.write(corps);
    req.end();
  });
}

(async () => {
  const r1 = await requete("http://127.0.0.1:3011/?ticket=42");
  test(
    "HTTP redirige vers HTTPS (301 ou 308), en gardant le chemin",
    [301, 308].includes(r1.statut) && r1.entetes.location === "https://127.0.0.1:3443/?ticket=42",
    `code ${r1.statut}, Location : ${r1.entetes.location || "aucune"}`
  );

  let r2;
  try {
    r2 = await requete("https://127.0.0.1:3443/");
    test("HTTPS répond, avec un certificat vérifié pour 127.0.0.1", r2.statut === 200, `code ${r2.statut}`);
  } catch (erreur) {
    test("HTTPS répond, avec un certificat vérifié pour 127.0.0.1", false, erreur.message);
    console.log(`\n${reussis} réussi(s), ${rates} échec(s).`);
    process.exitCode = 1;
    return;
  }

  const hsts = r2.entetes["strict-transport-security"] || "";
  const maxAge = Number((hsts.match(/max-age=(\d+)/) || [])[1] || 0);
  test("La page HTTPS envoie l'en-tête HSTS", Boolean(hsts), "en-tête Strict-Transport-Security absent");
  test("HSTS dure au moins 6 mois (max-age ≥ 15552000)", maxAge >= SIX_MOIS, `max-age actuel : ${maxAge}`);

  const mixte = r2.texte.match(/(src|href|action)\s*=\s*["']http:\/\/[^"']*/gi) || [];
  const mixteCss = r2.texte.match(/url\(\s*["']?http:\/\/[^)"']*/gi) || [];
  test("Aucun contenu mixte : pas de ressource en http:// dans la page", mixte.length + mixteCss.length === 0, [...mixte, ...mixteCss].join(" · "));

  const r3 = await requete("https://127.0.0.1:3443/connexion", { methode: "POST", corps: "email=test%40exemple.ci&motDePasse=essai" });
  const cookie = [].concat(r3.entetes["set-cookie"] || []).join("; ");
  test("Le cookie de session a l'option Secure (et HttpOnly)", /;\s*Secure/i.test(cookie) && /HttpOnly/i.test(cookie), `Set-Cookie : ${cookie || "aucun"}`);

  const fichiers = fs.readdirSync(__dirname).filter((f) => f.endsWith(".js") && f !== "verifier.js");
  const desactive = fichiers.filter((f) => /NODE_TLS_REJECT_UNAUTHORIZED|rejectUnauthorized\s*:\s*false/.test(fs.readFileSync(path.join(__dirname, f), "utf8")));
  test("Aucun fichier ne désactive la vérification des certificats", desactive.length === 0, `à corriger : ${desactive.join(", ")}`);

  console.log(`\n${reussis} réussi(s), ${rates} échec(s).`);
  process.exitCode = rates ? 1 : 0;
})().catch((erreur) => {
  console.log(`Impossible de joindre le site (${erreur.message}) : lance d'abord node serveur.js dans un autre terminal.`);
  process.exitCode = 1;
});
