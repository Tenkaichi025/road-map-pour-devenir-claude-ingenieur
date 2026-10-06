// La liste des photos à afficher.
const PHOTOS = [
  { fichier: "plateau.svg", legende: "Les tours du Plateau" },
  { fichier: "lagune.svg", legende: "La lagune Ébrié au coucher du soleil" },
  { fichier: "marche.svg", legende: "Un marché de Treichville" },
];

// On trouve la zone vide prévue dans le HTML...
const conteneur = document.querySelector("#photo");

// ...et on y ajoute une image (avec sa légende) pour chaque photo.
for (const photo of PHOTOS) {
  const figure = document.createElement("figure");
  const img = document.createElement("img");
  img.src = "photos/" + photo.fichier;
  img.alt = photo.legende;
  const legende = document.createElement("figcaption");
  legende.textContent = photo.legende;
  figure.append(img, legende);
  conteneur.append(figure);
}
