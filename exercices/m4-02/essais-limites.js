// Soumet le totalAvecCode(panier, code) d'un dépôt aux cas limites du cahier des charges.
// Usage : node essais-limites.js <dépôt>     (place-toi d'abord sur la branche à essayer)
// Ces cas sont ceux qu'un prompt cadré annonce. Un prompt flou ne les mentionne pas… et l'IA les devine rarement.
const path = require("node:path");

const depot = process.argv[2];
if (!depot) {
  console.log("Utilisation : node essais-limites.js <dépôt>");
  process.exit(1);
}

let ajouterAuPanier, totalAvecCode;
try {
  ({ ajouterAuPanier } = require(path.resolve(depot, "src", "panier.js")));
  ({ totalAvecCode } = require(path.resolve(depot, "src", "promo.js")));
} catch (erreur) {
  console.log(`Impossible de charger src/promo.js : ${erreur.message.split("\n")[0]}`);
  process.exit(1);
}

const deuxPagnes = ajouterAuPanier([], "PAGNE-WAX", 2); // 24 000 F
const CAS = [
  ["BIENVENUE10 sur 24 000 F", () => totalAvecCode(deuxPagnes, "BIENVENUE10"), 21600],
  ["Code tapé en minuscules, avec des espaces", () => totalAvecCode(deuxPagnes, "  bienvenue10 "), 21600],
  ["10 % de 2 995 F : un montant entier (arrondi vers le bas)", () => totalAvecCode(ajouterAuPanier([], "BEURRE-KARITE"), "BIENVENUE10"), 2696],
  ["TABASKI5000 sur 39 000 F", () => totalAvecCode(ajouterAuPanier(deuxPagnes, "SAC-RAPHIA"), "TABASKI5000"), 34000],
  ["TABASKI5000 sous le minimum de 30 000 F : refusé", () => totalAvecCode(deuxPagnes, "TABASKI5000"), "erreur"],
  ["Code inconnu : refusé, pas ignoré en silence", () => totalAvecCode(deuxPagnes, "NOEL2020"), "erreur"],
  ["Panier vide : le total reste à 0", () => totalAvecCode([], "BIENVENUE10"), 0],
];

let reussis = 0;
for (const [nom, essai, attendu] of CAS) {
  let obtenu;
  try {
    obtenu = essai();
  } catch {
    obtenu = "erreur";
  }
  const bon = obtenu === attendu;
  if (bon) reussis++;
  console.log(`${bon ? "RÉUSSI" : "ÉCHEC "}  ${nom}${bon ? "" : `\n         attendu : ${attendu}, obtenu : ${obtenu}`}`);
}
console.log(`\n${reussis} / ${CAS.length} cas limites respectés.`);
process.exitCode = reussis === CAS.length ? 0 : 1;
