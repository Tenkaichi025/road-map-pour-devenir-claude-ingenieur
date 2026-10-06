// 1. Trouver les éléments dont on a besoin.
const form = document.querySelector("#form-tache");
const champ = document.querySelector("#nouvelle");
const liste = document.querySelector("#liste");

// 2. Écouter l'envoi du formulaire.
form.addEventListener("submit", (evenement) => {
  evenement.preventDefault(); // sans ça, la page se recharge et la tâche disparaît

  // 3. Créer un nouvel élément <li>...
  const li = document.createElement("li");
  // 4. ...y mettre le texte tapé (textContent : le texte reste du texte, jamais du code)...
  li.textContent = champ.value;
  // 5. ...et l'accrocher dans la liste.
  liste.append(li);

  champ.value = "";
  champ.focus();
});
