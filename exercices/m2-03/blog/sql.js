// Exécute une requête SQL sur blog.db et affiche le résultat sous forme de tableau.
// Exemple : node sql.js "SELECT id, titre, publie FROM articles"
const db = require("./base.js");

const requete = process.argv[2];
if (!requete) {
  console.log('Utilisation : node sql.js "SELECT * FROM articles"');
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
