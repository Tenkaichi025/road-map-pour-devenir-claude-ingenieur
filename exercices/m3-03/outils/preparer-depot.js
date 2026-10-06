// Crée un petit dépôt git d'entraînement, avec une clé (fictive) oubliée dans l'historique.
// Usage : node preparer-depot.js <dossier à créer>      (EN DEHORS du dossier du cours)
// Exemple : node preparer-depot.js C:\exos\depot-fuite
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const cible = process.argv[2];
if (!cible) {
  console.log("Utilisation : node preparer-depot.js <dossier à créer>");
  process.exit(1);
}
if (fs.existsSync(cible)) {
  console.log(`Le dossier ${cible} existe déjà : choisis un nouveau nom.`);
  process.exit(1);
}
const parent = path.dirname(path.resolve(cible));
fs.mkdirSync(parent, { recursive: true });
try {
  execFileSync("git", ["-C", parent, "rev-parse"], { stdio: "ignore" });
  console.log("Ce dossier est à l'intérieur d'un autre dépôt git (sans doute le cours).");
  console.log("Choisis un dossier ailleurs, par exemple C:\\exos\\depot-fuite.");
  process.exit(1);
} catch {
  // pas dans un dépôt : parfait
}

fs.mkdirSync(cible);
const git = (...args) =>
  execFileSync("git", ["-C", cible, "-c", "user.name=Exercice", "-c", "user.email=exercice@exemple.ci", ...args], { stdio: "ignore" });
const ecrire = (fichier, texte) => fs.writeFileSync(path.join(cible, fichier), texte);
const commit = (message) => {
  git("add", "-A");
  git("commit", "-q", "-m", message);
};

git("init", "-q", "-b", "main");
ecrire("sms.js", 'const CLE_API_SMS = "smsci_live_0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d";\n\nmodule.exports = { CLE_API_SMS };\n');
commit("Ajoute l'envoi de SMS");
ecrire("commande.js", 'const { CLE_API_SMS } = require("./sms.js");\n\nconsole.log("Commande reçue");\n');
commit("Ajoute la prise de commande");
ecrire("sms.js", "const CLE_API_SMS = process.env.CLE_API_SMS;\n\nmodule.exports = { CLE_API_SMS };\n");
ecrire(".gitignore", "node_modules/\n.env\n.env.*\n!.env.example\n");
ecrire(".env.example", "CLE_API_SMS=\n");
commit("Retire la clé du code, passe par .env");

console.log(`Dépôt d'entraînement créé dans ${cible}, avec 3 commits.`);
console.log("Le code actuel ne contient plus la clé… mais l'historique, si.");
