import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DB_PATH = resolve(process.env.TDR_DB || 'data/tdr.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS parametres (
  cle TEXT PRIMARY KEY, valeur TEXT NOT NULL, libelle TEXT, source TEXT, ordre INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS types_perdiem (
  id INTEGER PRIMARY KEY AUTOINCREMENT, libelle TEXT NOT NULL, montant INTEGER NOT NULL DEFAULT 0, source TEXT
);
CREATE TABLE IF NOT EXISTS types_transport (
  code TEXT PRIMARY KEY, libelle TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('forfait','distance','carburant','specifique')),
  montant INTEGER DEFAULT 0, regle TEXT, ordre INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS grille_distance (
  id INTEGER PRIMARY KEY AUTOINCREMENT, km_min INTEGER NOT NULL, montant INTEGER NOT NULL, libelle TEXT
);
CREATE TABLE IF NOT EXISTS bareme_mission (
  categorie INTEGER NOT NULL, zone TEXT NOT NULL, montant INTEGER NOT NULL, PRIMARY KEY (categorie, zone)
);
CREATE TABLE IF NOT EXISTS categories_personnel (
  categorie INTEGER PRIMARY KEY, description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS villes_majorees ( nom TEXT PRIMARY KEY );

CREATE TABLE IF NOT EXISTS ateliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure TEXT, projet TEXT, theme TEXT NOT NULL, reference TEXT, lieu TEXT,
  date_debut TEXT, date_fin TEXT, source_financement TEXT, beneficiaire TEXT, point_focal TEXT,
  budget_tdr INTEGER DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','valide')),
  snapshot TEXT, valide_le TEXT,
  cree_le TEXT DEFAULT (datetime('now','localtime')), modifie_le TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS atelier_perdiems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atelier_id INTEGER NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,
  ordre INTEGER, type_id INTEGER, libelle TEXT, nb_personnes REAL, nb_jours REAL, frequence REAL, mu_specifique REAL
);
CREATE TABLE IF NOT EXISTS atelier_transports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atelier_id INTEGER NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,
  ordre INTEGER, localite TEXT, type_code TEXT, distance_km REAL, nb_participants REAL, mu_specifique REAL
);
CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure TEXT, projet TEXT, objet TEXT NOT NULL, numero_om TEXT, ville TEXT, zone_geo TEXT,
  date_depart TEXT, date_retour TEXT, source_financement TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','valide')),
  snapshot TEXT, valide_le TEXT,
  cree_le TEXT DEFAULT (datetime('now','localtime')), modifie_le TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS missionnaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  ordre INTEGER, nom TEXT, fonction TEXT, categorie INTEGER, jours_specifiques REAL, nuitees_specifiques REAL
);
`);

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/* ---------------------------- Données initiales ---------------------------- */
function seed() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM parametres').get().n;
  if (n > 0) return;
  transaction(() => {
    const P = db.prepare('INSERT INTO parametres (cle, valeur, libelle, source, ordre) VALUES (?,?,?,?,?)');
    [
      ['taux_tresor_pay', '0.01', 'Taux des frais Trésor Pay', 'Instruction RAF : 1 % du montant des perdiems'],
      ['base_tresor_pay', 'perdiems', 'Base de calcul Trésor Pay (perdiems | perdiems_transport)', 'Par défaut : perdiems seuls'],
      ['prix_super', '875', 'Prix du litre de super (FCFA)', 'À METTRE À JOUR selon le prix à la pompe'],
      ['conso_litres_100km', '15', 'Consommation moyenne (L / 100 km)', 'Arrêté 020, art. 17 b)'],
      ['plancher_carburant', '25000', 'Plancher transport autorités (FCFA)', 'Arrêté 020, art. 17 b)'],
      ['coef_ar', '2', 'Coefficient aller-retour appliqué à la distance', 'Hypothèse : distance saisie = distance ALLER'],
      ['part_hebergement', '0.6', "Part du forfait mission affectée à l'hébergement", 'Hypothèse interne à valider (Note 401 : forfait global)'],
      ['base_hebergement', 'jours', 'Base de calcul hébergement (jours | nuitees)', 'Par défaut : jours'],
    ].forEach((r, i) => P.run(...r, i));

    const TP = db.prepare('INSERT INTO types_perdiem (libelle, montant, source) VALUES (?,?,?)');
    [
      ['Forfait dîner (quartier libre)', 15000, 'Pratique TDR'],
      ['Forfait déjeuner', 15000, 'Pratique TDR'],
      ['Forfait facilitation / personne-ressource', 40000, 'Pratique TDR'],
      ['Président Comité de Pilotage (par session)', 200000, 'Arrêté 020, art. 12'],
      ['Membre Comité de Pilotage (par session)', 100000, 'Arrêté 020, art. 12'],
      ['Président Comité Technique (par session)', 150000, 'Arrêté 020, art. 12'],
      ['Membre Comité Technique (par session)', 75000, 'Arrêté 020, art. 12'],
      ['Président Comité local (par session)', 100000, 'Arrêté 020, art. 12'],
      ['Membre Comité local (par session)', 50000, 'Arrêté 020, art. 12'],
      ['Membre Commission ouverture plis / jugement offres (par AO)', 75000, 'Arrêté 020, art. 11'],
      ["Frais de mission Côte d'Ivoire (forfait/jour)", 60000, 'Arrêté 020, art. 17 a)'],
      ['Autre (saisir le montant spécifique)', 0, 'Montant spécifique obligatoire'],
    ].forEach((r) => TP.run(...r));

    const TT = db.prepare('INSERT INTO types_transport (code, libelle, mode, montant, regle, ordre) VALUES (?,?,?,?,?,?)');
    [
      ['ABJ_COMMUNE', "Commune d'Abidjan", 'forfait', 10000, 'Forfait unique, non justifiable'],
      ['INTRA_VILLE', 'Intra-ville (intérieur)', 'forfait', 5000, 'Forfait unique A/R, non justifiable'],
      ['PERIPH_ABJ', "Périphérie d'Abidjan (Dabou, Bassam, Bingerville, Anyama)", 'forfait', 15000, 'Forfait unique A/R, non justifiable'],
      ['DISTANCE', 'Selon distance – sans véhicule administratif', 'distance', 0, 'Grille selon la distance'],
      ['CARBURANT', 'Véhicule administratif / autorités (calcul carburant)', 'carburant', 0, 'km x A/R x 15 L/100 km x prix super, min. 25 000'],
      ['COMITE_LOCAL', 'Autorité membre comité local de suivi / exécution', 'forfait', 100000, 'Forfait art. 17 b)'],
      ['SPECIFIQUE', 'Montant spécifique (saisir)', 'specifique', 0, 'Montant spécifique obligatoire'],
    ].forEach((r, i) => TT.run(...r, i));

    const G = db.prepare('INSERT INTO grille_distance (km_min, montant, libelle) VALUES (?,?,?)');
    [[0, 20000, 'De 0 à 150 km'], [151, 30000, 'De 151 à 300 km'], [301, 40000, 'De 301 à 450 km'],
      [451, 45000, 'De 451 à 600 km'], [601, 50000, 'Supérieur à 600 km']].forEach((r) => G.run(...r));

    const B = db.prepare('INSERT INTO bareme_mission (categorie, zone, montant) VALUES (?,?,?)');
    const zones = ['CI_AUTRES', 'CI_MAJOREE', 'AFRIQUE', 'MONDE'];
    [[1, 60000, 60000, 170000, 200000], [2, 49000, 55000, 150000, 175000], [3, 43000, 45000, 130000, 150000]]
      .forEach(([c, ...m]) => m.forEach((v, i) => B.run(c, zones[i], v)));

    const C = db.prepare('INSERT INTO categories_personnel (categorie, description) VALUES (?,?)');
    C.run(1, "Coordonnateurs, Responsables d'administrations centrales");
    C.run(2, "Personnel clé (hors coordonnateurs), services du Contrôle Financier, Agence Comptable, Responsables d'administrations régionales et départementales et assimilés");
    C.run(3, 'Comptables, Assistants projets, Assistants passation, Assistants Sauvegardes Sociales, Secrétaires, chauffeurs, autres agents et assimilés');

    const V = db.prepare('INSERT INTO villes_majorees (nom) VALUES (?)');
    ['Abidjan', 'Yamoussoukro', 'San Pedro', 'San-Pédro', 'San-Pedro', 'Assinie'].forEach((v) => V.run(v));

    // Exemple d'atelier (TDR PRSEB – Activité 2.1.1)
    const a = db.prepare(`INSERT INTO ateliers (structure, projet, theme, reference, lieu, date_debut, date_fin,
      source_financement, beneficiaire, point_focal, budget_tdr) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      'DMOSS – Direction de la Mutualité et des Œuvres Sociales en milieu Scolaire',
      'PRSEB – Programme de Renforcement du Système Éducatif de Base',
      'Renforcement de capacités des acteurs locaux de suivi (DRENA, DR Santé, DRFFE, DD Santé, Coordo CEC/CS et IDE) et opérationnels de la visite médicale des apprenants du préscolaire, pré-primaire et CP1 dans les zones du PRSEB',
      'Activité 2.1.1 – PTBA 2026-2027', 'Yamoussoukro', '2026-10-18', '2026-10-24',
      'Bailleur (IDA / Banque mondiale)', 'Séka née ASSAMOUA', "Dr N'fah SANDOKO, S/D Education pour la Santé – DMOSS", 23235050);
    const aid = a.lastInsertRowid;
    const AP = db.prepare('INSERT INTO atelier_perdiems (atelier_id, ordre, type_id, libelle, nb_personnes, nb_jours, frequence) VALUES (?,?,?,?,?,?,?)');
    [[1, 'Forfait dîners quartier libre – Equipe de coordination', 17, 6], [1, 'Forfait dîners quartier libre – Participants chargés du suivi et Directeurs centraux', 72, 2],
      [1, 'Forfait dîners quartier libre – Participants chargés de la mise en œuvre', 165, 4], [3, 'Forfaits de facilitation (personnes-ressources)', 8, 1]]
      .forEach(([t, l, n, j], i) => AP.run(aid, i, t, l, n, j, 1));
    const AT = db.prepare('INSERT INTO atelier_transports (atelier_id, ordre, localite, type_code, distance_km, nb_participants) VALUES (?,?,?,?,?,?)');
    [['AGBOVILLE', 230, 17], ['TIASSALE', 140, 12], ['ODIENNE', 620, 22], ['MINIGNAN', 650, 13], ['TOUBA', 610, 22], ['MAN', 470, 27],
      ['DANANE', 420, 17], ['DUEKOUE', 260, 30], ['GUIGLO', 290, 20], ['DALOA', 145, 25], ['ISSIA', 170, 11], ['FERKESSEDOGOU', 400, 19],
      ["ABIDJAN (Comité d'organisation)", 240, 17]].forEach(([l, km, n], i) => AT.run(aid, i, l, 'DISTANCE', km, n));

    // Exemple de mission
    const m = db.prepare(`INSERT INTO missions (structure, projet, objet, numero_om, ville, zone_geo, date_depart, date_retour, source_financement)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      'DMOSS – Direction de la Mutualité et des Œuvres Sociales en milieu Scolaire',
      'PRSEB – Programme de Renforcement du Système Éducatif de Base',
      'Supervision de la visite médicale des apprenants du préscolaire et du CP1 dans la DRENA de Man',
      'OM n°___/DMOSS/2026', 'Man', "Côte d'Ivoire", '2026-11-16', '2026-11-20', 'Bailleur (IDA / Banque mondiale)');
    const MM = db.prepare('INSERT INTO missionnaires (mission_id, ordre, nom, fonction, categorie) VALUES (?,?,?,?,?)');
    [['KOUASSI Yao Jean', 'Coordonnateur', 1], ['TRAORE Aminata', 'Spécialiste suivi-évaluation', 2], ['BAMBA Moussa', 'Chauffeur', 3]]
      .forEach(([n, f, c], i) => MM.run(m.lastInsertRowid, i, n, f, c));
  });
}
seed();

/* ---------------------------- Référentiel ---------------------------- */
export function referentiel() {
  const parametres = {};
  const parametresListe = db.prepare('SELECT * FROM parametres ORDER BY ordre').all();
  for (const p of parametresListe) parametres[p.cle] = p.valeur;
  return {
    parametres,
    parametresListe,
    typesPerdiem: db.prepare('SELECT * FROM types_perdiem ORDER BY id').all(),
    typesTransport: db.prepare('SELECT * FROM types_transport ORDER BY ordre').all(),
    grilleDistance: db.prepare('SELECT * FROM grille_distance ORDER BY km_min').all(),
    baremeMission: db.prepare('SELECT * FROM bareme_mission ORDER BY categorie, zone').all(),
    categories: db.prepare('SELECT * FROM categories_personnel ORDER BY categorie').all(),
    villesMajorees: db.prepare('SELECT * FROM villes_majorees ORDER BY nom').all(),
  };
}
