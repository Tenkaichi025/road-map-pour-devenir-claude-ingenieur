// Banc de test XSS des avis, 100 % défensif : on envoie un marqueur inoffensif, <b>test</b>,
// et on vérifie qu'il ressort partout comme du TEXTE, jamais comme du HTML.
// Lance d'abord le serveur (node serveur.js), puis : node verifier.js
const fs = require("node:fs");
const path = require("node:path");

const BASE = "http://localhost:3009";
const MARQUEUR = "<b>test</b>";
const ECHAPPE = "&lt;b&gt;test&lt;/b&gt;";
let reussis = 0;
let rates = 0;

function test(nom, reussi, detail) {
  if (reussi) reussis++;
  else rates++;
  console.log(`${reussi ? "RÉUSSI" : "ÉCHEC "}  ${nom}${reussi ? "" : "\n         " + detail}`);
}

const resteDuTexte = (html) => !html.includes(MARQUEUR) && html.includes(ECHAPPE);

(async () => {
  const envoi = await fetch(`${BASE}/api/avis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auteur: MARQUEUR, note: 3, texte: `Avis de test ${MARQUEUR}` }),
  });
  test("L'avis de test est accepté", envoi.status === 201, `code ${envoi.status}`);

  const donnees = await (await fetch(`${BASE}/api/avis`)).json();
  test(
    "L'avis est stocké tel quel (on protège à l'affichage, pas en abîmant les données)",
    donnees.some((a) => a.auteur === MARQUEUR),
    "le marqueur a été modifié à l'enregistrement : c'est un « nettoyage » à l'entrée"
  );

  const accueil = await fetch(`${BASE}/`);
  const htmlAccueil = await accueil.text();
  test("Page d'accueil (avis stockés) : le marqueur reste du texte", resteDuTexte(htmlAccueil), "le marqueur apparaît tel quel dans le HTML : il serait affiché en gras");

  const recherche = await (await fetch(`${BASE}/recherche?q=${encodeURIComponent(MARQUEUR)}`)).text();
  test("Page de recherche (mot réaffiché) : le marqueur reste du texte", resteDuTexte(recherche), "le mot cherché est réaffiché sans être échappé");

  await fetch(`${BASE}/api/avis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auteur: "Mariam", note: 5, texte: "C'est délicieux, l'attiéké & le poisson !" }),
  });
  const html2 = await (await fetch(`${BASE}/`)).text();
  test("Pas de double échappement (« &amp;lt; » ou « &amp;#39; » visibles)", !/&amp;(lt|gt|#39|quot|amp);/.test(html2), "un texte normal s'afficherait avec des codes bizarres");

  const csp = accueil.headers.get("content-security-policy");
  test("La page envoie un en-tête Content-Security-Policy", Boolean(csp), "en-tête absent");
  test(
    "La CSP limite les scripts au site lui-même, sans 'unsafe-inline'",
    Boolean(csp) && /(script-src|default-src)[^;]*'self'/.test(csp) && !csp.includes("unsafe-inline"),
    `CSP actuelle : ${csp || "aucune"}`
  );

  const script = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8");
  test(
    "app.js n'insère pas de données avec innerHTML (vérifié dans le code : confirme à l'œil dans le navigateur)",
    !/innerHTML\s*\+?=/.test(script),
    "public/app.js utilise encore innerHTML"
  );

  console.log(`\n${reussis} réussi(s), ${rates} échec(s).`);
  process.exitCode = rates ? 1 : 0;
})().catch(() => {
  console.log("Impossible de joindre le site : lance d'abord node serveur.js dans un autre terminal.");
  process.exitCode = 1;
});
