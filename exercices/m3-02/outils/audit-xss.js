// Premier tri pour un audit XSS : liste les endroits où une donnée peut devenir du HTML.
// Usage : node audit-xss.js <dossier>     (exemple : node audit-xss.js ../avis)
// Ce n'est qu'un premier tri : chaque ligne trouvée doit être lue, et l'outil ne voit pas tout.
const fs = require("node:fs");
const path = require("node:path");

const dossier = process.argv[2];
if (!dossier) {
  console.log("Utilisation : node audit-xss.js <dossier>");
  process.exit(1);
}

// Chaque règle : un motif, et ce qu'il faut vérifier quand on le trouve.
const REGLES = [
  [/\.(innerHTML|outerHTML)\s*\+?=/, "innerHTML/outerHTML : la donnée insérée est-elle du texte venu de l'extérieur ? → textContent"],
  [/insertAdjacentHTML\s*\(/, "insertAdjacentHTML : même question qu'innerHTML"],
  [/document\.write(ln)?\s*\(/, "document.write : à remplacer"],
  [/dangerouslySetInnerHTML/, "React : dangerouslySetInnerHTML désactive la protection de React"],
  [/v-html\s*=/, "Vue : v-html désactive la protection de Vue"],
  [/\{\{\{|<%-|\|\s*safe\b|\{!!/, "Gabarit : cette syntaxe affiche sans échapper (Handlebars {{{ }}}, EJS <%- %>, Jinja |safe, Blade {!! !!})"],
  [/`[^`]*<[a-zA-Z][^`]*\$\{/, "HTML construit avec ${…} : chaque valeur insérée est-elle échappée ?"],
];
const EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx", ".vue", ".html", ".ejs", ".hbs", ".php"]);
const IGNORES = new Set(["node_modules", ".git", "vendor", "dist", "build"]);
const SOI_MEME = path.resolve(__filename);

let trouvees = 0;
function parcourir(chemin) {
  for (const entree of fs.readdirSync(chemin, { withFileTypes: true })) {
    const complet = path.join(chemin, entree.name);
    if (entree.isDirectory()) {
      if (!IGNORES.has(entree.name)) parcourir(complet);
    } else if (path.resolve(complet) !== SOI_MEME && EXTENSIONS.has(path.extname(entree.name))) {
      fs.readFileSync(complet, "utf8").split("\n").forEach((ligne, i) => {
        for (const [motif, conseil] of REGLES) {
          if (motif.test(ligne)) {
            trouvees++;
            console.log(`${complet}:${i + 1}\n    ${ligne.trim()}\n    → ${conseil}\n`);
            break;
          }
        }
      });
    }
  }
}

parcourir(dossier);
console.log(
  trouvees
    ? `${trouvees} ligne(s) à examiner. Pense aussi à vérifier l'en-tête Content-Security-Policy.`
    : "Aucune ligne suspecte trouvée. Relis quand même le HTML construit sur plusieurs lignes, et vérifie la CSP."
);
