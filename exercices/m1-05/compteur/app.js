let likes = 0;
const bouton = document.querySelector("#aimer");

bouton.addEventListener("click", () => {
  likes = likes + 1;
  document.querySelector("#compteur").textContent = likes;
});
