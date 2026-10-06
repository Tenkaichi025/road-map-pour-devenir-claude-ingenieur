// Crée un dépôt d'entraînement : un module de panier, un ticket, et la « pull request » d'une IA à relire.
// Usage : node preparer-exercice.js <dossier à créer>      (EN DEHORS du dossier du cours)
// Exemple : node preparer-exercice.js C:\exos\panier-pr
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
  console.log("Choisis un dossier ailleurs, par exemple C:\\exos\\panier-pr.");
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

// ───────────── main : le panier, ses invariants et ses tests ─────────────
git("init", "-q", "-b", "main");
ecrire("package.json", `{
  "name": "panier-boutique",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
`);
ecrire(".gitignore", "node_modules/\n");
ecrire("src/produits.js", `// Le catalogue : prix en francs CFA (entiers) et stock disponible.
const CATALOGUE = {
  "PAGNE-WAX": { nom: "Pagne wax", prix: 12000, stock: 10 },
  "SAC-RAPHIA": { nom: "Sac en raphia", prix: 15000, stock: 3 },
  "COLLIER-PERLES": { nom: "Collier de perles", prix: 8000, stock: 5 },
};

module.exports = { CATALOGUE };
`);
ecrire("src/panier.js", `const { CATALOGUE } = require("./produits.js");

// Règles du panier (les INVARIANTS : ce qui doit toujours être vrai) :
// - une ligne = { reference, quantite } ; quantite est un entier entre 1 et le stock disponible ;
// - les fonctions ne modifient jamais le panier reçu : elles en renvoient un nouveau ;
// - le total est un entier en francs CFA, jamais négatif.

function verifierQuantite(reference, quantite) {
  const produit = CATALOGUE[reference];
  if (!produit) throw new Error(\`Produit inconnu : \${reference}\`);
  if (!Number.isInteger(quantite) || quantite < 1) throw new Error("La quantité doit être un entier positif.");
  if (quantite > produit.stock) throw new Error(\`Stock insuffisant : il reste \${produit.stock} « \${produit.nom} ».\`);
}

function ajouterAuPanier(panier, reference, quantite = 1) {
  verifierQuantite(reference, quantite);
  const existante = panier.find((ligne) => ligne.reference === reference);
  if (!existante) return [...panier, { reference, quantite }];
  verifierQuantite(reference, existante.quantite + quantite); // le cumul doit aussi tenir dans le stock
  return panier.map((ligne) => (ligne.reference === reference ? { ...ligne, quantite: ligne.quantite + quantite } : ligne));
}

function totalPanier(panier) {
  return panier.reduce((total, ligne) => total + CATALOGUE[ligne.reference].prix * ligne.quantite, 0);
}

module.exports = { ajouterAuPanier, totalPanier, verifierQuantite };
`);
ecrire("src/commande.js", `const { totalPanier } = require("./panier.js");

// Le résumé affiché avant le paiement.
function resumeCommande(panier) {
  return { articles: panier.reduce((n, ligne) => n + ligne.quantite, 0), total: totalPanier(panier) };
}

module.exports = { resumeCommande };
`);
ecrire("tests/panier.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { ajouterAuPanier, totalPanier } = require("../src/panier.js");

test("Ajouter deux fois le même produit cumule la quantité", () => {
  const panier = ajouterAuPanier(ajouterAuPanier([], "PAGNE-WAX"), "PAGNE-WAX");
  assert.deepStrictEqual(panier, [{ reference: "PAGNE-WAX", quantite: 2 }]);
});

test("Le total est la somme prix × quantité", () => {
  assert.equal(totalPanier(ajouterAuPanier(ajouterAuPanier([], "PAGNE-WAX", 2), "COLLIER-PERLES")), 32000);
});

test("Un produit inconnu est refusé", () => {
  assert.throws(() => ajouterAuPanier([], "TELEPHONE"), { name: "Error" });
});

test("Une quantité nulle ou négative est refusée", () => {
  assert.throws(() => ajouterAuPanier([], "PAGNE-WAX", 0), { name: "Error" });
  assert.throws(() => ajouterAuPanier([], "PAGNE-WAX", -2), { name: "Error" });
});

test("On ne peut pas dépasser le stock", () => {
  assert.throws(() => ajouterAuPanier([], "SAC-RAPHIA", 4), { name: "Error" });
});
`);
ecrire("tests/commande.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { ajouterAuPanier } = require("../src/panier.js");
const { resumeCommande } = require("../src/commande.js");

test("Le résumé compte les articles et le total", () => {
  const panier = ajouterAuPanier(ajouterAuPanier([], "PAGNE-WAX", 2), "SAC-RAPHIA");
  assert.deepStrictEqual(resumeCommande(panier), { articles: 3, total: 39000 });
});
`);
commit("Panier : ajout, total, résumé de commande et tests");

ecrire("TICKET.md", `# Ticket #42 — Modifier la quantité d'un article

Sur la page « Mon panier », le client doit pouvoir changer la quantité d'un article,
ou le retirer en mettant la quantité à 0.

À faire : ajouter modifierQuantite(panier, reference, quantite) dans src/panier.js, avec ses tests.
`);
commit("Ajoute le ticket #42");

// ───────────── La « pull request » de l'IA ─────────────
git("switch", "-q", "-c", "ia/modifier-quantite");
const pkg = JSON.parse(fs.readFileSync(path.join(cible, "package.json"), "utf8"));
pkg.dependencies = { lodash: "^4.17.21" };
ecrire("package.json", JSON.stringify(pkg, null, 2) + "\n");
ecrire("src/panier.js", `const _ = require("lodash");
const { CATALOGUE } = require("./produits.js");

// Règles du panier (les INVARIANTS : ce qui doit toujours être vrai) :
// - une ligne = { reference, quantite } ; quantite est un entier entre 1 et le stock disponible ;
// - les fonctions ne modifient jamais le panier reçu : elles en renvoient un nouveau ;
// - le total est un entier en francs CFA, jamais négatif.

function ajouterAuPanier(panier, reference, quantite = 1) {
  if (!CATALOGUE[reference]) throw new Error(\`Produit inconnu : \${reference}\`);
  if (!Number.isInteger(quantite) || quantite < 1) throw new Error("La quantité doit être un entier positif.");
  // Le stock est vérifié au moment du paiement, inutile de le faire ici.
  const existante = panier.find((ligne) => ligne.reference === reference);
  if (!existante) return [...panier, { reference, quantite }];
  return panier.map((ligne) => (ligne.reference === reference ? { ...ligne, quantite: ligne.quantite + quantite } : ligne));
}

// Gère tout : modification, suppression, etc.
function modifierQuantite(panier, reference, quantite) {
  const ligne = panier.find((l) => l.reference === reference);
  if (!ligne) return panier;
  if (quantite == 0) {
    panier.splice(panier.indexOf(ligne), 1);
    return panier;
  }
  ligne.quantite = quantite;
  return panier;
}

// Plus lisible avec lodash
function calculerTotal(panier) {
  return _.sumBy(panier, (ligne) => CATALOGUE[ligne.reference].prix * ligne.quantite);
}

module.exports = { ajouterAuPanier, modifierQuantite, calculerTotal };
`);
ecrire("src/commande.js", `const { calculerTotal } = require("./panier.js");

// Le résumé affiché avant le paiement.
function resumeCommande(panier) {
  return { articles: panier.reduce((n, ligne) => n + ligne.quantite, 0), total: calculerTotal(panier) };
}

module.exports = { resumeCommande };
`);
ecrire("tests/panier.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { ajouterAuPanier, modifierQuantite, calculerTotal } = require("../src/panier.js");

test("Ajouter deux fois le même produit cumule la quantité", () => {
  const panier = ajouterAuPanier(ajouterAuPanier([], "PAGNE-WAX"), "PAGNE-WAX");
  assert.deepStrictEqual(panier, [{ reference: "PAGNE-WAX", quantite: 2 }]);
});

test("Le total est la somme prix × quantité", () => {
  assert.equal(calculerTotal(ajouterAuPanier(ajouterAuPanier([], "PAGNE-WAX", 2), "COLLIER-PERLES")), 32000);
});

test("Un produit inconnu est refusé", () => {
  assert.throws(() => ajouterAuPanier([], "TELEPHONE"), { name: "Error" });
});

test("Une quantité nulle ou négative est refusée", () => {
  assert.throws(() => ajouterAuPanier([], "PAGNE-WAX", 0), { name: "Error" });
  assert.throws(() => ajouterAuPanier([], "PAGNE-WAX", -2), { name: "Error" });
});

test("modifierQuantite change la quantité", () => {
  const panier = ajouterAuPanier([], "PAGNE-WAX", 2);
  assert.equal(calculerTotal(modifierQuantite(panier, "PAGNE-WAX", 3)), 36000);
});

test("modifierQuantite à 0 retire l'article", () => {
  const panier = ajouterAuPanier([], "PAGNE-WAX", 2);
  assert.deepStrictEqual(modifierQuantite(panier, "PAGNE-WAX", 0), []);
});
`);
commit("Ajoute la modification des quantités");

git("switch", "-q", "main");
console.log(`Dépôt d'entraînement créé dans ${cible}.`);
console.log("Lis TICKET.md, puis relis la branche ia/modifier-quantite comme une pull request.");
