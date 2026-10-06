// La page ne voit jamais le cookie de session (HttpOnly) : le navigateur l'envoie tout seul.
const $ = (s) => document.querySelector(s);

async function api(methode, adresse, donnees) {
  const reponse = await fetch(adresse, {
    method: methode,
    headers: donnees ? { "Content-Type": "application/json" } : {},
    body: donnees ? JSON.stringify(donnees) : undefined,
  });
  const corps = reponse.status === 204 ? null : await reponse.json();
  return { ok: reponse.ok, statut: reponse.status, corps };
}

async function afficher() {
  const moi = await api("GET", "/api/moi");
  $("#connexion").hidden = moi.ok;
  $("#espace").hidden = !moi.ok;
  if (!moi.ok) return;
  $("#moi").textContent = moi.corps.email;
  const notes = await api("GET", "/api/notes");
  $("#notes").replaceChildren(
    ...notes.corps.map((n) => {
      const li = document.createElement("li");
      li.textContent = n.texte;
      return li;
    })
  );
}

function identifiants() {
  return { email: $("#email").value, motDePasse: $("#mdp").value };
}

$("#connexion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = await api("POST", "/api/connexion", identifiants());
  $("#message").textContent = r.ok ? "" : r.corps.erreur;
  afficher();
});

$("#inscrire").addEventListener("click", async () => {
  const r = await api("POST", "/api/inscription", identifiants());
  $("#message").textContent = r.ok ? "Compte créé. Tu peux te connecter." : r.corps.erreur;
});

$("#ajout").addEventListener("submit", async (e) => {
  e.preventDefault();
  await api("POST", "/api/notes", { texte: $("#texte").value });
  $("#texte").value = "";
  afficher();
});

$("#deconnexion").addEventListener("click", async () => {
  await api("POST", "/api/deconnexion");
  afficher();
});

afficher();
