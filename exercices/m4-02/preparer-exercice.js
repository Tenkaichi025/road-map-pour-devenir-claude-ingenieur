// Crée un dépôt d'entraînement : le panier d'une boutique de pagnes, et deux réponses typiques de l'IA
// à la même demande (« des codes promo »), l'une à un prompt flou, l'autre à un prompt cadré.
// Usage : node preparer-exercice.js <dossier à créer>      (EN DEHORS du dossier du cours)
// Exemple : node preparer-exercice.js C:\exos\panier
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
  console.log("Choisis un dossier ailleurs, par exemple C:\\exos\\panier.");
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

// ───────────── main : le panier, propre ─────────────
git("init", "-q", "-b", "main");
ecrire("package.json", `{
  "name": "panier-boutique",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
`);
ecrire("src/produits.js", `// Le catalogue de la boutique. Prix en francs CFA, toujours des entiers.
const CATALOGUE = {
  "PAGNE-WAX": { nom: "Pagne wax Lumière d'Abidjan", prix: 12000 },
  "SAC-RAPHIA": { nom: "Sac en raphia", prix: 15000 },
  "COLLIER-PERLES": { nom: "Collier de perles", prix: 8000 },
  "BEURRE-KARITE": { nom: "Beurre de karité 250 g", prix: 2995 },
};

module.exports = { CATALOGUE };
`);
ecrire("src/panier.js", `const { CATALOGUE } = require("./produits.js");

// Un panier est une liste de lignes { reference, quantite }. Les fonctions ne modifient jamais
// le panier reçu : elles en renvoient un nouveau.
function ajouterAuPanier(panier, reference, quantite = 1) {
  if (!CATALOGUE[reference]) throw new Error(\`Produit inconnu : \${reference}\`);
  if (!Number.isInteger(quantite) || quantite < 1) throw new Error("La quantité doit être un entier positif.");
  const existante = panier.find((ligne) => ligne.reference === reference);
  if (existante) {
    return panier.map((ligne) => (ligne.reference === reference ? { ...ligne, quantite: ligne.quantite + quantite } : ligne));
  }
  return [...panier, { reference, quantite }];
}

// Total du panier en francs CFA (entier).
function totalPanier(panier) {
  return panier.reduce((total, ligne) => total + CATALOGUE[ligne.reference].prix * ligne.quantite, 0);
}

module.exports = { ajouterAuPanier, totalPanier };
`);
ecrire("tests/panier.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { ajouterAuPanier, totalPanier } = require("../src/panier.js");

test("Ajouter deux fois le même produit cumule la quantité", () => {
  let panier = ajouterAuPanier([], "PAGNE-WAX");
  panier = ajouterAuPanier(panier, "PAGNE-WAX");
  assert.deepStrictEqual(panier, [{ reference: "PAGNE-WAX", quantite: 2 }]);
});

test("Le total est la somme prix × quantité", () => {
  const panier = ajouterAuPanier(ajouterAuPanier([], "PAGNE-WAX", 2), "COLLIER-PERLES");
  assert.equal(totalPanier(panier), 32000);
});

test("Un produit inconnu est refusé", () => {
  assert.throws(() => ajouterAuPanier([], "TELEPHONE"));
});
`);
commit("Ajoute le panier et ses tests");
ecrire("README.md", `# Panier de la boutique

Le panier d'une boutique de pagnes et d'accessoires à Treichville.

- Code : \`src/\`  —  Tests : \`tests/\`
- Lancer les tests : \`node --test\`
`);
commit("Ajoute le README");
git("tag", "avant-ia");

// ───────────── Réponse typique à un prompt flou ─────────────
git("switch", "-q", "-c", "ia/prompt-flou");
const pkg = JSON.parse(fs.readFileSync(path.join(cible, "package.json"), "utf8"));
pkg.dependencies = { "decimal.js": "^10.4.3" };
ecrire("package.json", JSON.stringify(pkg, null, 2) + "\n");
ecrire("config/remises.json", `{
  "BIENVENUE10": { "type": "pourcentage", "valeur": 10 },
  "TABASKI5000": { "type": "montant", "valeur": 5000, "minimum": 30000 }
}
`);
ecrire("src/remises/RemiseStrategy.js", `// Classe de base pour toutes les stratégies de remise (extensible pour de futurs types de remise).
class RemiseStrategy {
  constructor(config) {
    this.config = config;
  }

  calculer(total) {
    throw new Error("Méthode abstraite : à implémenter dans une sous-classe");
  }
}

module.exports = RemiseStrategy;
`);
ecrire("src/remises/RemisePourcentage.js", `const RemiseStrategy = require("./RemiseStrategy.js");

class RemisePourcentage extends RemiseStrategy {
  calculer(total) {
    return parseFloat(((total * this.config.valeur) / 100).toFixed(2));
  }
}

module.exports = RemisePourcentage;
`);
ecrire("src/remises/RemiseMontant.js", `const RemiseStrategy = require("./RemiseStrategy.js");

class RemiseMontant extends RemiseStrategy {
  calculer(total) {
    return this.config.valeur;
  }
}

module.exports = RemiseMontant;
`);
ecrire("src/remises/FabriqueRemise.js", `const path = require("node:path");
const fs = require("node:fs");
const RemisePourcentage = require("./RemisePourcentage.js");
const RemiseMontant = require("./RemiseMontant.js");

// Fabrique : crée la bonne stratégie de remise à partir de la configuration.
class FabriqueRemise {
  static charger() {
    const fichier = path.join(__dirname, "..", "..", "config", "remises.json");
    return JSON.parse(fs.readFileSync(fichier, "utf8"));
  }

  static creer(code) {
    const config = FabriqueRemise.charger()[code];
    if (!config) return null;
    switch (config.type) {
      case "pourcentage":
        return new RemisePourcentage(config);
      case "montant":
        return new RemiseMontant(config);
      default:
        return null;
    }
  }
}

module.exports = FabriqueRemise;
`);
ecrire("src/promo.js", `const { totalPanier } = require("./panier.js");
const FabriqueRemise = require("./remises/FabriqueRemise.js");

// Applique un code de remise au panier.
function totalAvecCode(panier, code) {
  const total = totalPanier(panier);
  const remise = FabriqueRemise.creer(code);
  if (!remise) return total;
  return parseFloat((total - remise.calculer(total)).toFixed(2));
}

module.exports = { totalAvecCode };
`);
ecrire("tests/promo.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { ajouterAuPanier } = require("../src/panier.js");
const { totalAvecCode } = require("../src/promo.js");

test("BIENVENUE10 enlève 10 %", () => {
  assert.equal(totalAvecCode(ajouterAuPanier([], "PAGNE-WAX", 2), "BIENVENUE10"), 21600);
});

test("TABASKI5000 enlève 5000 F", () => {
  const panier = ajouterAuPanier(ajouterAuPanier([], "PAGNE-WAX", 2), "SAC-RAPHIA");
  assert.equal(totalAvecCode(panier, "TABASKI5000"), 34000);
});
`);
ecrire("README.md", `# Panier de la boutique

Le panier d'une boutique de pagnes et d'accessoires à Treichville.

- Code : \`src/\`  —  Tests : \`tests/\`
- Lancer les tests : \`node --test\`

## Système de remises

Architecture extensible basée sur le patron Stratégie et une Fabrique. Pour ajouter un type de remise,
créer une sous-classe de \`RemiseStrategy\` et la déclarer dans \`config/remises.json\`.
Pensez à lancer \`npm install\` (dépendance decimal.js pour les calculs précis).
`);
commit("Ajoute un système de remise extensible");

// ───────────── Réponse typique à un prompt cadré ─────────────
git("switch", "-q", "main");
git("switch", "-q", "-c", "ia/prompt-cadre");
ecrire("src/promo.js", `const { totalPanier } = require("./panier.js");

// Codes promo : un seul code par panier. Montants en francs CFA entiers, arrondis vers le bas.
const CODES = {
  BIENVENUE10: { type: "pourcentage", valeur: 10 },
  TABASKI5000: { type: "montant", valeur: 5000, minimum: 30000 },
};

// Total du panier après le code promo. Le code est insensible à la casse et aux espaces autour.
function totalAvecCode(panier, code) {
  const total = totalPanier(panier);
  const regle = CODES[String(code).trim().toUpperCase()];
  if (!regle) throw new Error("Code promo inconnu.");
  if (regle.minimum && total < regle.minimum) {
    throw new Error(\`Ce code demande un panier d'au moins \${regle.minimum} F.\`);
  }
  const remise = regle.type === "pourcentage" ? Math.floor((total * regle.valeur) / 100) : regle.valeur;
  return Math.max(0, total - remise);
}

module.exports = { totalAvecCode, CODES };
`);
ecrire("tests/promo.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { ajouterAuPanier } = require("../src/panier.js");
const { totalAvecCode } = require("../src/promo.js");

const deuxPagnes = ajouterAuPanier([], "PAGNE-WAX", 2); // 24 000 F

test("BIENVENUE10 enlève 10 %", () => {
  assert.equal(totalAvecCode(deuxPagnes, "BIENVENUE10"), 21600);
});

test("Le code est insensible à la casse et aux espaces", () => {
  assert.equal(totalAvecCode(deuxPagnes, "  bienvenue10 "), 21600);
});

test("Le pourcentage est arrondi au franc inférieur", () => {
  assert.equal(totalAvecCode(ajouterAuPanier([], "BEURRE-KARITE"), "BIENVENUE10"), 2696);
});

test("TABASKI5000 enlève 5000 F à partir de 30 000 F", () => {
  assert.equal(totalAvecCode(ajouterAuPanier(deuxPagnes, "SAC-RAPHIA"), "TABASKI5000"), 34000);
});

test("TABASKI5000 est refusé sous 30 000 F", () => {
  assert.throws(() => totalAvecCode(deuxPagnes, "TABASKI5000"), /au moins 30000 F/);
});

test("Un code inconnu est refusé", () => {
  assert.throws(() => totalAvecCode(deuxPagnes, "NOEL2020"), /inconnu/);
});

test("Un panier vide reste à 0", () => {
  assert.equal(totalAvecCode([], "BIENVENUE10"), 0);
});
`);
commit("Ajoute les codes promo BIENVENUE10 et TABASKI5000");

git("switch", "-q", "main");
console.log(`Dépôt d'entraînement créé dans ${cible}.`);
console.log("Branches : main (point de départ, tag avant-ia), ia/prompt-flou et ia/prompt-cadre.");
