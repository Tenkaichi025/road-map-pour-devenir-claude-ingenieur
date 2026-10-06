// Le blog, « amélioré » par une IA : ajout d'une recherche, et « correction » d'erreurs de base de données.
// Lancer : node serveur.js   puis ouvrir http://localhost:3005/api/articles
const http = require("node:http");
const { ouvrir } = require("./base.js");

const PORT = 3005;

function repondre(res, code, donnees) {
  if (donnees === undefined) {
    res.writeHead(code);
    return res.end();
  }
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(donnees, null, 2));
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let texte = "";
    req.on("data", (morceau) => (texte += morceau));
    req.on("end", () => {
      try {
        resolve(JSON.parse(texte));
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
  });
}

const texteValide = (v) => typeof v === "string" && v.trim() !== "";

const serveur = http.createServer(async (req, res) => {
  console.log(req.method, req.url);
  const { pathname, searchParams } = new URL(req.url, `http://localhost:${PORT}`);
  const db = ouvrir();
  const sql = {
    articlesPublies: db.prepare("SELECT id, titre FROM articles WHERE publie = 1 ORDER BY id"),
    articlePublie: db.prepare("SELECT id, titre, contenu FROM articles WHERE id = ? AND publie = 1"),
    commentairesDe: db.prepare("SELECT id, auteur, texte FROM commentaires WHERE article_id = ? ORDER BY id"),
    ajouterArticle: db.prepare("INSERT INTO articles (titre, contenu, publie) VALUES (?, ?, ?)"),
    ajouterCommentaire: db.prepare("INSERT INTO commentaires (article_id, auteur, texte) VALUES (?, ?, ?)"),
    supprimerArticle: db.prepare("DELETE FROM articles WHERE id = ?"),
  };

  // GET /api/recherche?q=... : chercher dans les titres des articles publiés
  if (req.method === "GET" && pathname === "/api/recherche") {
    const q = searchParams.get("q") || "";
    const resultats = db.prepare(`SELECT id, titre FROM articles WHERE publie = 1 AND titre LIKE '%${q}%' ORDER BY id`).all();
    return repondre(res, 200, resultats);
  }

  // GET /api/articles : les articles publiés (jamais les brouillons)
  if (req.method === "GET" && pathname === "/api/articles") {
    return repondre(res, 200, sql.articlesPublies.all());
  }

  // POST /api/articles : créer un article
  if (req.method === "POST" && pathname === "/api/articles") {
    let a;
    try {
      a = await lireCorps(req);
    } catch {
      return repondre(res, 400, { erreur: "Le corps de la requête n'est pas du JSON valide." });
    }
    if (!a || !texteValide(a.titre) || !texteValide(a.contenu) || typeof a.publie !== "boolean") {
      return repondre(res, 400, { erreur: "Il faut un titre, un contenu, et publie à true ou false." });
    }
    const { lastInsertRowid } = sql.ajouterArticle.run(a.titre, a.contenu, a.publie ? 1 : 0);
    return repondre(res, 201, { id: lastInsertRowid, titre: a.titre, contenu: a.contenu, publie: a.publie });
  }

  // /api/articles/12 et /api/articles/12/commentaires
  const trouve = pathname.match(/^\/api\/articles\/(\d+)(\/commentaires)?$/);
  if (trouve) {
    const id = Number(trouve[1]);

    if (req.method === "GET" && !trouve[2]) {
      const article = sql.articlePublie.get(id); // undefined si absent ou brouillon
      if (!article) return repondre(res, 404, { erreur: "Article introuvable." });
      return repondre(res, 200, { ...article, commentaires: sql.commentairesDe.all(id) });
    }

    if (req.method === "POST" && trouve[2]) {
      let c;
      try {
        c = await lireCorps(req);
      } catch {
        return repondre(res, 400, { erreur: "Le corps de la requête n'est pas du JSON valide." });
      }
      if (!c || !texteValide(c.auteur) || !texteValide(c.texte)) {
        return repondre(res, 400, { erreur: "Il faut un auteur et un texte." });
      }
      const { lastInsertRowid } = sql.ajouterCommentaire.run(id, c.auteur, c.texte);
      return repondre(res, 201, { id: lastInsertRowid, article_id: id, auteur: c.auteur, texte: c.texte });
    }

    if (req.method === "DELETE" && !trouve[2]) {
      const { changes } = sql.supprimerArticle.run(id); // ses commentaires partent avec lui (ON DELETE CASCADE)
      return changes === 0 ? repondre(res, 404, { erreur: "Article introuvable." }) : repondre(res, 204);
    }
  }

  repondre(res, 404, { erreur: "Cette adresse n'existe pas." });
});

serveur.listen(PORT, () => console.log(`Blog prêt : http://localhost:${PORT}/api/articles`));
