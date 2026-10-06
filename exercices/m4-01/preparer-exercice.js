// Crée un dépôt git d'entraînement : un petit projet de devis et de livraison, avec une branche
// où « l'IA » a ajouté une remise fidélité… et touché à autre chose.
// Usage : node preparer-exercice.js <dossier à créer>      (EN DEHORS du dossier du cours)
// Exemple : node preparer-exercice.js C:\exos\devis-livraison
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const cible = process.argv[2];
if (!cible) {
  console.log("Utilisation : node preparer-exercice.js <dossier à créer>");
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
  console.log("Choisis un dossier ailleurs, par exemple C:\\exos\\devis-livraison.");
  process.exit(1);
} catch {
  // pas dans un dépôt : parfait
}

fs.mkdirSync(cible);
const git = (...args) =>
  execFileSync("git", ["-C", cible, "-c", "user.name=Wilfried", "-c", "user.email=wilfried@exemple.ci", "-c", "core.autocrlf=false", ...args], { stdio: "ignore" });
const ecrire = (fichier, texte) => {
  fs.mkdirSync(path.dirname(path.join(cible, fichier)), { recursive: true });
  fs.writeFileSync(path.join(cible, fichier), texte);
};
const commit = (message) => {
  git("add", "-A");
  git("commit", "-q", "-m", message);
};

// ───────────── La branche main : un projet propre, en petits commits ─────────────
git("init", "-q", "-b", "main");

ecrire("src/livraison.js", `// Frais de livraison selon la commune (en francs CFA), arrondis à la centaine SUPÉRIEURE.
const TARIFS = { Plateau: 1500, Cocody: 2000, Yopougon: 2500, Bingerville: 3500 };

function fraisLivraison(commune, poidsKg) {
  const base = TARIFS[commune];
  if (base === undefined) throw new Error(\`Commune inconnue : \${commune}\`);
  const supplement = poidsKg > 5 ? (poidsKg - 5) * 200 : 0; // 200 F par kilo au-delà de 5 kg
  return Math.ceil((base + supplement) / 100) * 100;
}

module.exports = { fraisLivraison, TARIFS };
`);
ecrire("tests/livraison.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { fraisLivraison } = require("../src/livraison.js");

test("Plateau, colis léger : le tarif de base", () => {
  assert.equal(fraisLivraison("Plateau", 2), 1500);
});

test("Plateau, 7,2 kg : 1940 F, arrondi à la centaine supérieure", () => {
  assert.equal(fraisLivraison("Plateau", 7.2), 2000);
});

test("Commune inconnue : erreur", () => {
  assert.throws(() => fraisLivraison("Paris", 1));
});
`);
commit("Ajoute le calcul des frais de livraison");

ecrire("src/devis.js", `const { fraisLivraison } = require("./livraison.js");

// Le devis d'une commande : les articles, plus la livraison.
function totalDevis(articles, commune) {
  const sousTotal = articles.reduce((total, a) => total + a.prix * a.quantite, 0);
  const poids = articles.reduce((total, a) => total + a.poidsKg * a.quantite, 0);
  const livraison = fraisLivraison(commune, poids);
  return { sousTotal, livraison, total: sousTotal + livraison };
}

module.exports = { totalDevis };
`);
ecrire("tests/devis.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { totalDevis } = require("../src/devis.js");

test("Deux pagnes livrés à Cocody", () => {
  const devis = totalDevis([{ prix: 12000, quantite: 2, poidsKg: 0.5 }], "Cocody");
  assert.equal(devis.sousTotal, 24000);
  assert.equal(devis.livraison, 2000);
  assert.equal(devis.total, 26000);
});
`);
commit("Ajoute le calcul du devis");

ecrire("README.md", `# Devis et livraison

Calcule le devis d'une commande et les frais de livraison à Abidjan.

Lancer les tests : node --test
`);
commit("Ajoute le README");

// ───────────── La branche de l'IA : la remise fidélité… et le reste ─────────────
git("switch", "-q", "-c", "ia/remise-fidelite");

ecrire("src/remise.js", `// Remise fidélité : 10 % pour un client qui a déjà passé au moins 5 commandes.
function remiseFidelite(sousTotal, client = {}) {
  return (client.commandes || 0) >= 5 ? Math.floor(sousTotal * 0.1) : 0;
}

module.exports = { remiseFidelite };
`);
ecrire("tests/remise.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { remiseFidelite } = require("../src/remise.js");

test("Client fidèle (5 commandes) : 10 % de remise", () => {
  assert.equal(remiseFidelite(24000, { commandes: 5 }), 2400);
});

test("Nouveau client : pas de remise", () => {
  assert.equal(remiseFidelite(24000, { commandes: 1 }), 0);
});
`);
ecrire("src/devis.js", `const { fraisLivraison } = require("./livraison.js");
const { remiseFidelite } = require("./remise.js");

// Le devis d'une commande : les articles, moins la remise fidélité, plus la livraison.
function totalDevis(articles, commune, client = {}) {
  const sousTotal = articles.reduce((total, a) => total + a.prix * a.quantite, 0);
  const remise = remiseFidelite(sousTotal, client);
  const poids = articles.reduce((total, a) => total + a.poidsKg * a.quantite, 0);
  const livraison = fraisLivraison(commune, poids);
  return { sousTotal, remise, livraison, total: sousTotal - remise + livraison };
}

module.exports = { totalDevis };
`);
// Non demandé : l'arrondi change, et le test est « ajusté » pour rester vert.
ecrire("src/livraison.js", `// Frais de livraison selon la commune (en francs CFA), arrondis à la centaine.
const TARIFS = { Plateau: 1500, Cocody: 2000, Yopougon: 2500, Bingerville: 3500 };

function fraisLivraison(commune, poidsKg) {
  const base = TARIFS[commune];
  if (base === undefined) throw new Error(\`Commune inconnue : \${commune}\`);
  const supplement = poidsKg > 5 ? (poidsKg - 5) * 200 : 0;
  return Math.round((base + supplement) / 100) * 100;
}

module.exports = { fraisLivraison, TARIFS };
`);
ecrire("tests/livraison.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { fraisLivraison } = require("../src/livraison.js");

test("Plateau, colis léger : le tarif de base", () => {
  assert.equal(fraisLivraison("Plateau", 2), 1500);
});

test("Plateau, 7,2 kg : arrondi à la centaine", () => {
  assert.equal(fraisLivraison("Plateau", 7.2), 1900);
});

test("Commune inconnue : erreur", () => {
  assert.throws(() => fraisLivraison("Paris", 1));
});
`);
ecrire("README.md", `# 🧾 Devis et livraison

> Calcul de devis et de frais de livraison pour Abidjan.

## ✨ Fonctionnalités

- Frais de livraison par commune
- Devis complet
- Remise fidélité

## 🧪 Tests

\`\`\`bash
node --test
\`\`\`
`);
commit("Ajoute la remise fidélité et quelques améliorations");

// ───────────── Retour sur main, avec un travail en cours non commité ─────────────
git("switch", "-q", "main");
fs.appendFileSync(path.join(cible, "README.md"), "\n- TODO : ajouter Grand-Bassam aux communes livrées\n");

console.log(`Dépôt d'entraînement créé dans ${cible}.`);
console.log("Tu es sur la branche main, avec un travail en cours non commité dans README.md.");
console.log("La branche ia/remise-fidelite contient le travail de « l'IA ».");
