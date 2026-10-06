// Hachage des mots de passe avec scrypt, fourni par node:crypto (rien à installer).
const crypto = require("node:crypto");

// Transforme un mot de passe en « sel:empreinte ». Impossible de revenir au mot de passe.
function hacher(motDePasse) {
  const sel = crypto.randomBytes(16); // un sel différent pour chaque compte
  const empreinte = crypto.scryptSync(motDePasse, sel, 64); // lent exprès : décourage les essais en masse
  return `${sel.toString("hex")}:${empreinte.toString("hex")}`;
}

// Recalcule l'empreinte avec le même sel, et compare.
function verifierMotDePasse(motDePasse, stocke) {
  const [selHex, empreinteHex] = stocke.split(":");
  const attendue = Buffer.from(empreinteHex, "hex");
  const calculee = crypto.scryptSync(motDePasse, Buffer.from(selHex, "hex"), 64);
  return crypto.timingSafeEqual(attendue, calculee); // comparaison en temps constant
}

module.exports = { hacher, verifierMotDePasse };
