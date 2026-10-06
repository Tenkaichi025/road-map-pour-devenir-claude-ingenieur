// Audit des secrets d'un projet : clés écrites dans le code, fichiers .env mal protégés,
// .env.example qui contient de vraies valeurs, et secrets restés dans l'historique git.
// Usage : node audit-secrets.js <dossier>
// Les secrets trouvés sont toujours affichés masqués : un audit ne doit pas recopier ce qu'il protège.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const dossier = process.argv[2];
if (!dossier || !fs.existsSync(dossier)) {
  console.log("Utilisation : node audit-secrets.js <dossier>");
  process.exit(1);
}

// Formes connues de clés, puis la forme générale « variable sensible = valeur écrite en dur ».
const MOTIFS = [
  [/sk_(live|test)_[0-9a-zA-Z]{16,}/, "clé Stripe"],
  [/AKIA[0-9A-Z]{16}/, "clé d'accès AWS"],
  [/gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}/, "jeton GitHub"],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, "jeton Slack"],
  [/AIza[0-9A-Za-z_-]{35}/, "clé Google"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "clé privée"],
  [/smsci_live_[0-9a-f]{16,}/, "clé SMS CI (fictive, celle du cours)"],
  [/\b\w*(cle|key|secret|token|password|passwd|mot_?de_?passe|mdp)\w*\s*[:=]\s*["'`][^"'`\s]{8,}["'`]/i, "valeur écrite en dur dans une variable sensible"],
];
const EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".json", ".php", ".py", ".yml", ".yaml", ".toml", ".ini", ".html", ".md", ".txt", ".example"]);
const IGNORES = new Set(["node_modules", ".git", "vendor", "dist", "build"]);
const SOI_MEME = path.resolve(__filename);
let alertes = 0;

const masquer = (s) => `${s.slice(0, 6)}… (${s.length} caractères)`;
function chercher(texte) {
  if (texte.includes("***REMOVED***")) return null; // déjà nettoyé par git filter-repo
  for (const [motif, nature] of MOTIFS) {
    const m = texte.match(motif);
    if (m) return { nature, extrait: texte.replace(m[0], masquer(m[0])).trim() };
  }
  return null;
}
function alerte(titre, detail) {
  alertes++;
  console.log(`⚠ ${titre}${detail ? "\n    " + detail : ""}\n`);
}

const dansGit = (() => {
  try {
    const r = execFileSync("git", ["-C", dossier, "rev-parse", "--is-inside-work-tree"], { stdio: ["ignore", "pipe", "ignore"] });
    return r.toString().trim() === "true";
  } catch {
    return false;
  }
})();
const estIgnore = (fichier) => {
  try {
    execFileSync("git", ["-C", dossier, "check-ignore", "-q", path.relative(dossier, fichier)], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const estExemple = (nom) => /\.(example|sample|template)$/.test(nom);

// 1. Les fichiers actuels
console.log("── 1. Le code actuel\n");
const fichiersEnv = [];
function parcourir(chemin) {
  for (const entree of fs.readdirSync(chemin, { withFileTypes: true })) {
    const complet = path.join(chemin, entree.name);
    if (entree.isDirectory()) {
      if (!IGNORES.has(entree.name)) parcourir(complet);
      continue;
    }
    if (path.resolve(complet) === SOI_MEME) continue;
    const estEnv = /^\.env/.test(entree.name);
    if (estEnv) fichiersEnv.push(complet);
    if (estEnv) continue; // les fichiers .env sont examinés à l'étape 2
    if (!EXTENSIONS.has(path.extname(entree.name))) continue;
    fs.readFileSync(complet, "utf8").split("\n").forEach((ligne, i) => {
      const trouve = chercher(ligne);
      if (trouve) alerte(`${trouve.nature} : ${complet}:${i + 1}`, trouve.extrait);
    });
  }
}
parcourir(dossier);

// 2. Les fichiers .env et le .gitignore
console.log("── 2. Fichiers .env et .gitignore\n");
const gitignore = path.join(dossier, ".gitignore");
const lignesIgnore = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, "utf8").split(/\r?\n/).map((l) => l.trim()) : null;
if (!lignesIgnore) {
  alerte("Pas de .gitignore à la racine du dossier");
} else if (!lignesIgnore.some((l) => /^\/?(\.env|\.env\*|\*\.env|\.env\.\*)$/.test(l))) {
  alerte(".gitignore ne contient aucune ligne pour .env", "ajoute : .env   .env.*   !.env.example");
}
const VALEUR_FICTIVE = /^(x+|<.*>|change[-_ ]?moi|a_remplir|à remplir|\.\.\.|votre_\w*|your_\w*)$/i;
for (const f of fichiersEnv) {
  if (estExemple(path.basename(f))) {
    fs.readFileSync(f, "utf8").split(/\r?\n/).forEach((ligne, i) => {
      const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && m[2].trim() && !VALEUR_FICTIVE.test(m[2].trim())) {
        alerte(`${f}:${i + 1} contient une valeur pour ${m[1]}`, "un fichier d'exemple ne contient que des noms, avec des valeurs vides ou fictives");
      }
    });
  } else if (dansGit && !estIgnore(f)) {
    alerte(`${f} n'est PAS ignoré par git`, "il partira au prochain « git add . »");
  }
}

// 3. L'historique git (seulement pour ce dossier)
console.log("── 3. L'historique git\n");
if (!dansGit) {
  console.log("Ce dossier n'est pas dans un dépôt git : pas d'historique à fouiller.\n");
} else {
  const journal = execFileSync("git", ["-C", dossier, "log", "-p", "--all", "--no-color", "--format=@@commit %h %s", "--", "."], {
    maxBuffer: 256 * 1024 * 1024,
  }).toString();
  let commit = "";
  const dejaVus = new Set();
  for (const ligne of journal.split("\n")) {
    if (ligne.startsWith("@@commit ")) {
      commit = ligne.slice(9);
    } else if (ligne.startsWith("+") && !ligne.startsWith("+++")) {
      const trouve = chercher(ligne.slice(1));
      if (trouve && !dejaVus.has(trouve.extrait)) {
        dejaVus.add(trouve.extrait);
        alerte(`${trouve.nature}, ajouté(e) dans le commit ${commit}`, trouve.extrait);
      }
    }
  }
}

console.log(
  alertes
    ? `${alertes} alerte(s). Une clé trouvée dans l'historique doit être changée chez le fournisseur, même si elle n'est plus dans le code.`
    : "Aucune alerte. (Un outil ne voit pas tout : relis aussi tes fichiers de configuration.)"
);
process.exitCode = alertes ? 1 : 0;
