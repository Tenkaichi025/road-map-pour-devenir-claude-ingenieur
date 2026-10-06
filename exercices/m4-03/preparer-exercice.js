// Crée un dépôt d'entraînement : la réservation des créneaux d'un terrain de foot à 5, à construire en
// trois étapes. Chaque étape a ses tests d'acceptation, et « node valider.js <n> » dit si elle est finie.
// Usage : node preparer-exercice.js <dossier à créer>      (EN DEHORS du dossier du cours)
// Exemple : node preparer-exercice.js C:\exos\terrain
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const cible = process.argv[2];
if (!cible) {
  console.log("Utilisation : node preparer-exercice.js <dossier à créer>");
  process.exit(1);
}
if (fs.existsSync(cible)) {
  console.log(`Le dossier ${cible} existe déjà : choisis un nouveau nom.`);
  process.exit(1);
}
const parent = path.dirname(path.resolve(cible));
fs.mkdirSync(parent, { recursive: true });
try {
  execFileSync("git", ["-C", parent, "rev-parse"], { stdio: "ignore" });
  console.log("Ce dossier est à l'intérieur d'un autre dépôt git (sans doute le cours).");
  console.log("Choisis un dossier ailleurs, par exemple C:\\exos\\terrain.");
  process.exit(1);
} catch {
  // pas dans un dépôt : parfait
}

fs.mkdirSync(cible);
const ecrire = (fichier, texte) => {
  fs.mkdirSync(path.dirname(path.join(cible, fichier)), { recursive: true });
  fs.writeFileSync(path.join(cible, fichier), texte);
};

ecrire("package.json", `{
  "name": "terrain-riviera",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
`);

ecrire("README.md", `# Réservation du terrain de foot à 5 de la Riviera

Un créneau : { nom: "Awa", debut: "2026-11-14T18:00", fin: "2026-11-14T19:00" } (heure locale, sans fuseau).

À construire en trois étapes, dans src/creneaux.js :

1. Données et validation d'un créneau : validerCreneau(creneau), dureeMinutes(creneau).
2. Chevauchements : chevauche(a, b), ajouterReservation(reservations, creneau).
3. Règles métier : heures d'ouverture et jours fériés (src/feries.js), estOuvert(creneau).

Une étape est finie quand « node valider.js <numéro> » passe : ses tests ET ceux des étapes précédentes.
Puis on commite, et seulement ensuite on passe à l'étape suivante.
`);

ecrire("CLAUDE.md", `# Terrain Riviera — règles pour Claude

## Projet
Réservation des créneaux d'un terrain de foot. Node.js 22+, CommonJS (require / module.exports), aucune dépendance.

## Commandes
- Valider une étape : node valider.js <numéro> (lance les tests de cette étape et des précédentes).

## Conventions
- Tout le code dans src/creneaux.js. Fonctions pures, noms en français.
- Dates : chaînes « AAAA-MM-JJTHH:MM » en heure locale. Pas de bibliothèque de dates.
- Erreurs : throw new Error("Message clair en français.")

## Limites
- Ne modifie JAMAIS le dossier etapes/ : ce sont les tests d'acceptation, ils servent d'arbitre.
- Ne fais que l'étape demandée, rien de plus.
`);

ecrire("src/creneaux.js", `// La réservation des créneaux du terrain. À construire étape par étape (voir README.md).

module.exports = {};
`);

ecrire("src/feries.js", `// Jours fériés 2026 en Côte d'Ivoire où le terrain est fermé (extrait : les dates des fêtes
// musulmanes, qui dépendent de la lune, sont à ajouter chaque année).
const FERIES = [
  "2026-01-01", // Jour de l'an
  "2026-04-06", // Lundi de Pâques
  "2026-05-01", // Fête du travail
  "2026-05-14", // Ascension
  "2026-05-25", // Lundi de Pentecôte
  "2026-08-07", // Fête de l'indépendance
  "2026-08-15", // Assomption
  "2026-11-01", // Toussaint
  "2026-11-15", // Journée nationale de la paix
  "2026-12-25", // Noël
];

module.exports = { FERIES };
`);

ecrire("etapes/etape1.test.js", `// ÉTAPE 1 — Données et validation d'un créneau. (Fichier d'acceptation : ne pas modifier.)
const test = require("node:test");
const assert = require("node:assert");
const { validerCreneau, dureeMinutes } = require("../src/creneaux.js");

// { name: "Error" } : on exige une vraie erreur de validation. Une TypeError (fonction absente) ne compte pas.
const c = (debut, fin, nom = "Awa") => ({ nom, debut, fin });

test("Un créneau d'une heure est valide", () => {
  assert.doesNotThrow(() => validerCreneau(c("2026-11-14T18:00", "2026-11-14T19:00")));
});

test("La durée est calculée en minutes", () => {
  assert.equal(dureeMinutes(c("2026-11-14T18:00", "2026-11-14T19:30")), 90);
});

test("Format de date invalide : refusé", () => {
  assert.throws(() => validerCreneau(c("14/11/2026 18h", "14/11/2026 19h")), { name: "Error" });
});

test("Date qui n'existe pas (30 février) : refusée", () => {
  assert.throws(() => validerCreneau(c("2026-02-30T10:00", "2026-02-30T11:00")), { name: "Error" });
});

test("Les minutes doivent être :00 ou :30", () => {
  assert.throws(() => validerCreneau(c("2026-11-14T18:15", "2026-11-14T19:15")), { name: "Error" });
});

test("La fin doit être après le début", () => {
  assert.throws(() => validerCreneau(c("2026-11-14T19:00", "2026-11-14T18:00")), { name: "Error" });
});

test("Durée minimale : 1 heure", () => {
  assert.throws(() => validerCreneau(c("2026-11-14T18:00", "2026-11-14T18:30")), { name: "Error" });
});

test("Durée maximale : 3 heures", () => {
  assert.throws(() => validerCreneau(c("2026-11-14T14:00", "2026-11-14T17:30")), { name: "Error" });
});

test("Début et fin le même jour", () => {
  assert.throws(() => validerCreneau(c("2026-11-14T23:00", "2026-11-15T00:30")), { name: "Error" });
});

test("Le nom est obligatoire", () => {
  assert.throws(() => validerCreneau(c("2026-11-14T18:00", "2026-11-14T19:00", "   ")), { name: "Error" });
});
`);

ecrire("etapes/etape2.test.js", `// ÉTAPE 2 — Chevauchements. (Fichier d'acceptation : ne pas modifier.)
const test = require("node:test");
const assert = require("node:assert");
const { chevauche, ajouterReservation } = require("../src/creneaux.js");

const c = (debut, fin, nom = "Awa") => ({ nom, debut, fin });
const awa = c("2026-11-14T18:00", "2026-11-14T19:00", "Awa");

test("Deux créneaux qui se recouvrent se chevauchent", () => {
  assert.equal(chevauche(awa, c("2026-11-14T18:30", "2026-11-14T19:30")), true);
});

test("Un créneau inclus dans un autre le chevauche", () => {
  assert.equal(chevauche(c("2026-11-14T17:00", "2026-11-14T20:00"), awa), true);
});

test("Deux créneaux qui se suivent ne se chevauchent pas", () => {
  assert.equal(chevauche(awa, c("2026-11-14T19:00", "2026-11-14T20:00")), false);
});

test("Même heure, autre jour : pas de chevauchement", () => {
  assert.equal(chevauche(awa, c("2026-11-21T18:00", "2026-11-21T19:00")), false);
});

test("ajouterReservation accepte un créneau libre", () => {
  const liste = ajouterReservation([awa], c("2026-11-14T19:00", "2026-11-14T20:00", "Kofi"));
  assert.equal(liste.length, 2);
});

test("ajouterReservation refuse un créneau déjà pris", () => {
  assert.throws(() => ajouterReservation([awa], c("2026-11-14T18:30", "2026-11-14T19:30", "Kofi")), { name: "Error" });
});

test("ajouterReservation refuse aussi un créneau invalide (étape 1)", () => {
  assert.throws(() => ajouterReservation([], c("2026-11-14T18:15", "2026-11-14T19:15")), { name: "Error" });
});

test("ajouterReservation ne modifie pas la liste reçue", () => {
  const avant = [awa];
  ajouterReservation(avant, c("2026-11-14T20:00", "2026-11-14T21:00", "Kofi"));
  assert.equal(avant.length, 1);
});
`);

ecrire("etapes/etape3.test.js", `// ÉTAPE 3 — Règles métier : heures d'ouverture et jours fériés. (Fichier d'acceptation : ne pas modifier.)
// Ouverture : du lundi au vendredi de 16:00 à 23:00 ; samedi et dimanche de 08:00 à 23:00 ; fermé les jours fériés.
const test = require("node:test");
const assert = require("node:assert");
const { estOuvert, ajouterReservation } = require("../src/creneaux.js");

const c = (debut, fin, nom = "Awa") => ({ nom, debut, fin });

test("Samedi 08:00 - 09:00 : ouvert", () => {
  assert.equal(estOuvert(c("2026-11-14T08:00", "2026-11-14T09:00")), true);
});

test("Samedi 07:30 - 08:30 : commence avant l'ouverture", () => {
  assert.equal(estOuvert(c("2026-11-14T07:30", "2026-11-14T08:30")), false);
});

test("Samedi 22:00 - 23:00 : ouvert jusqu'à la fermeture", () => {
  assert.equal(estOuvert(c("2026-11-14T22:00", "2026-11-14T23:00")), true);
});

test("Samedi 22:30 - 23:30 : finit après la fermeture", () => {
  assert.equal(estOuvert(c("2026-11-14T22:30", "2026-11-14T23:30")), false);
});

test("Vendredi 15:00 - 16:00 : avant l'ouverture de semaine", () => {
  assert.equal(estOuvert(c("2026-11-13T15:00", "2026-11-13T16:00")), false);
});

test("Vendredi 16:00 - 17:00 : ouvert", () => {
  assert.equal(estOuvert(c("2026-11-13T16:00", "2026-11-13T17:00")), true);
});

test("Dimanche 15 novembre (Journée nationale de la paix) : fermé", () => {
  assert.equal(estOuvert(c("2026-11-15T10:00", "2026-11-15T11:00")), false);
});

test("Vendredi 25 décembre (Noël) : fermé", () => {
  assert.equal(estOuvert(c("2026-12-25T18:00", "2026-12-25T19:00")), false);
});

test("ajouterReservation refuse un créneau en dehors des heures d'ouverture", () => {
  assert.throws(() => ajouterReservation([], c("2026-11-13T15:00", "2026-11-13T16:00")), { name: "Error" });
});

test("ajouterReservation accepte un lundi soir", () => {
  assert.equal(ajouterReservation([], c("2026-11-16T18:00", "2026-11-16T19:00")).length, 1);
});
`);

ecrire("valider.js", `// Valide une étape : lance ses tests d'acceptation ET ceux des étapes précédentes.
// Usage : node valider.js <numéro de l'étape>      (exemple : node valider.js 2)
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const n = Number(process.argv[2]);
const fichiers = [1, 2, 3].filter((i) => i <= n).map((i) => path.join("etapes", \`etape\${i}.test.js\`));
if (!fichiers.length || !fichiers.every((f) => fs.existsSync(path.join(__dirname, f)))) {
  console.log("Utilisation : node valider.js 1   (ou 2, ou 3)");
  process.exit(1);
}

const r = spawnSync(process.execPath, ["--test", ...fichiers], { cwd: __dirname, encoding: "utf8" });
const sortie = (r.stdout || "") + (r.stderr || "");
const echecs = sortie.split("\\n").filter((l) => l.trim().startsWith("✖") && !/failing tests/.test(l));
const reussis = (sortie.match(/ℹ pass (\\d+)/) || [])[1] || 0;
const rates = (sortie.match(/ℹ fail (\\d+)/) || [])[1] || 0;

console.log(\`Étapes 1 à \${n} : \${reussis} test(s) réussi(s), \${rates} échec(s).\`);
if (r.status === 0) {
  console.log(\`\\n✓ Étape \${n} validée. Relis le diff, puis commite :\`);
  console.log(\`  git add -A && git commit -m "Étape \${n} : <ce que tu as ajouté>"\`);
} else {
  console.log(\`\\n✗ Étape \${n} pas encore validée. Tests en échec :\`);
  [...new Set(echecs.map((l) => l.trim()))].slice(0, 12).forEach((l) => console.log("  " + l));
}
process.exitCode = r.status === 0 ? 0 : 1;
`);

const git = (...args) =>
  execFileSync("git", ["-C", cible, "-c", "user.name=Wilfried", "-c", "user.email=wilfried@exemple.ci", "-c", "core.autocrlf=false", ...args], { stdio: "ignore" });
git("init", "-q", "-b", "main");
git("add", "-A");
git("commit", "-q", "-m", "Point de départ : squelette, jours fériés et tests d'acceptation des 3 étapes");

console.log(`Dépôt d'entraînement créé dans ${cible}.`);
console.log("Commence par lire README.md et CLAUDE.md, puis lance : node valider.js 1");
