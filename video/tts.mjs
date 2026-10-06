// Transforme le script d'une leçon en audio, scène par scène, avec ElevenLabs.
//
//   npm run tts -- m1-01 --essai        affiche le texte envoyé, sans rien dépenser
//   npm run tts -- m1-01 --scene 1      génère seulement la scène 1
//   npm run tts -- m1-01                génère les scènes qui n'existent pas encore
//   npm run tts -- m1-01 --force        regénère tout (coûte des crédits)
//
// Écrit dans public/audio/<id>/ : scene-N.mp3, scene-N.json (durée + timing de chaque caractère)
// et scenes.json (la liste lue par Remotion).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ici = (chemin) => fileURLToPath(new URL(chemin, import.meta.url));

// --- Réglages de la voix : c'est ici qu'on ajuste à l'oreille ---
const MODELE = "eleven_multilingual_v2"; // le modèle qui gère le mieux le français ET les balises <break>
const REGLAGES = {
  stability: 0.45, // plus bas = plus expressif mais moins régulier
  similarity_boost: 0.8,
  style: 0.15, // un peu d'intention, sans théâtre
  use_speaker_boost: true,
};
const PAUSES = { "(longue pause)": '<break time="1.2s" />', "(pause)": '<break time="0.5s" />' };
const MARGE_FIN = 0.4; // secondes de silence ajoutées après chaque scène

// --- Options ---
const [id, ...options] = process.argv.slice(2);
if (!id) {
  console.error("Utilisation : npm run tts -- <id-lecon> [--scene N] [--essai] [--force]");
  process.exit(1);
}
const option = (nom) => options.includes(nom);
const sceneVoulue = option("--scene") ? Number(options[options.indexOf("--scene") + 1]) : null;

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
const avecPauses = (texte) => Object.entries(PAUSES).reduce((t, [marque, balise]) => t.replaceAll(marque, balise), texte);
const sansPauses = (texte) => Object.keys(PAUSES).reduce((t, marque) => t.replaceAll(marque, ""), texte).replace(/\s+/g, " ");

const dossier = ici(`public/audio/${id}/`);
mkdirSync(dossier, { recursive: true });

// --- 3. Générer les scènes demandées ---
const aFaire = scenes.filter((s) => {
  if (sceneVoulue !== null) return s.numero === sceneVoulue;
  return option("--force") || !existsSync(`${dossier}scene-${s.numero}.mp3`);
});
if (sceneVoulue !== null && !aFaire.length) throw new Error(`Pas de scène ${sceneVoulue} dans le script.`);

let cle, voix;
if (!option("--essai") && aFaire.length) {
  try {
    process.loadEnvFile(ici("../.env"));
  } catch {
    throw new Error("Fichier .env introuvable à la racine du projet. Copie .env.example en .env et remplis-le.");
  }
  cle = process.env.ELEVENLABS_API_KEY;
  voix = process.env.ELEVENLABS_VOICE_ID;
  if (!cle || !voix) throw new Error("ELEVENLABS_API_KEY ou ELEVENLABS_VOICE_ID est vide dans .env.");
}

let caracteres = 0;
for (const scene of aFaire) {
  const i = scenes.indexOf(scene);
  const texte = avecPauses(prononcer(scene.texte));
  caracteres += texte.length;
  console.log(`\nScène ${scene.numero} — ${scene.titre} (${texte.length} caractères)`);

  if (option("--essai")) {
    console.log(texte);
    continue;
  }

  // Les scènes voisines servent de contexte : l'intonation reste continue d'une scène à l'autre.
  const voisine = (s) => (s ? sansPauses(prononcer(s.texte)) : undefined);
  const reponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voix)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": cle, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: texte,
        model_id: MODELE,
        voice_settings: REGLAGES,
        previous_text: voisine(scenes[i - 1]),
        next_text: voisine(scenes[i + 1]),
      }),
    }
  );
  if (!reponse.ok) {
    // Le message d'ElevenLabs ne contient jamais la clé : on peut l'afficher.
    throw new Error(`ElevenLabs a refusé la scène ${scene.numero} (code ${reponse.status}) : ${await reponse.text()}`);
  }
  const { audio_base64, alignment } = await reponse.json();
  const fins = alignment.character_end_times_seconds;
  const duree = fins[fins.length - 1] + MARGE_FIN;
  writeFileSync(`${dossier}scene-${scene.numero}.mp3`, Buffer.from(audio_base64, "base64"));
  writeFileSync(`${dossier}scene-${scene.numero}.json`, JSON.stringify({ duree, alignement: alignment }));
  console.log(`  -> scene-${scene.numero}.mp3 (${duree.toFixed(1)} s)`);
}

// --- 4. La liste des scènes pour Remotion (une scène sans audio reste affichable) ---
const liste = scenes.map((s) => {
  const infos = `${dossier}scene-${s.numero}.json`;
  const present = existsSync(infos);
  return {
    numero: s.numero,
    titre: s.titre,
    fichier: present ? `scene-${s.numero}.mp3` : null,
    duree: present ? JSON.parse(readFileSync(infos, "utf8")).duree : null,
  };
});
writeFileSync(`${dossier}scenes.json`, JSON.stringify(liste, null, 2));

console.log(
  option("--essai")
    ? `\nEssai : ${caracteres} caractères seraient envoyés. Rien n'a été dépensé.`
    : `\nTerminé : ${aFaire.length} scène(s), environ ${caracteres} caractères utilisés.`
);
