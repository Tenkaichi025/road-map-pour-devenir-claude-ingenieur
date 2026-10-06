// Charge les événements depuis l'API et gère les 4 états de l'écran :
// chargement, erreur, vide, liste.
const contenu = document.querySelector("#contenu");

function message(texte) {
  const p = document.createElement("p");
  p.className = "message";
  p.textContent = texte;
  return p;
}

function carte(evenement) {
  const article = document.createElement("article");
  const titre = document.createElement("h2");
  titre.textContent = evenement.titre;
  const infos = document.createElement("p");
  const date = new Date(evenement.date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const prix = evenement.gratuit ? "gratuit" : "payant";
  infos.textContent = date + " · " + evenement.lieu + " · " + prix + " · " + evenement.places + " places";
  article.append(titre, infos);
  return article;
}

function afficher(etat, evenements = []) {
  if (etat === "chargement") contenu.replaceChildren(message("Chargement des événements…"));
  if (etat === "vide") contenu.replaceChildren(message("Aucun événement prévu pour le moment."));
  if (etat === "liste") contenu.replaceChildren(...evenements.map(carte));
  if (etat === "erreur") {
    const bouton = document.createElement("button");
    bouton.textContent = "Réessayer";
    bouton.addEventListener("click", charger);
    contenu.replaceChildren(message("Impossible de charger les événements."), bouton);
  }
}

async function charger() {
  afficher("chargement"); // 1. on prévient : ça arrive
  try {
    const reponse = await fetch("/api/evenements");
    if (!reponse.ok) throw new Error("Erreur " + reponse.status); // 2. fetch ne voit pas un 404 ou un 500 comme une erreur
    const evenements = await reponse.json();
    if (evenements.length === 0) return afficher("vide"); // 3. rien à montrer : on le dit
    afficher("liste", evenements);
  } catch {
    afficher("erreur"); // 4. réseau coupé, serveur arrêté, réponse en erreur…
  }
}

charger();
