// Contrôle d'un travail de l'IA : compare l'état actuel d'un dépôt à un point de départ.
// Usage : node controle-ia.js <dépôt> <point de départ>
// Exemple : node controle-ia.js C:\exos\panier avant-ia      (pense à te placer sur la branche à contrôler)
// Il signale : dépendances ajoutées, fichiers touchés, volume, sur-ingénierie, conventions, tests modifiés.
// Les conventions vérifiées sont celles du projet d'exercice : adapte la liste CONVENTIONS au tien.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const [depot, depart] = process.argv.slice(2);
if (!depot || !depart) {
  console.log("Utilisation : node controle-ia.js <dépôt> <point de départ>   (exemple : avant-ia, main, un numéro de commit)");
  process.exit(1);
}
const git = (...args) => execFileSync("git", ["-C", depot, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

let alertes = 0;
const alerte = (texte) => {
  alertes++;
  console.log(`  ⚠ ${texte}`);
};
const ok = (texte) => console.log(`  ✓ ${texte}`);

// 1. Dépendances
console.log("\n1. Dépendances");
const lireDeps = (texte) => {
  try {
    const p = JSON.parse(texte);
    return { ...(p.dependencies || {}), ...(p.devDependencies || {}) };
  } catch {
    return {};
  }
};
let avant = {};
try {
  avant = lireDeps(git("show", `${depart}:package.json`));
} catch {}
const maintenant = fs.existsSync(path.join(depot, "package.json")) ? lireDeps(fs.readFileSync(path.join(depot, "package.json"), "utf8")) : {};
const nouvelles = Object.keys(maintenant).filter((d) => !(d in avant));
if (nouvelles.length) nouvelles.forEach((d) => alerte(`nouvelle dépendance : ${d} ${maintenant[d]} (demandée ?)`));
else ok("aucune nouvelle dépendance");

// 2. Fichiers touchés (y compris ceux pas encore commités)
console.log("\n2. Fichiers touchés depuis " + depart);
const etat = git("diff", "--name-status", depart).trim().split("\n").filter(Boolean);
const nonSuivis = git("ls-files", "--others", "--exclude-standard").trim().split("\n").filter(Boolean);
const fichiers = [...etat.map((l) => l.split("\t")), ...nonSuivis.map((f) => ["A", f])];
const libelle = { A: "ajouté  ", M: "modifié ", D: "supprimé" };
fichiers.forEach(([statut, f]) => console.log(`  ${libelle[statut[0]] || statut} ${f}`));
const ajoutes = fichiers.filter(([s]) => s === "A").map(([, f]) => f);
if (ajoutes.length > 3) alerte(`${ajoutes.length} fichiers ajoutés : la demande en justifiait-elle autant ?`);
const configs = ajoutes.filter((f) => /^config\/|\.config\.|^\.eslintrc|tsconfig|babel|webpack/.test(f));
configs.forEach((f) => alerte(`fichier de configuration ajouté : ${f}`));

// 3. Volume et contenu des lignes ajoutées
console.log("\n3. Lignes ajoutées");
const diff = git("diff", "-U0", depart);
const lignesAjoutees = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
for (const f of nonSuivis) {
  try {
    lignesAjoutees.push(...fs.readFileSync(path.join(depot, f), "utf8").split("\n"));
  } catch {}
}
console.log(`  ${lignesAjoutees.length} lignes ajoutées`);
if (lignesAjoutees.length > 150) alerte("beaucoup de lignes pour une petite fonctionnalité : sur-ingénierie ?");

const MARQUEURS = [
  [/\bclass\s+\w+/, "classe"],
  [/\b\w*(Factory|Fabrique|Strategy|Strategie|Manager|Gestionnaire|Abstract|Builder)\b/, "patron d'architecture (fabrique, stratégie…)"],
  [/abstraite|abstract/i, "méthode ou classe abstraite"],
];
for (const [motif, nom] of MARQUEURS) {
  const n = lignesAjoutees.filter((l) => motif.test(l)).length;
  if (n) alerte(`${nom} : ${n} ligne(s). Nécessaire pour la demande, ou « pour plus tard » ?`);
}

// 4. Conventions du projet d'exercice (CommonJS, argent en francs CFA entiers)
console.log("\n4. Conventions du projet");
const CONVENTIONS = [
  [/^\s*import\s.+from\s|^\s*export\s/, "import/export : le projet utilise require et module.exports"],
  [/toFixed\(|parseFloat\(/, "toFixed/parseFloat : les montants sont des francs CFA entiers (Math.floor)"],
];
let conformes = true;
for (const [motif, regle] of CONVENTIONS) {
  const n = lignesAjoutees.filter((l) => motif.test(l)).length;
  if (n) {
    conformes = false;
    alerte(`${regle} (${n} ligne(s))`);
  }
}
if (conformes) ok("conventions respectées");

// 5. Tests existants modifiés
console.log("\n5. Tests existants");
const testsTouches = etat.filter((l) => /^[MD]\t/.test(l) && /(^|\/)tests?\//.test(l.split("\t")[1]));
if (testsTouches.length) {
  testsTouches.forEach((l) => {
    const f = l.split("\t")[1];
    const retirees = git("diff", "-U0", depart, "--", f).split("\n").filter((x) => x.startsWith("-") && !x.startsWith("---")).length;
    if (retirees) alerte(`${f} : ${retirees} ligne(s) d'un test existant modifiées ou retirées (justifié ?)`);
  });
} else ok("aucun test existant modifié");

// 6. Les tests
console.log("\n6. Les tests (node --test)");
let sortie = "";
try {
  sortie = execFileSync("node", ["--test"], { cwd: depot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  sortie = (e.stdout || "") + (e.stderr || "");
}
const reussis = (sortie.match(/ℹ pass (\d+)/) || [])[1];
const echoues = (sortie.match(/ℹ fail (\d+)/) || [])[1];
if (reussis === undefined) alerte("impossible de lire le résultat des tests");
else if (Number(echoues)) alerte(`${echoues} test(s) en échec sur ${Number(reussis) + Number(echoues)}`);
else ok(`${reussis} tests verts (ce qui ne prouve pas qu'ils testent les bons cas : leçon 4.5)`);

console.log(`\n${alertes ? alertes + " point(s) à examiner." : "Aucun point à signaler."}`);
process.exitCode = alertes ? 1 : 0;
