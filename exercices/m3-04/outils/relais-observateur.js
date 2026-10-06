// Se place « entre » ton navigateur et TON serveur, sur ta machine, et affiche ce qui passe.
// Il montre ce que verrait un intermédiaire (le Wi-Fi d'un maquis, par exemple) sur ton propre trafic.
// Il n'écoute que sur 127.0.0.1 : il ne voit rien d'autre que les connexions que tu lui envoies.
//
// Usage : node relais-observateur.js <port d'écoute> <port du serveur>
//   HTTP  : node relais-observateur.js 4011 3011   puis ouvre http://127.0.0.1:4011
//   HTTPS : node relais-observateur.js 4443 3443   puis ouvre https://127.0.0.1:4443
const net = require("node:net");

const [ecoute, cible] = process.argv.slice(2).map(Number);
if (!ecoute || !cible) {
  console.log("Utilisation : node relais-observateur.js <port d'écoute> <port du serveur>");
  process.exit(1);
}

// Affiche les octets : les caractères lisibles tels quels, les autres remplacés par des points.
function montrer(sens, octets) {
  const texte = octets.toString("latin1").replace(/[^\x20-\x7E\n]/g, ".");
  console.log(`\n── ${sens} (${octets.length} octets)\n${texte.slice(0, 700)}${texte.length > 700 ? "\n[…]" : ""}`);
}

net
  .createServer((navigateur) => {
    const serveur = net.connect(cible, "127.0.0.1");
    navigateur.on("data", (octets) => montrer("navigateur → serveur", octets));
    serveur.on("data", (octets) => montrer("serveur → navigateur", octets));
    navigateur.pipe(serveur);
    serveur.pipe(navigateur);
    navigateur.on("error", () => serveur.destroy());
    serveur.on("error", () => navigateur.destroy());
  })
  .listen(ecoute, "127.0.0.1", () => console.log(`Relais prêt : 127.0.0.1:${ecoute} → 127.0.0.1:${cible}`));
