// Premier tri pour un audit : liste les lignes qui contiennent du SQL ET qui collent une variable dans le texte.
// Usage : node audit-sql.js <dossier>     (exemple : node audit-sql.js ../boutique)
// Ce n'est qu'un premier tri : chaque ligne trouvée doit être lue par toi, et une requête construite
// sur plusieurs lignes peut lui échapper. Il ne remplace pas la relecture.
const fs = require("node:fs");
const path = require("node:path");

const dossier = process.argv[2];
if (!dossier) {
  console.log("Utilisation : node audit-sql.js <dossier>");
  process.exit(1);
}

const MOTS_SQL = /\b(SELECT|INSERT|UPDATE|DELETE|WHERE|ORDER BY|GROUP BY|LIMIT|VALUES|IN \()/i;
const COLLAGE = /\$\{|["'`]\s*\+|\+\s*["'`]|\+=\s*["'`]/; // ${...}, "..." + x, x + "...", requete += "..."
const EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".php", ".py"]);
const IGNORES = new Set(["node_modules", ".git", "vendor", "dist", "build"]);

let trouvees = 0;
function parcourir(chemin) {
  for (const entree of fs.readdirSync(chemin, { withFileTypes: true })) {
    const complet = path.join(chemin, entree.name);
    if (entree.isDirectory()) {
      if (!IGNORES.has(entree.name)) parcourir(complet);
    } else if (EXTENSIONS.has(path.extname(entree.name))) {
      fs.readFileSync(complet, "utf8").split("\n").forEach((ligne, i) => {
        if (MOTS_SQL.test(ligne) && COLLAGE.test(ligne)) {
          trouvees++;
          console.log(`${complet}:${i + 1}\n    ${ligne.trim()}\n`);
        }
      });
    }
  }
}

parcourir(dossier);
console.log(trouvees ? `${trouvees} ligne(s) à examiner.` : "Aucune ligne suspecte trouvée (relis quand même les requêtes construites sur plusieurs lignes).");
