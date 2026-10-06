// Exécute une requête SQL sur membres.db et affiche le résultat sous forme de tableau.
// Exemple : node sql.js "SELECT id, email, hash FROM utilisateurs"
const db = require("./base.js");

const requete = process.argv[2];
if (!requete) {
  console.log('Utilisation : node sql.js "SELECT * FROM utilisateurs"');
  process.exit(1);
}

try {
  const instruction = db.prepare(requete);
  if (/^\s*(SELECT|PRAGMA|WITH)/i.test(requete)) {
    console.table(instruction.all());
  } else {
    const resultat = instruction.run();
    console.log(`${resultat.changes} ligne(s) modifiée(s).`);
  }
} catch (erreur) {
  console.error("Erreur SQL :", erreur.message);
  process.exitCode = 1;
} finally {
  db.close();
}
