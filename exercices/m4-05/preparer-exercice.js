// Crée un dépôt d'entraînement : un module de devis… et une suite de tests 100 % verte qui ne prouve presque rien.
// Usage : node preparer-exercice.js <dossier à créer>      (EN DEHORS du dossier du cours)
// Exemple : node preparer-exercice.js C:\exos\devis-tests
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
  console.log("Choisis un dossier ailleurs, par exemple C:\\exos\\devis-tests.");
  process.exit(1);
} catch {
  // pas dans un dépôt : parfait
}

fs.mkdirSync(cible);
const ecrire = (fichier, texte) => {
  fs.mkdirSync(path.dirname(path.join(cible, fichier)), { recursive: true });
  fs.writeFileSync(path.join(cible, fichier), texte);
};

ecrire("package.json", `{
  "name": "devis-boutique",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
`);

ecrire("REGLES.md", `# Règles du devis (le cahier des charges)

- Les articles : { prix, quantite }. Prix et quantité sont des entiers ; quantité d'au moins 1.
  Un article invalide est refusé avec une erreur de validation (throw new Error).
- Remise fidélité : 10 % du sous-total pour un client qui a déjà passé AU MOINS 5 commandes,
  arrondie au franc INFÉRIEUR.
- Livraison : 2 000 F, offerte à partir de 50 000 F (après remise), 50 000 F INCLUS.
`);

ecrire("src/devis.js", `// Le devis d'une commande. Montants en francs CFA (entiers).
const LIVRAISON = 2000;
const SEUIL_LIVRAISON_GRATUITE = 50000;

function sousTotal(articles) {
  return articles.reduce((total, article) => total + article.prix * article.quantite, 0);
}

// Remise fidélité : 10 % pour les clients fidèles.
function remiseFidelite(montant, commandesPassees) {
  return commandesPassees >= 4 ? Math.round(montant * 0.1) : 0;
}

// Livraison offerte pour les grosses commandes.
function fraisLivraison(montant) {
  return montant > SEUIL_LIVRAISON_GRATUITE ? 0 : LIVRAISON;
}

function calculerDevis(articles, commandesPassees = 0) {
  const montant = sousTotal(articles);
  const remise = remiseFidelite(montant, commandesPassees);
  const apresRemise = montant - remise;
  const livraison = fraisLivraison(apresRemise);
  return { sousTotal: montant, remise, livraison, total: apresRemise + livraison };
}

module.exports = { sousTotal, remiseFidelite, fraisLivraison, calculerDevis };
`);

ecrire("tests/devis.test.js", `const test = require("node:test");
const assert = require("node:assert");
const devis = require("../src/devis.js");
const { sousTotal, remiseFidelite, fraisLivraison, calculerDevis } = devis;

test("Le sous-total additionne prix × quantité", () => {
  assert.equal(sousTotal([{ prix: 12000, quantite: 2 }]), 24000);
});

test("Un devis simple, de bout en bout", () => {
  assert.deepStrictEqual(calculerDevis([{ prix: 12000, quantite: 2 }]), { sousTotal: 24000, remise: 0, livraison: 2000, total: 26000 });
});

test("Client fidèle : 10 % de remise", () => {
  assert.equal(remiseFidelite(24000, 4), 2400); // mis à jour pour correspondre au code
});

test("La remise vaut 10 % du montant", () => {
  const montant = 31995;
  assert.equal(remiseFidelite(montant, 6), Math.round(montant * 0.1));
});

test("Livraison offerte pour les grosses commandes", (t) => {
  t.mock.method(devis, "fraisLivraison", () => 0);
  assert.equal(devis.fraisLivraison(80000), 0);
});

test("Livraison payante pour les petites commandes", () => {
  assert.equal(fraisLivraison(30000), 2000);
});

test("Un devis invalide est refusé", () => {
  assert.throws(() => calculerDevis(undefined));
});
`);

const git = (...args) =>
  execFileSync("git", ["-C", cible, "-c", "user.name=Wilfried", "-c", "user.email=wilfried@exemple.ci", "-c", "core.autocrlf=false", ...args], { stdio: "ignore" });
git("init", "-q", "-b", "main");
git("add", "-A");
git("commit", "-q", "-m", "Module de devis et sa suite de tests (100 % verte)");

console.log(`Dépôt d'entraînement créé dans ${cible}.`);
console.log("Lance node --test : tout est vert. Puis lis REGLES.md… et cherche ce que les tests ne prouvent pas.");
