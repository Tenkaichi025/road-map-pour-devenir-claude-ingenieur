// Déclare une vidéo par leçon. Sa durée = la somme des durées de la voix de chaque scène.
import { Composition, staticFile } from "remotion";
import { Lecon } from "./Lecon.jsx";

const FPS = 30;
const SANS_AUDIO = 3; // secondes affichées pour une scène dont l'audio n'est pas encore généré
const LECONS = ["m1-01"];

async function calculerMetadonnees({ props }) {
  const reponse = await fetch(staticFile(`audio/${props.id}/scenes.json`));
  if (!reponse.ok) throw new Error(`Lance d'abord : npm run tts -- ${props.id} --essai`);
  const scenes = (await reponse.json()).map((s) => ({ ...s, images: Math.ceil((s.duree ?? SANS_AUDIO) * FPS) }));
  return {
    durationInFrames: scenes.reduce((total, s) => total + s.images, 0),
    props: { ...props, scenes },
  };
}

export function Racine() {
  return LECONS.map((id) => (
    <Composition
      key={id}
      id={id}
      component={Lecon}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={1}
      defaultProps={{ id, scenes: [] }}
      calculateMetadata={calculerMetadonnees}
    />
  ));
}
