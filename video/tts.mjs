// Transforme le script d'une leçon en audio, scène par scène, avec edge-tts (gratuit, sans clé).
// Prérequis, une seule fois : python -m pip install edge-tts
//
//   npm run tts -- m1-01 --essai                  affiche le texte qui sera lu, sans rien générer
//   npm run tts -- m1-01 --scene 1                génère seulement la scène 1
//   npm run tts -- m1-01                          génère les scènes qui n'existent pas encore
//   npm run tts -- m1-01 --force                  regénère tout
//   npm run tts -- m1-01 --voix fr-FR-HenriNeural change de voix pour cette fois
//
// Écrit dans public/audio/<id>/ : scene-N.mp3 et scenes.json (la liste lue par Remotion).
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ici = (chemin) => fileURLToPath(new URL(chemin, import.meta.url));

// --- Réglages de la voix : c'est ici qu'on ajuste à l'oreille ---
const VOIX = "fr-FR-RemyMultilingualNeural"; // autre voix masculine française : fr-FR-HenriNeural
const DEBIT = "-6%"; // un peu plus lent que la normale : on explique, on ne lit pas une annonce
const HAUTEUR = "+0Hz";
const PAUSES = { "(longue pause)": 1.2, "(pause)": 0.5 }; // secondes de silence
const MARGE_FIN = 0.4; // secondes de silence ajoutées après chaque scène

// ffmpeg et ffprobe sont fournis avec Remotion : rien à installer en plus.
// ponytail: chemin Windows uniquement ; sur Mac/Linux, remplacer par le dossier @remotion/compositor-<système>.
const FFMPEG = ici("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const FFPROBE = ici("node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe");

// --- Options ---
const [id, ...options] = process.argv.slice(2);
if (!id) {
  console.error("Utilisation : npm run tts -- <id-lecon> [--scene N] [--essai] [--force] [--voix NOM]");
  process.exit(1);
}
const option = (nom) => options.includes(nom);
const valeur = (nom) => (option(nom) ? options[options.indexOf(nom) + 1] : null);
const sceneVoulue = valeur("--scene") ? Number(valeur("--scene")) : null;
const voix = valeur("--voix") || VOIX;

function executer(programme, args) {
  const r = spawnSync(programme, args, { encoding: "utf8" });
  if (r.error) throw new Error(`Impossible de lancer ${programme} : ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${programme} a échoué :\n${r.stderr}`);
  return r.stdout;
}

// --- 1. Lire le script. Une scène commence par « ## Scène N — Titre ». ---
// Les lignes « > VISUEL » ne sont pas dites. Tout ce qui suit « Notes pour la relecture » est ignoré.
const md = readFileSync(ici(`scripts/${id}.md`), "utf8").replace(/\r/g, "").split("## Notes pour la relecture")[0];
const scenes = md
  .split(/^## Scène /m)
  .slice(1)
  .map((bloc) => {
    const [entete, ...lignes] = bloc.split("\n");
    const [numero, titre] = entete.split(" — ");
    const texte = lignes
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith(">") && l !== "---")
      .join(" ");
    return { numero: Number(numero), titre: titre.trim(), texte };
  });
if (!scenes.length) throw new Error(`Aucune « ## Scène » trouvée dans scripts/${id}.md`);

// --- 2. Prononciation : mots entiers, majuscules respectées, les plus longs d'abord ---
const { remplacements } = JSON.parse(readFileSync(ici("prononciation.json"), "utf8"));
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mots = Object.keys(remplacements).sort((a, b) => b.length - a.length);
const motif = new RegExp(`(?<![\\p{L}\\p{N}_])(${mots.map(echapper).join("|")})(?![\\p{L}\\p{N}_])`, "gu");
const prononcer = (texte) => texte.replace(motif, (mot) => remplacements[mot]);

// Découpe une scène en morceaux de texte et en silences, aux marques (pause) et (longue pause).
function decouper(texte) {
  return prononcer(texte)
    .split(/(\(longue pause\)|\(pause\))/)
    .map((morceau) => morceau.trim())
    .filter(Boolean)
    .map((morceau) => (morceau in PAUSES ? { silence: PAUSES[morceau] } : { texte: morceau }));
}

const dossier = ici(`public/audio/${id}/`);
mkdirSync(dossier, { recursive: true });
const duree = (fichier) => Number(executer(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fichier]));

// Où commence et où finit la voix dans un fichier (en ignorant le blanc au début et à la fin).
function partieParlee(fichier) {
  const total = duree(fichier);
  const r = spawnSync(FFMPEG, ["-hide_banner", "-i", fichier, "-af", "silencedetect=noise=-50dB:d=0.05", "-f", "null", "-"], { encoding: "utf8" });
  const debuts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const fins = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const debut = debuts[0] !== undefined && debuts[0] < 0.02 ? fins[0] : 0;
  const dernierBlanc = debuts[debuts.length - 1];
  const fin = dernierBlanc !== undefined && dernierBlanc > debut && (fins[debuts.length - 1] ?? total) >= total - 0.05 ? dernierBlanc : total;
  return { debut, fin };
}

// --- 3. Générer les scènes demandées ---
const aFaire = scenes.filter((s) => {
  if (sceneVoulue !== null) return s.numero === sceneVoulue;
  return option("--force") || !existsSync(`${dossier}scene-${s.numero}.mp3`);
});
if (sceneVoulue !== null && !aFaire.length) throw new Error(`Pas de scène ${sceneVoulue} dans le script.`);

for (const scene of aFaire) {
  const morceaux = decouper(scene.texte);
  console.log(`\nScène ${scene.numero} — ${scene.titre} (voix : ${voix})`);

  if (option("--essai")) {
    morceaux.forEach((m) => console.log(m.texte ? `  « ${m.texte} »` : `  [silence ${m.silence} s]`));
    continue;
  }

  // Chaque morceau de texte devient un petit MP3, puis ffmpeg les assemble avec les silences.
  const temporaire = mkdtempSync(join(tmpdir(), "tts-"));
  try {
    const entrees = [];
    morceaux.push({ silence: MARGE_FIN });
    morceaux.forEach((m, i) => {
      if (m.texte) {
        const fichier = join(temporaire, `${i}.mp3`);
        executer("python", ["-m", "edge_tts", "--voice", voix, `--rate=${DEBIT}`, `--pitch=${HAUTEUR}`, "--text", m.texte, "--write-media", fichier]);
        entrees.push("-i", fichier);
      } else {
        entrees.push("-f", "lavfi", "-t", String(m.silence), "-i", "anullsrc=r=24000:cl=mono");
      }
    });
    // edge-tts ajoute ~0,3 s de blanc au début et à la fin de chaque morceau : on le coupe,
    // pour que les pauses durent exactement ce qui est écrit dans le script.
    const filtres = morceaux
      .map((m, i) => {
        if (!m.texte) return `[${i}:a]anull[m${i}];`;
        const { debut, fin } = partieParlee(join(temporaire, `${i}.mp3`));
        return `[${i}:a]atrim=start=${debut}:end=${fin},asetpts=PTS-STARTPTS[m${i}];`;
      })
      .join("");
    const flux = morceaux.map((_, i) => `[m${i}]`).join("");
    const sortie = `${dossier}scene-${scene.numero}.mp3`;
    executer(FFMPEG, ["-y", "-v", "error", ...entrees, "-filter_complex", `${filtres}${flux}concat=n=${morceaux.length}:v=0:a=1[a]`, "-map", "[a]", "-c:a", "libmp3lame", "-q:a", "2", sortie]);
    console.log(`  -> scene-${scene.numero}.mp3 (${duree(sortie).toFixed(1)} s)`);
  } finally {
    rmSync(temporaire, { recursive: true, force: true });
  }
}

// --- 4. La liste des scènes pour Remotion (une scène sans audio reste affichable) ---
const liste = scenes.map((s) => {
  const fichier = `${dossier}scene-${s.numero}.mp3`;
  const present = existsSync(fichier);
  return { numero: s.numero, titre: s.titre, fichier: present ? `scene-${s.numero}.mp3` : null, duree: present ? duree(fichier) : null };
});
writeFileSync(`${dossier}scenes.json`, JSON.stringify(liste, null, 2));
if (option("--essai")) console.log("\nEssai : rien n'a été généré.");
