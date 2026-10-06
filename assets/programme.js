// LE PROGRAMME : seul endroit qui définit l'ordre des modules et des leçons.
// Pour ajouter une leçon :
//   1. copie lecons/_modele.html dans lecons/<id>.html (ex. lecons/m1-01.html)
//   2. ajoute une ligne ici, avec pret: true quand la page est rédigée.
// L'id sert aussi de clé pour la progression : ne le change plus une fois publié.
const PROGRAMME = [
  {
    titre: "Front-end",
    sousTitre: "Comprendre ce qui s'affiche",
    lecons: [
      { id: "m1-01", titre: "Comment une page s'affiche", pret: true },
      { id: "m1-02", titre: "HTML : la structure et le sens", pret: true },
      { id: "m1-03", titre: "CSS et responsive", pret: true },
      { id: "m1-04", titre: "JavaScript et le DOM", pret: true },
      { id: "m1-05", titre: "Diagnostiquer avec les outils du navigateur", pret: true },
    ],
  },
  {
    titre: "Back-end",
    sousTitre: "Ce qui se passe derrière",
    lecons: [
      { id: "m2-01", titre: "Le cycle requête-réponse", pret: true },
      { id: "m2-02", titre: "Une API REST et le JSON", pret: true },
      { id: "m2-03", titre: "Conserver les données avec SQLite", pret: true },
      { id: "m2-04", titre: "Authentifier les utilisateurs", pret: true },
    ],
  },
  {
    titre: "Sécurité",
    sousTitre: "Ce que l'IA oublie souvent",
    lecons: [
      { id: "m3-01", titre: "L'injection SQL", pret: false },
      { id: "m3-02", titre: "L'injection dans la page (XSS)", pret: false },
      { id: "m3-03", titre: "Variables d'environnement et secrets", pret: false },
      { id: "m3-04", titre: "HTTPS", pret: false },
      { id: "m3-05", titre: "Authentification sécurisée et droits d'accès", pret: false },
    ],
  },
  {
    titre: "Ingénieur Claude",
    sousTitre: "Piloter l'IA et valider son travail",
    lecons: [
      { id: "m4-01", titre: "Git, ton filet de sécurité", pret: false },
      { id: "m4-02", titre: "Cadrer un prompt et le contexte", pret: false },
      { id: "m4-03", titre: "Découper les tâches", pret: false },
      { id: "m4-04", titre: "Relire et challenger le code", pret: false },
      { id: "m4-05", titre: "Les tests verts qui ne prouvent rien", pret: false },
      { id: "m4-06", titre: "Créer tes propres skills", pret: false },
    ],
  },
];
