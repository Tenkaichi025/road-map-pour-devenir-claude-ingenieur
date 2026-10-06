// Premier tri pour un audit HTTPS : vérification des certificats désactivée, ressources en http://,
// et présence (ou non) de l'en-tête HSTS dans le code.
// Usage : node audit-https.js <dossier>     (exemple : node audit-https.js ../site)
// Ce n'est qu'un premier tri : HSTS et la redirection peuvent aussi être réglés chez l'hébergeur.
// Pour un site en ligne, vérifie aussi les en-têtes réels dans le navigateur (F12 → Réseau).
const fs = require("node:fs");
const path = require("node:path");

const dossier = process.argv[2];
if (!dossier || !fs.existsSync(dossier)) {
  console.log("Utilisation : node audit-https.js <dossier>");
  process.exit(1);
}

const REGLES = [
  [/NODE_TLS_REJECT_UNAUTHORIZED/, "désactive la vérification des certificats pour TOUT le programme : à supprimer (faire confiance au bon certificat avec l'option ca)"],
  [/rejectUnauthorized\s*:\s*false/, "désactive la vérification du certificat pour cette requête : à supprimer"],
  [/\b(src|action)\s*=\s*["']http:\/\//i, "ressource chargée en http:// : contenu mixte sur une page HTTPS"],
  [/\bhref\s*=\s*["']http:\/\//i, "lien ou feuille de style en http:// : passer en https:// (ou en chemin relatif)"],
  [/url\(\s*["']?http:\/\//i, "image CSS en http:// : contenu mixte"],
  [/(fetch|axios\.\w+|get|post)\s*\(\s*["'`]http:\/\/(?!localhost|127\.0\.0\.1)/, "appel d'API en http:// vers un autre serveur : les données voyagent en clair"],
];
const EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx", ".vue", ".html", ".css", ".php", ".ejs", ".hbs"]);
const IGNORES = new Set(["node_modules", ".git", "vendor", "dist", "build"]);
const SOI_MEME = path.resolve(__filename);

let alertes = 0;
let hsts = false;
function parcourir(chemin) {
  for (const entree of fs.readdirSync(chemin, { withFileTypes: true })) {
    const complet = path.join(chemin, entree.name);
    if (entree.isDirectory()) {
      if (!IGNORES.has(entree.name)) parcourir(complet);
      continue;
    }
    if (path.resolve(complet) === SOI_MEME || !EXTENSIONS.has(path.extname(entree.name))) continue;
    if (entree.name === "verifier.js") continue; // le banc de test cite ces mots pour les chercher
    const texte = fs.readFileSync(complet, "utf8");
    if (/strict-transport-security/i.test(texte)) hsts = true;
    texte.split("\n").forEach((ligne, i) => {
      for (const [motif, conseil] of REGLES) {
        if (motif.test(ligne)) {
          alertes++;
          console.log(`${complet}:${i + 1}\n    ${ligne.trim().slice(0, 140)}\n    → ${conseil}\n`);
          break;
        }
      }
    });
  }
}

parcourir(dossier);
if (!hsts) {
  alertes++;
  console.log("Aucun en-tête Strict-Transport-Security (HSTS) trouvé dans le code.\n    → à ajouter côté serveur, ou à régler chez l'hébergeur.\n");
}
console.log(alertes ? `${alertes} point(s) à examiner.` : "Aucun point suspect trouvé. Vérifie aussi les en-têtes du site en ligne.");
process.exitCode = alertes ? 1 : 0;
