// Crée un certificat auto-signé pour 127.0.0.1, valable 30 jours. Pour les tests en local UNIQUEMENT.
// Usage : node creer-certificat.js
// En ligne, ton hébergeur ou Let's Encrypt fournissent un vrai certificat, reconnu par tous les navigateurs.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const cle = path.join(__dirname, "cle.pem"); // la clé privée : un secret, ignoré par git
const cert = path.join(__dirname, "cert.pem"); // le certificat : public

if (fs.existsSync(cle) && fs.existsSync(cert)) {
  console.log("Le certificat existe déjà (cle.pem et cert.pem).");
  process.exit(0);
}

// openssl est fourni avec Git pour Windows.
const candidats = ["openssl", "C:/Program Files/Git/mingw64/bin/openssl.exe", "C:/Program Files/Git/usr/bin/openssl.exe"];
const args = ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", cle, "-out", cert, "-days", "30",
  "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"];

for (const openssl of candidats) {
  try {
    execFileSync(openssl, args, { stdio: "ignore" });
    console.log("Certificat créé : cert.pem (public) et cle.pem (clé privée, à ne jamais partager).");
    process.exit(0);
  } catch {
    // on essaie le suivant
  }
}
console.log("openssl est introuvable. Installe Git pour Windows (il le fournit), puis relance ce script.");
process.exit(1);
