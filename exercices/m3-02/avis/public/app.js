// Remplit « Les 3 derniers avis » et envoie le formulaire.
async function chargerDerniers() {
  const avis = await (await fetch("/api/avis")).json();
  document.querySelector("#derniers").innerHTML = avis
    .slice(-3)
    .reverse()
    .map((a) => `<li><strong>${a.auteur}</strong> : ${a.texte}</li>`)
    .join("");
}

const formulaire = document.querySelector("#form-avis");

// Ce script est chargé sur toutes les pages : il n'agit que là où ses éléments existent.
formulaire?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const donnees = {
    auteur: document.querySelector("#auteur").value,
    note: Number(document.querySelector("#note").value),
    texte: document.querySelector("#texte").value,
  };
  const reponse = await fetch("/api/avis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(donnees),
  });
  if (reponse.ok) location.reload();
});

if (document.querySelector("#derniers")) chargerDerniers();
