// Toute la logique du site. Les pages ne contiennent que du contenu.
// Dépend de PROGRAMME (assets/programme.js), chargé avant ce fichier.

const CLE = "ingenieur-claude:progression";
const SUR_LECON = Boolean(document.body.dataset.lecon);

// --- Progression (localStorage peut être bloqué : on ne plante jamais) ---
function lireProgression() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) || {};
  } catch {
    return {};
  }
}

function marquer(id, fait) {
  const p = lireProgression();
  if (fait) p[id] = true;
  else delete p[id];
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    // Navigation privée stricte : la case marche, mais rien n'est retenu.
  }
}

// Liste à plat : chaque leçon connaît son numéro ("1.3") et son module.
const LECONS = PROGRAMME.flatMap((module, m) =>
  module.lecons.map((lecon, l) => ({ ...lecon, numero: `${m + 1}.${l + 1}`, module: m }))
);

function lienLecon(id) {
  return SUR_LECON ? `${id}.html` : `lecons/${id}.html`;
}

function prochaineLecon(p) {
  return LECONS.find((l) => l.pret && !p[l.id]);
}

// Crée un élément sans jamais passer par innerHTML (voir leçon 3.2).
function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else n.setAttribute(k, v);
  }
  n.append(...enfants.filter((e) => e !== null && e !== undefined));
  return n;
}

// --- La route : en grand sur l'accueil, en rail fin sur une leçon ---
function dessinerRoute(modules, p, idCourant) {
  const suivante = prochaineLecon(p);
  return el(
    "ol",
    { class: "route" },
    ...modules.map(({ module, index }) => {
      const faites = module.lecons.filter((l) => p[l.id]).length;
      return el(
        "li",
        { class: "route-module" },
        el(
          "div",
          { class: "module-tete" },
          el("span", { class: "module-num" }, String(index + 1).padStart(2, "0")),
          el("h2", { class: "module-titre" }, module.titre),
          el("p", { class: "module-sous-titre" }, `${module.sousTitre} · ${faites}/${module.lecons.length}`)
        ),
        el(
          "ol",
          { class: "stations" },
          ...module.lecons.map((lecon, l) => {
            const etats = ["station"];
            if (p[lecon.id]) etats.push("faite");
            if (!lecon.pret) etats.push("bientot");
            if (lecon.id === idCourant) etats.push("courante");
            else if (suivante && lecon.id === suivante.id) etats.push("ici");
            const contenu = [
              el("span", { class: "station-num" }, `${index + 1}.${l + 1}`),
              el("span", { class: "station-titre" }, lecon.titre),
              lecon.pret ? null : el("span", { class: "station-note" }, "bientôt"),
            ];
            const lien = lecon.pret
              ? el("a", { href: lienLecon(lecon.id) }, ...contenu)
              : el("span", { class: "station-lien" }, ...contenu);
            if (lecon.id === idCourant) lien.setAttribute("aria-current", "page");
            return el("li", { class: etats.join(" ") }, lien);
          })
        )
      );
    })
  );
}

// --- Accueil ---
function accueil() {
  const p = lireProgression();
  const total = LECONS.length;
  const faites = LECONS.filter((l) => p[l.id]).length;
  const suivante = prochaineLecon(p);

  document.getElementById("compte-faites").textContent = faites;
  document.getElementById("compte-total").textContent = total;
  const barre = document.getElementById("barre");
  barre.max = total;
  barre.value = faites;

  const reprendre = document.getElementById("reprendre");
  if (suivante) {
    reprendre.replaceChildren(
      el(
        "a",
        { class: "bouton", href: lienLecon(suivante.id) },
        faites === 0 ? "Commencer" : "Reprendre",
        el("span", { class: "bouton-detail" }, `${suivante.numero} · ${suivante.titre}`)
      )
    );
  } else if (faites === total) {
    reprendre.replaceChildren(el("p", { class: "message" }, "Tu as terminé tout le parcours. Bravo, ingénieur."));
  } else {
    reprendre.replaceChildren(
      el("p", { class: "message" }, "Les prochaines leçons sont en cours d'écriture. Reviens bientôt.")
    );
  }

  document
    .getElementById("route")
    .replaceChildren(dessinerRoute(PROGRAMME.map((module, index) => ({ module, index })), p));

  document.getElementById("effacer").addEventListener("click", () => {
    if (confirm("Effacer toute ta progression ? Cette action est définitive.")) {
      try {
        localStorage.removeItem(CLE);
      } catch {}
      location.reload();
    }
  });
}

// --- Page de leçon ---
function lecon() {
  const id = document.body.dataset.lecon;
  const i = LECONS.findIndex((l) => l.id === id);
  const info = LECONS[i];
  const rail = document.getElementById("rail");
  const dessinerRail = () =>
    rail.replaceChildren(dessinerRoute([{ module: PROGRAMME[info.module], index: info.module }], lireProgression(), id));

  // Le modèle (ou une leçon pas encore ajoutée au programme) reste lisible.
  if (info) {
    document.getElementById("etiquette").textContent =
      `Module ${info.module + 1} · ${PROGRAMME[info.module].titre} · Leçon ${info.numero}`;
    dessinerRail();
  }

  // Vidéo : affichée si data-youtube contient un identifiant, sinon message.
  const video = document.querySelector(".video");
  if (video) {
    const yt = video.dataset.youtube;
    if (yt) {
      video.replaceChildren(
        el("iframe", {
          src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`,
          title: "Vidéo de la leçon",
          allow: "encrypted-media; picture-in-picture; fullscreen",
          referrerpolicy: "strict-origin-when-cross-origin",
          loading: "lazy",
        }),
        el(
          "a",
          { class: "video-secours", href: `https://www.youtube.com/watch?v=${encodeURIComponent(yt)}` },
          "La vidéo ne se lance pas ? Regarde-la sur YouTube"
        )
      );
    } else {
      video.replaceChildren(
        el(
          "p",
          { class: "video-absente" },
          "La vidéo de cette leçon arrive bientôt. Tout ce qu'il faut savoir est déjà dans le texte."
        )
      );
    }
  }

  // Quiz : <fieldset class="question" data-reponse="N">, N = position de la bonne réponse (à partir de 1).
  document.querySelectorAll(".question").forEach((q) => {
    q.addEventListener("change", (e) => {
      const choix = [...q.querySelectorAll("input")].indexOf(e.target) + 1;
      const juste = choix === Number(q.dataset.reponse);
      q.classList.toggle("juste", juste);
      q.classList.toggle("faux", !juste);
      const verdict = q.querySelector(".verdict") || q.appendChild(el("p", { class: "verdict", role: "status" }));
      verdict.textContent = juste ? "Bonne réponse." : "Pas tout à fait. Lis l'explication.";
      const explication = q.querySelector(".explication");
      if (explication) explication.hidden = false;
    });
  });

  // Fin de leçon : case « terminé » et navigation.
  const fin = document.getElementById("fin-lecon");
  if (!fin || !info) return;
  const caseTermine = el("input", { type: "checkbox", id: "termine" });
  caseTermine.checked = Boolean(lireProgression()[id]);
  caseTermine.addEventListener("change", () => {
    marquer(id, caseTermine.checked);
    dessinerRail();
  });
  const lienNav = (l, texte) =>
    l && l.pret
      ? el("a", { href: lienLecon(l.id) }, el("small", {}, texte), `${l.numero} · ${l.titre}`)
      : el("span");
  fin.replaceChildren(
    el("label", { class: "termine", for: "termine" }, caseTermine, "J'ai terminé cette leçon"),
    el(
      "nav",
      { class: "nav-lecons", "aria-label": "Leçons voisines" },
      lienNav(LECONS[i - 1], "Précédente"),
      lienNav(LECONS[i + 1], "Suivante")
    )
  );
}

if (SUR_LECON) lecon();
else accueil();
