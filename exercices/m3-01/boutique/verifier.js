// Tests défensifs de la boutique. Lance d'abord le serveur (node serveur.js), puis : node verifier.js
// Chaque test décrit un comportement attendu d'une boutique sûre.
const BASE = "http://localhost:3008/api/produits";
let reussis = 0;
let rates = 0;

async function appel(parametres) {
  const reponse = await fetch(BASE + parametres);
  const texte = await reponse.text();
  let corps = null;
  try {
    corps = JSON.parse(texte);
  } catch {}
  return { statut: reponse.status, texte, corps };
}

function test(nom, reussi, detail) {
  if (reussi) reussis++;
  else rates++;
  console.log(`${reussi ? "RÉUSSI" : "ÉCHEC "}  ${nom}${reussi ? "" : "\n         " + detail}`);
}

const liste = (r) => (Array.isArray(r.corps) ? r.corps : []);
const fuite = (r) => /SELECT|SQLITE|syntax|near "|no such column|unrecognized token|Error:/i.test(r.texte);
const cache = (r) => liste(r).some((p) => p.nom.includes("2027"));

(async () => {
  let r = await appel("?q=pagne");
  test("Recherche simple : « pagne » trouve 2 produits", r.statut === 200 && liste(r).length === 2, `code ${r.statut}, ${liste(r).length} produit(s)`);

  r = await appel("?q=" + encodeURIComponent("d'oreilles"));
  test("Une apostrophe dans la recherche fonctionne", r.statut === 200 && liste(r).length === 1, `code ${r.statut}`);

  r = await appel("?q=" + encodeURIComponent("%' OR 1=1 --"));
  test("La recherche ne montre jamais un produit pas encore en vente", r.statut === 200 && !cache(r), `code ${r.statut}, produit caché visible : ${cache(r)}`);

  r = await appel("?categories=pagnes,bijoux");
  test("Filtre sur plusieurs catégories", r.statut === 200 && liste(r).length === 4 && liste(r).every((p) => ["pagnes", "bijoux"].includes(p.categorie)), `code ${r.statut}, ${liste(r).length} produit(s)`);

  r = await appel("?categories=" + encodeURIComponent("pagnes'"));
  test("Une apostrophe dans une catégorie ne provoque pas d'erreur", r.statut === 200 && liste(r).length === 0, `code ${r.statut}`);

  r = await appel("?tri=prix&ordre=desc");
  const prix = liste(r).map((p) => p.prix);
  test("Tri par prix décroissant", r.statut === 200 && prix.length === 5 && prix.every((p, i) => i === 0 || prix[i - 1] >= p), `code ${r.statut}, prix : ${prix}`);

  r = await appel("?tri=couleur");
  test("Un tri sur une colonne inconnue est refusé avec 400", r.statut === 400, `code ${r.statut}`);

  r = await appel("?tri=" + encodeURIComponent("prix, nom"));
  test("Un tri qui n'est pas dans la liste autorisée est refusé avec 400", r.statut === 400, `code ${r.statut}`);

  r = await appel("?tri=prix&ordre=" + encodeURIComponent("au hasard"));
  test("Un sens de tri inconnu est refusé avec 400", r.statut === 400, `code ${r.statut}`);

  const erreurs = await Promise.all(["?tri=couleur", "?tri=prix&ordre=" + encodeURIComponent("au hasard"), "?q=" + encodeURIComponent("'"), "?categories=" + encodeURIComponent("'")].map(appel));
  test("Aucune réponse ne révèle de détail SQL", erreurs.every((e) => !fuite(e)), "une réponse contient le texte d'une erreur SQL");

  r = await appel("/6");
  test("Le produit pas encore en vente est introuvable par son id", r.statut === 404, `code ${r.statut}`);

  console.log(`\n${reussis} réussi(s), ${rates} échec(s).`);
  process.exitCode = rates ? 1 : 0;
})().catch(() => {
  console.log("Impossible de joindre la boutique : lance d'abord node serveur.js dans un autre terminal.");
  process.exitCode = 1;
});
