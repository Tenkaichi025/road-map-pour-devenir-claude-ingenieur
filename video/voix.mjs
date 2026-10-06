// Choisir la voix (ne consomme aucun crédit).
//
//   npm run voix                                   cherche des voix masculines françaises et crée out/voix.html pour les écouter
//   npm run voix -- ajouter <owner_id> <voice_id>  ajoute la voix choisie à ton compte ElevenLabs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ici = (chemin) => fileURLToPath(new URL(chemin, import.meta.url));
try {
  process.loadEnvFile(ici("../.env"));
} catch {
  throw new Error("Fichier .env introuvable à la racine du projet. Copie .env.example en .env et mets ta clé.");
}
const cle = process.env.ELEVENLABS_API_KEY;
if (!cle) throw new Error("ELEVENLABS_API_KEY est vide dans .env.");

async function api(chemin, options = {}) {
  const reponse = await fetch(`https://api.elevenlabs.io${chemin}`, {
    ...options,
    headers: { "xi-api-key": cle, "Content-Type": "application/json" },
  });
  if (!reponse.ok) throw new Error(`ElevenLabs a répondu ${reponse.status} : ${await reponse.text()}`);
  return reponse.json();
}

const [action, ownerId, voiceId] = process.argv.slice(2);

if (action === "ajouter") {
  if (!ownerId || !voiceId) throw new Error("Utilisation : npm run voix -- ajouter <owner_id> <voice_id>");
  const { voice_id } = await api(`/v1/voices/add/${encodeURIComponent(ownerId)}/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    body: JSON.stringify({ new_name: "Narrateur Ingénieur Claude" }),
  });
  console.log(`Voix ajoutée à ton compte. Mets cette ligne dans .env :\n\nELEVENLABS_VOICE_ID=${voice_id}\n`);
  process.exit(0);
}

// Les voix les plus utilisées en premier : c'est un bon indice de qualité.
const params = new URLSearchParams({ language: "fr", gender: "male", page_size: "40", sort: "cloned_by_count" });
const { voices } = await api(`/v1/shared-voices?${params}`);
const francaises = voices.filter((v) => v.language === "fr" && v.gender === "male").slice(0, 12);
if (!francaises.length) throw new Error("Aucune voix trouvée : la recherche a peut-être changé côté ElevenLabs.");

// Les textes viennent d'ElevenLabs (écrits par d'autres utilisateurs) : on les échappe avant de les mettre en HTML.
const echapper = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const extrait = (v) => v.verified_languages?.find((l) => l.language === "fr" && l.preview_url)?.preview_url || v.preview_url;

const lignes = francaises.map((v) => {
  console.log(`${v.name} · ${v.accent ?? "?"} · ${v.age ?? "?"} · ${v.use_case ?? "?"}\n  ${v.description?.slice(0, 110) ?? ""}\n  npm run voix -- ajouter ${v.public_owner_id} ${v.voice_id}\n`);
  return `<section>
  <h2>${echapper(v.name)} <small>${echapper([v.accent, v.age, v.use_case, v.descriptive].filter(Boolean).join(" · "))}</small></h2>
  <p>${echapper(v.description)}</p>
  <audio controls preload="none" src="${echapper(extrait(v))}"></audio>
  <pre>npm run voix -- ajouter ${echapper(v.public_owner_id)} ${echapper(v.voice_id)}</pre>
</section>`;
});

mkdirSync(ici("out"), { recursive: true });
writeFileSync(
  ici("out/voix.html"),
  `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Choisir la voix</title>
<style>body{font:16px/1.5 Georgia,serif;max-width:46rem;margin:2rem auto;padding:0 1rem;background:#f3efe6;color:#1a1a18}
section{border-top:1px solid #d9d3c5;padding:1rem 0}h2{font:700 1.2rem Arial,sans-serif;margin:0}small{font-weight:400;color:#6b675e}
audio{width:100%}pre{background:#1f1e1b;color:#ece7dc;padding:.5rem;overflow-x:auto}</style>
<h1>Voix masculines françaises</h1><p>Écoute les extraits. Puis copie la commande sous ta voix préférée dans le terminal.</p>
${lignes.join("\n")}</html>`
);
console.log(`Page d'écoute créée : ${ici("out/voix.html")}`);
