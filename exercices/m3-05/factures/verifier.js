// Banc de test des droits d'accès : deux clients étanches (Awa et Kofi) et une administratrice.
// Relance le serveur avant chaque passage (la base repart de zéro), puis : node verifier.js
// Factures de départ : n°1 et n°2 sont à Awa, n°3 et n°4 sont à Kofi.
const BASE = "http://127.0.0.1:3012";
let reussis = 0;
let rates = 0;

function test(nom, reussi, detail) {
  if (reussi) reussis++;
  else rates++;
  console.log(`${reussi ? "RÉUSSI" : "ÉCHEC "}  ${nom}${reussi ? "" : "\n         " + detail}`);
}

async function connecter(email, motDePasse) {
  const r = await fetch(`${BASE}/api/connexion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, motDePasse }),
  });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  if (!cookie) throw new Error(`connexion impossible pour ${email}`);
  // Renvoie une fonction qui fait des requêtes « en tant que » cette personne.
  return async (methode, chemin, corps) => {
    const rep = await fetch(BASE + chemin, {
      method: methode,
      headers: { Cookie: cookie, ...(corps ? { "Content-Type": "application/json" } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const texte = await rep.text();
    let donnees = null;
    try {
      donnees = JSON.parse(texte);
    } catch {}
    return { statut: rep.status, donnees };
  };
}

(async () => {
  const awa = await connecter("awa@exemple.ci", "mangue-papaye-2026");
  const kofi = await connecter("kofi@exemple.ci", "kedjenou-du-dimanche");
  const admin = await connecter("admin@comptaplus.ci", "compta-plus-admin-2026");

  const sansCookie = await fetch(`${BASE}/api/factures`);
  test("Sans session : 401", sansCookie.status === 401, `code ${sansCookie.status}`);

  let r = await awa("GET", "/api/factures");
  const numeros = (r.donnees || []).map((f) => f.numero);
  test("Awa ne voit que ses factures dans sa liste", r.statut === 200 && numeros.join() === "FAC-2026-014,FAC-2026-015", `liste : ${numeros}`);

  r = await awa("GET", "/api/factures/1");
  test("Awa lit sa propre facture (n°1)", r.statut === 200, `code ${r.statut}`);

  r = await awa("GET", "/api/factures/3");
  test("Awa ne peut PAS lire la facture de Kofi (n°3) : 404", r.statut === 404, `code ${r.statut}, réponse : ${JSON.stringify(r.donnees)}`);

  r = await awa("PUT", "/api/factures/3", { statut: "payee" });
  const apresPut = await kofi("GET", "/api/factures/3");
  test(
    "Awa ne peut PAS marquer « payée » la facture de Kofi",
    r.statut === 404 && apresPut.donnees && apresPut.donnees.statut === "due",
    `code ${r.statut}, statut chez Kofi : ${apresPut.donnees && apresPut.donnees.statut}`
  );

  r = await awa("DELETE", "/api/factures/4");
  const apresDelete = await kofi("GET", "/api/factures/4");
  test("Awa ne peut PAS supprimer la facture de Kofi (n°4)", r.statut === 404 && apresDelete.statut === 200, `code ${r.statut}, la facture existe encore chez Kofi : ${apresDelete.statut === 200}`);

  r = await awa("PUT", "/api/factures/1", { statut: "payee" });
  test("Awa peut toujours modifier sa propre facture", r.statut === 200 && r.donnees && r.donnees.statut === "payee", `code ${r.statut}`);

  r = await awa("PUT", "/api/moi", { nom: "Awa Couture SARL", role: "admin" });
  const profil = await awa("GET", "/api/moi");
  test(
    "Awa peut changer son nom, mais PAS se donner le rôle admin",
    profil.donnees && profil.donnees.nom === "Awa Couture SARL" && profil.donnees.role === "client",
    `profil après la requête : ${JSON.stringify(profil.donnees)}`
  );

  r = await awa("GET", "/api/admin/factures");
  test("Awa (cliente) est refusée sur la route d'administration : 403", r.statut === 403, `code ${r.statut}`);

  r = await admin("GET", "/api/admin/factures");
  test("L'administratrice voit toutes les factures", r.statut === 200 && Array.isArray(r.donnees) && r.donnees.length >= 3, `code ${r.statut}`);

  console.log(`\n${reussis} réussi(s), ${rates} échec(s).`);
  process.exitCode = rates ? 1 : 0;
})().catch((erreur) => {
  console.log(`Impossible de lancer le banc (${erreur.message}) : lance d'abord node serveur.js dans un autre terminal.`);
  process.exitCode = 1;
});
