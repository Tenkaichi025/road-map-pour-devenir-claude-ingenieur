// Enchaîne les scènes d'une leçon, chacune avec son audio.
import { AbsoluteFill, Audio, Series, interpolate, staticFile, useCurrentFrame } from "remotion";

const C = { papier: "#f3efe6", encre: "#1a1a18", gris: "#6b675e", laterite: "#b9431f" };

export function Lecon({ id, scenes }) {
  return (
    <AbsoluteFill style={{ background: C.papier }}>
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence key={scene.numero} durationInFrames={scene.images}>
            {scene.fichier && <Audio src={staticFile(`audio/${id}/${scene.fichier}`)} />}
            <Carton scene={scene} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
}

// Écran provisoire : il sera remplacé par les animations de chaque scène, une fois la voix validée.
function Carton({ scene }) {
  const image = useCurrentFrame();
  const apparition = interpolate(image, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 220, fontFamily: "Arial Narrow, Arial, sans-serif" }}>
      <div style={{ position: "absolute", left: 100, top: 0, bottom: 0, width: 14, background: C.laterite }} />
      <div style={{ opacity: apparition }}>
        <div style={{ fontSize: 34, letterSpacing: 6, color: C.laterite, fontWeight: 700 }}>SCÈNE {scene.numero}</div>
        <div style={{ fontSize: 110, fontWeight: 800, color: C.encre, lineHeight: 1 }}>{scene.titre}</div>
        {!scene.fichier && <div style={{ fontSize: 32, color: C.gris, marginTop: 24 }}>audio pas encore généré</div>}
      </div>
    </AbsoluteFill>
  );
}
