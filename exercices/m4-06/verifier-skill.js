// Contrôle un skill avant de l'installer : en-tête, description avec déclencheur, scripts cités, outils autorisés.
// Usage : node verifier-skill.js <dossier du skill>      (exemple : node verifier-skill.js C:\exos\salon-skills\.claude\skills\audit-securite)
// Il vérifie la forme, pas le fond : il ne remplace pas un essai réel dans Claude Code.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const dossier = process.argv[2];
const fichier = dossier && path.join(dossier, "SKILL.md");
if (!fichier || !fs.existsSync(fichier)) {
  console.log("Utilisation : node verifier-skill.js <dossier du skill>   (le dossier qui contient SKILL.md)");
  process.exit(1);
}

let echecs = 0;
let alertes = 0;
const reussi = (texte) => console.log(`RÉUSSI  ${texte}`);
const alerte = (texte) => (alertes++, console.log(`ALERTE  ${texte}`));
const echec = (texte) => (echecs++, console.log(`ÉCHEC   ${texte}`));

const texte = fs.readFileSync(fichier, "utf8").replace(/\r\n/g, "\n");
const bloc = texte.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!bloc) {
  echec("pas d'en-tête : SKILL.md doit commencer par une ligne ---, l'en-tête, puis une autre ligne ---");
  process.exit(1);
}
const [, entete, corps] = bloc;

// En-tête « clé: valeur », avec les lignes indentées qui continuent la valeur précédente.
const champs = {};
let cle = null;
for (const ligne of entete.split("\n")) {
  const m = ligne.match(/^([\w-]+):\s*(.*)$/);
  if (m) {
    cle = m[1];
    champs[cle] = m[2];
  } else if (cle && /^\s+\S/.test(ligne)) {
    champs[cle] += " " + ligne.trim();
  }
}
const valeur = (c) => (champs[c] || "").replace(/^[>|]-?\s*/, "").replace(/^["']|["']$/g, "").trim();

const nom = valeur("name");
if (!nom) echec("name manquant");
else if (!/^[a-z0-9-]{1,64}$/.test(nom)) echec(`name « ${nom} » : minuscules, chiffres et tirets seulement (64 caractères maximum)`);
else if (nom !== path.basename(path.resolve(dossier))) alerte(`name « ${nom} » différent du nom du dossier : garde le même, pour t'y retrouver`);
else reussi(`name : ${nom} (tu l'appelleras avec /${nom})`);

const description = valeur("description");
if (!description) echec("description manquante : sans elle, Claude ne sait pas quand utiliser le skill");
else {
  if (description.length > 1024) echec(`description trop longue (${description.length} caractères, 1 024 maximum)`);
  else reussi(`description : ${description.length} caractères`);
  if (/\b(quand|lorsque|when|avant|après)\b/i.test(description)) reussi("la description dit QUAND utiliser le skill");
  else alerte("la description ne dit pas QUAND l'utiliser (« Utilise ce skill quand… ») : Claude risque de ne jamais le déclencher");
}

if (valeur("disable-model-invocation") === "true") reussi("déclenchement manuel seulement (/" + (nom || "nom") + ")");

const outils = valeur("allowed-tools");
if (outils) {
  if (/(^|[\s,])Bash(?!\()/.test(outils)) alerte("allowed-tools autorise Bash sans restriction : limite-le, par exemple Bash(node:*)");
  else reussi(`allowed-tools : ${outils}`);
}

// Les fichiers cités avec ${CLAUDE_SKILL_DIR} doivent exister, et les scripts .js doivent au moins se lire.
const cites = [...new Set([...corps.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([^\s"'`)]+)/g)].map((m) => m[1]))];
if (!cites.length) alerte("aucun fichier cité avec ${CLAUDE_SKILL_DIR}/… : normal pour un skill de consignes seules");
for (const relatif of cites) {
  const complet = path.join(dossier, relatif);
  if (!fs.existsSync(complet)) echec(`${relatif} est cité, mais n'existe pas dans le dossier du skill`);
  else if (relatif.endsWith(".js") && spawnSync(process.execPath, ["--check", complet]).status !== 0) echec(`${relatif} contient une erreur de syntaxe`);
  else reussi(`${relatif} présent`);
}

if (/sk_(live|test)_|smsci_live_|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY/.test(texte)) echec("SKILL.md contient ce qui ressemble à un secret : un skill se partage, il ne doit en contenir aucun");

const lignes = corps.split("\n").length;
if (lignes > 500) alerte(`corps de ${lignes} lignes : au-delà de 500, déplace les détails dans des fichiers à part`);

console.log(`\n${echecs} échec(s), ${alertes} alerte(s).`);
process.exitCode = echecs ? 1 : 0;
