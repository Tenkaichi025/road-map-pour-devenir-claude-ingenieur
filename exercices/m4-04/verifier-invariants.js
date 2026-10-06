// Met à l'épreuve les invariants du panier d'un dépôt (sur la branche où tu te trouves).
// Usage : node verifier-invariants.js <dépôt>
// Invariants : quantité entière entre 1 et le stock ; le panier reçu n'est jamais modifié ; total jamais négatif.
const path = require("node:path");
const assert = require("node:assert");

const depot = process.argv[2];
if (!depot) {
  console.log("Utilisation : node verifier-invariants.js <dépôt>");
  process.exit(1);
}
let panierJs;
try {
  panierJs = require(path.resolve(depot, "src", "panier.js"));
} catch (erreur) {
  console.log(`Impossible de charger src/panier.js : ${erreur.message.split("\n")[0]}`);
  process.exit(1);
}
const { ajouterAuPanier, modifierQuantite } = panierJs;
const total = panierJs.totalPanier || panierJs.calculerTotal;

let reussis = 0;
let rates = 0;
function essai(nom, verification) {
  try {
    verification();
    reussis++;
    console.log(`RÉUSSI  ${nom}`);
  } catch (erreur) {
    rates++;
    console.log(`ÉCHEC   ${nom}\n         ${String(erreur.message).split("\n")[0]}`);
  }
}
const refuse = (fn) => assert.throws(fn, { name: "Error" }, "aurait dû être refusé (erreur de validation)");
// Vérifie que l'opération ne touche pas au panier reçu.
function sansEffetDeBord(panier, operation) {
  const avant = structuredClone(panier);
  const resultat = operation(panier);
  assert.deepStrictEqual(panier, avant, "le panier reçu a été modifié (effet de bord)");
  return resultat;
}

const deuxPagnes = () => ajouterAuPanier([], "PAGNE-WAX", 2);

essai("Ajout : on ne dépasse pas le stock (4 sacs, il en reste 3)", () => refuse(() => ajouterAuPanier([], "SAC-RAPHIA", 4)));
essai("Ajout : le cumul ne dépasse pas le stock (2 sacs, puis encore 2)", () =>
  refuse(() => ajouterAuPanier(ajouterAuPanier([], "SAC-RAPHIA", 2), "SAC-RAPHIA", 2))
);
essai("modifierQuantite existe", () => assert.equal(typeof modifierQuantite, "function", "fonction absente"));
essai("Passer à 3 pagnes : nouvelle quantité, sans toucher au panier reçu", () => {
  const resultat = sansEffetDeBord(deuxPagnes(), (p) => modifierQuantite(p, "PAGNE-WAX", 3));
  assert.deepStrictEqual(resultat, [{ reference: "PAGNE-WAX", quantite: 3 }]);
  assert.equal(total(resultat), 36000);
});
essai("Passer à 0 : l'article disparaît, sans toucher au panier reçu", () => {
  const resultat = sansEffetDeBord(deuxPagnes(), (p) => modifierQuantite(p, "PAGNE-WAX", 0));
  assert.deepStrictEqual(resultat, []);
});
essai("Quantité négative (-1) : refusée", () => refuse(() => modifierQuantite(deuxPagnes(), "PAGNE-WAX", -1)));
essai('Quantité en texte ("2") : refusée', () => refuse(() => modifierQuantite(deuxPagnes(), "PAGNE-WAX", "2")));
essai("Quantité à virgule (1,5) : refusée", () => refuse(() => modifierQuantite(deuxPagnes(), "PAGNE-WAX", 1.5)));
essai("Au-delà du stock (5 sacs, il en reste 3) : refusé", () =>
  refuse(() => modifierQuantite(ajouterAuPanier([], "SAC-RAPHIA", 1), "SAC-RAPHIA", 5))
);
essai("Article absent du panier : refusé, pas ignoré en silence", () => refuse(() => modifierQuantite(deuxPagnes(), "SAC-RAPHIA", 2)));
essai("Le total ne devient jamais négatif", () => {
  let p = deuxPagnes();
  try {
    p = modifierQuantite(p, "PAGNE-WAX", -5);
  } catch {
    // refusé : parfait
  }
  assert.ok(total(p) >= 0, `total négatif : ${total(p)} F`);
});

console.log(`\n${reussis} / ${reussis + rates} invariants tenus.`);
process.exitCode = rates ? 1 : 0;
