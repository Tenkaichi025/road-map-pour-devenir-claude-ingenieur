// Crée un dépôt d'entraînement pour les skills : le site de rendez-vous d'un salon de coiffure (avec des problèmes
// à trouver), une branche « ia/rappel-sms » à relire, et les pièces détachées des 3 skills (scripts et grille du cours).
// Les SKILL.md, c'est toi qui les écris.
// Usage : node preparer-exercice.js <dossier à créer>      (EN DEHORS du dossier du cours)
// Exemple : node preparer-exercice.js C:\exos\salon-skills
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
  console.log("Choisis un dossier ailleurs, par exemple C:\\exos\\salon-skills.");
  process.exit(1);
} catch {
  // pas dans un dépôt : parfait
}

fs.mkdirSync(cible);
const ecrire = (fichier, texte) => {
  fs.mkdirSync(path.dirname(path.join(cible, fichier)), { recursive: true });
  fs.writeFileSync(path.join(cible, fichier), texte);
};
const copier = (depuisLeCours, vers) => {
  fs.mkdirSync(path.dirname(path.join(cible, vers)), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "..", depuisLeCours), path.join(cible, vers));
};
const git = (...args) =>
  execFileSync("git", ["-C", cible, "-c", "user.name=Wilfried", "-c", "user.email=wilfried@exemple.ci", "-c", "core.autocrlf=false", ...args], { stdio: "ignore" });

// ---------- Le projet : rendez-vous du salon ----------
ecrire(".gitignore", "*.db\nnode_modules/\n.env\n");

ecrire("package.json", `{
  "name": "salon-rendez-vous",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
`);

ecrire("REGLES.md", `# Règles du salon (le cahier des charges)

- Une cliente ne voit, et n'annule, que SES rendez-vous.
- Acompte à la réservation : 20 % du prix, arrondi au franc INFÉRIEUR, avec un minimum de 1 000 F.
  Le prix est un entier strictement positif, sinon : erreur de validation (throw new Error).
`);

ecrire("src/acompte.js", `// Acompte demandé à la réservation.
const TAUX = 0.2;
const MINIMUM = 1000;

function acompte(prix) {
  if (!Number.isInteger(prix) || prix <= 0) throw new Error("Prix invalide : un entier positif est attendu.");
  return Math.max(MINIMUM, Math.floor(prix * TAUX));
}

module.exports = { acompte };
`);

ecrire("src/serveur.js", `// Le serveur du salon : les rendez-vous de la cliente connectée.
// Simplifié pour l'exercice : la session est représentée par l'en-tête X-Cliente.
const http = require("node:http");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("salon.db");
db.exec(\`CREATE TABLE IF NOT EXISTS rendezvous (
  id INTEGER PRIMARY KEY, cliente TEXT NOT NULL, prestation TEXT NOT NULL, debut TEXT NOT NULL, prix INTEGER NOT NULL
)\`);

http
  .createServer((req, res) => {
    const cliente = req.headers["x-cliente"];
    if (!cliente) return res.writeHead(401).end();
    const morceaux = req.url.split("/");

    if (req.method === "GET" && req.url === "/rendezvous") {
      const lignes = db.prepare(\`SELECT * FROM rendezvous WHERE cliente = '\${cliente}'\`).all();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(lignes));
    }
    if (req.method === "DELETE" && morceaux[1] === "rendezvous") {
      db.prepare("DELETE FROM rendezvous WHERE id = ?").run(Number(morceaux[2]));
      return res.writeHead(204).end();
    }
    res.writeHead(404).end();
  })
  .listen(3013, () => console.log("Salon : http://localhost:3013"));
`);

ecrire("public/index.html", `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Mes rendez-vous · Salon Awa</title>
    <link rel="stylesheet" href="http://cdn.salon-awa.ci/salon.css" />
  </head>
  <body>
    <h1>Mes rendez-vous</h1>
    <ul id="rendezvous"></ul>
    <script src="app.js"></script>
  </body>
</html>
`);

ecrire("public/app.js", `const liste = document.querySelector("#rendezvous");

fetch("/rendezvous")
  .then((reponse) => reponse.json())
  .then((rendezvous) => {
    for (const rdv of rendezvous) {
      liste.innerHTML += \`<li>\${rdv.prestation} — \${rdv.debut}</li>\`;
    }
  });
`);

ecrire("tests/acompte.test.js", `const test = require("node:test");
const assert = require("node:assert");
const { acompte } = require("../src/acompte.js");

test("Acompte de 20 %", () => {
  assert.equal(acompte(15000), 3000);
});

test("Acompte minimum de 1 000 F", () => {
  assert.equal(acompte(3000), 1000);
});

test("Un prix négatif est refusé", () => {
  assert.throws(() => acompte(-5000), { name: "Error" });
});
`);

// ---------- Les pièces détachées des skills (copiées depuis le cours) ----------
for (const outil of [
  "m3-01/outils/audit-sql.js",
  "m3-02/outils/audit-xss.js",
  "m3-03/outils/audit-secrets.js",
  "m3-04/outils/audit-https.js",
  "m3-05/outils/audit-autorisations.js",
]) {
  copier(outil, `.claude/skills/audit-securite/scripts/${path.basename(outil)}`);
}
copier("m4-04/grille-relecture.md", ".claude/skills/relecture-pr/grille-relecture.md");
copier("m4-05/mutants.js", ".claude/skills/mutation-guard/scripts/mutants.js");

git("init", "-q", "-b", "main");
git("add", "-A");
git("commit", "-q", "-m", "Rendez-vous du salon, et pièces détachées des skills");

// ---------- La branche de l'IA, à relire ----------
// La demande était : « Ajoute un rappel SMS envoyé la veille de chaque rendez-vous. »
git("checkout", "-q", "-b", "ia/rappel-sms");
ecrire("package.json", `{
  "name": "salon-rendez-vous",
  "private": true,
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "moment": "^2.30.1"
  }
}
`);
ecrire("src/rappel.js", `// Rappel SMS envoyé la veille du rendez-vous.
const moment = require("moment");

const CLE_SMS = "smsci_live_7f3a9c2e5b8d1f40";

function messageRappel(rdv) {
  return \`Rappel : \${rdv.prestation} demain à \${moment(rdv.debut).format("HH:mm")}. Salon Awa.\`;
}

async function envoyerRappel(rdv, telephone) {
  return fetch("http://api.sms-exemple.ci/envoyer", {
    method: "POST",
    headers: { Authorization: \`Bearer \${CLE_SMS}\`, "Content-Type": "application/json" },
    body: JSON.stringify({ telephone, texte: messageRappel(rdv) }),
  });
}

module.exports = { messageRappel, envoyerRappel };
`);
ecrire("src/acompte.js", fs.readFileSync(path.join(cible, "src/acompte.js"), "utf8").replace("const MINIMUM = 1000;", "const MINIMUM = 500;"));
ecrire(
  "tests/acompte.test.js",
  fs
    .readFileSync(path.join(cible, "tests/acompte.test.js"), "utf8")
    .replace('test("Acompte minimum de 1 000 F", () => {\n  assert.equal(acompte(3000), 1000);', 'test("Acompte minimum", () => {\n  assert.equal(acompte(3000), 600); // mis à jour')
);
git("add", "-A");
git("commit", "-q", "-m", "Ajoute le rappel SMS la veille du rendez-vous");
git("checkout", "-q", "main");

console.log(`Dépôt d'entraînement créé dans ${cible}.`);
console.log("- main : le site du salon, et .claude/skills/ avec les scripts et la grille (sans SKILL.md : c'est ton travail).");
console.log("- ia/rappel-sms : la branche de l'IA à relire (demande : un rappel SMS la veille de chaque rendez-vous).");
