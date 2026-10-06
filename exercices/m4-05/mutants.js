// Injection de fautes (« mutation testing » manuel, automatisé) : change le code d'une petite façon,
// relance les tests, et regarde s'ils passent au ROUGE. Une faute que les tests ne voient pas = un « survivant ».
// Usage : node mutants.js <dépôt> <fichier à muter>      (exemple : node mutants.js C:\exos\devis-tests src/devis.js)
// Le fichier d'origine est TOUJOURS remis en place, même en cas d'erreur ou de Ctrl + C.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const [depot, relatif] = process.argv.slice(2);
if (!depot || !relatif || !fs.existsSync(path.join(depot, relatif))) {
  console.log("Utilisation : node mutants.js <dépôt> <fichier à muter>   (exemple : src/devis.js)");
  process.exit(1);
}
const fichier = path.join(depot, relatif);
const original = fs.readFileSync(fichier, "utf8");
const restaurer = () => fs.writeFileSync(fichier, original);
process.on("SIGINT", () => {
  restaurer();
  console.log("\nInterrompu : fichier d'origine remis en place.");
  process.exit(1);
});

// Les fautes injectées : [motif, remplacement, description].
const OPERATEURS = [
  [/>=/g, () => ">", "« >= » devient « > »"],
  [/(?<![=>-])>(?![=>])/g, () => ">=", "« > » devient « >= »"],
  [/<=/g, () => "<", "« <= » devient « < »"],
  [/(?<![<=])<(?![=<])/g, () => "<=", "« < » devient « <= »"],
  [/===/g, () => "!==", "« === » devient « !== »"],
  [/!==/g, () => "===", "« !== » devient « === »"],
  [/ \+ /g, () => " - ", "« + » devient « - »"],
  [/ - /g, () => " + ", "« - » devient « + »"],
  [/ \* /g, () => " / ", "« * » devient « / »"],
  [/Math\.round/g, () => "Math.ceil", "Math.round devient Math.ceil"],
  [/Math\.floor/g, () => "Math.ceil", "Math.floor devient Math.ceil"],
  [/Math\.ceil/g, () => "Math.floor", "Math.ceil devient Math.floor"],
  [/throw new Error/g, () => "new Error", "une erreur n'est plus lancée (validation supprimée)"],
  [/(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])/g, (n) => String(Number(n) + 1), "un nombre change de 1"],
];

// Construit la liste des mutants : une faute à la fois, hors commentaires et chaînes « require ».
const lignes = original.split("\n");
const mutants = [];
lignes.forEach((ligne, i) => {
  const code = ligne.trim();
  if (code.startsWith("//") || code.startsWith("*") || code.includes("require(")) return;
  for (const [motif, remplacer, description] of OPERATEURS) {
    for (const m of ligne.matchAll(motif)) {
      const muteeLigne = ligne.slice(0, m.index) + remplacer(m[0]) + ligne.slice(m.index + m[0].length);
      mutants.push({ ligne: i + 1, description, avant: code, apres: muteeLigne.trim(), contenu: [...lignes.slice(0, i), muteeLigne, ...lignes.slice(i + 1)].join("\n") });
    }
  }
});

const lancerTests = () => spawnSync(process.execPath, ["--test"], { cwd: depot, encoding: "utf8", timeout: 30000 }).status === 0;

try {
  if (!lancerTests()) {
    console.log("Les tests sont déjà rouges sans aucune faute : corrige-les d'abord, sinon l'expérience ne veut rien dire.");
    process.exitCode = 1;
  } else {
    let tues = 0;
    const survivants = [];
    for (const mutant of mutants) {
      fs.writeFileSync(fichier, mutant.contenu);
      if (lancerTests()) survivants.push(mutant);
      else tues++;
    }
    console.log(`${mutants.length} fautes injectées dans ${relatif} : ${tues} détectée(s) par les tests, ${survivants.length} survivante(s).\n`);
    for (const s of survivants) {
      console.log(`SURVIVANT  ligne ${s.ligne} : ${s.description}\n           ${s.avant}\n        →  ${s.apres}\n`);
    }
    const score = mutants.length ? Math.round((tues / mutants.length) * 100) : 100;
    console.log(`Score de mutation : ${score} %. Chaque survivant est une faute que tes tests laisseraient passer.`);
    process.exitCode = survivants.length ? 1 : 0;
  }
} finally {
  restaurer();
}
