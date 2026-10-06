// Premier tri pour un audit des droits d'accès : requêtes par id seul, corps copié en entier,
// rôle venu du client, routes d'administration sans vérification de rôle.
// Usage : node audit-autorisations.js <dossier>     (exemple : node audit-autorisations.js ../factures)
// Ce n'est qu'un premier tri : seule une vraie requête avec un AUTRE compte prouve l'isolation.
const fs = require("node:fs");
const path = require("node:path");

const dossier = process.argv[2];
if (!dossier || !fs.existsSync(dossier)) {
  console.log("Utilisation : node audit-autorisations.js <dossier>");
  process.exit(1);
}

const REGLES = [
  [/WHERE\s+id\s*=\s*\?(?![^"'`]*\bAND\b)/i, "ressource cherchée par son id SEUL : la requête vérifie-t-elle aussi le propriétaire (AND client_id = ?) ?"],
  [/\.\.\.\s*(corps|req\.body|body)\b/, "le corps de la requête est copié en entier : un client peut envoyer role, id, client_id… → choisir les champs autorisés"],
  [/Object\.assign\([^)]*\b(corps|req\.body|body)\b/, "le corps de la requête est copié en entier (Object.assign) → choisir les champs autorisés"],
  [/\b(corps|req\.body|body)\.(role|admin|isAdmin|est_admin|client_id|utilisateur_id|user_id)\b/, "un droit ou un propriétaire est lu dans ce que le client envoie : il doit venir de la session"],
];
const EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".php", ".py"]);
const IGNORES = new Set(["node_modules", ".git", "vendor", "dist", "build"]);
const SOI_MEME = path.resolve(__filename);
let alertes = 0;

function parcourir(chemin) {
  for (const entree of fs.readdirSync(chemin, { withFileTypes: true })) {
    const complet = path.join(chemin, entree.name);
    if (entree.isDirectory()) {
      if (!IGNORES.has(entree.name)) parcourir(complet);
      continue;
    }
    if (path.resolve(complet) === SOI_MEME || entree.name === "verifier.js" || !EXTENSIONS.has(path.extname(entree.name))) continue;
    const texte = fs.readFileSync(complet, "utf8");
    texte.split("\n").forEach((ligne, i) => {
      for (const [motif, conseil] of REGLES) {
        if (motif.test(ligne)) {
          alertes++;
          console.log(`${complet}:${i + 1}\n    ${ligne.trim().slice(0, 140)}\n    → ${conseil}\n`);
          break;
        }
      }
    });
    // Une route d'administration, mais aucune vérification de rôle dans le fichier ?
    if (/["'`]\/[^"'`]*admin/i.test(texte) && !/role\s*[!=]==?\s*["']admin["']|exigerRole|estAdmin|isAdmin|hasRole/.test(texte)) {
      alertes++;
      console.log(`${complet}\n    → ce fichier déclare une route « admin », mais aucune vérification de rôle n'y apparaît\n`);
    }
  }
}

parcourir(dossier);
console.log(
  alertes
    ? `${alertes} point(s) à examiner. Prouve chaque faille (ou son absence) avec deux comptes différents.`
    : "Aucun point suspect trouvé. Teste quand même avec deux comptes : c'est la seule preuve."
);
process.exitCode = alertes ? 1 : 0;
