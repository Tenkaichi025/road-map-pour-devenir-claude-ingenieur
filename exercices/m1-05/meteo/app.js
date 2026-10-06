let enFahrenheit = false;

function versFahrenheit(celsius) {
  return (celsius * 9) / 5 + 23;
}

function formater(celsius) {
  if (enFahrenheit) {
    const f = Math.round(versFahrenheit(celsius) * 10) / 10;
    return String(f).replace(".", ",") + " °F";
  }
  return celsius + " °C";
}

function cheminIcone(nom) {
  return "img/" + nom + ".svg";
}

function afficher() {
  document.querySelector("#ville").textContent = METEO.ville;

  const m = METEO.maintenant;
  document.querySelector("#temperature").textContent = formater(m.temperature);
  document.querySelector("#ressenti").textContent = formater(m.ressenti);
  document.querySelector("#humidite").textContent = m.humidite + " %";
  document.querySelector("#vent").textContent = m.vent + " km/h";
  document.querySelector("#icone").src = cheminIcone(m.icone);

  const liste = document.querySelector("#previsions");
  liste.replaceChildren(
    ...METEO.prevision.map((jour) => {
      const li = document.createElement("li");
      const nom = document.createElement("strong");
      nom.textContent = jour.jour;
      const img = document.createElement("img");
      img.src = cheminIcone(jour.icone);
      img.alt = jour.icone;
      img.width = 40;
      img.height = 40;
      const temps = document.createElement("span");
      temps.textContent = formater(jour.min) + " / " + formater(jour.max);
      li.append(nom, img, temps);
      return li;
    })
  );
}

afficher();

document.querySelector("#unite").addEventListener("click", (e) => {
  enFahrenheit = !enFahrenheit;
  e.target.textContent = enFahrenheit ? "Afficher en °C" : "Afficher en °F";
  afficher();
});
