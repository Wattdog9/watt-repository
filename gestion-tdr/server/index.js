import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, transaction, referentiel } from './db.js';
import { calculAtelier, calculMission } from '../shared/calculs.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// node:sqlite refuse `undefined` : on convertit en null, et les chaînes vides en null pour les nombres.
const v = (x) => (x === undefined || x === '' ? null : x);
const parseSnap = (row) => (row && row.snapshot ? { ...row, snapshot: JSON.parse(row.snapshot) } : row);
const err = (res, code, message) => res.status(code).json({ erreur: message });

/* ------------------------------ Référentiel ------------------------------ */
app.get('/api/referentiel', (_req, res) => res.json(referentiel()));

app.put('/api/referentiel', (req, res) => {
  const b = req.body || {};
  transaction(() => {
    if (Array.isArray(b.parametresListe)) {
      const st = db.prepare('UPDATE parametres SET valeur = ? WHERE cle = ?');
      b.parametresListe.forEach((p) => st.run(String(p.valeur ?? ''), p.cle));
    }
    if (Array.isArray(b.typesPerdiem)) {
      const ids = b.typesPerdiem.filter((t) => t.id).map((t) => Number(t.id));
      const existants = db.prepare('SELECT id FROM types_perdiem').all().map((r) => r.id);
      existants.filter((id) => !ids.includes(id)).forEach((id) => db.prepare('DELETE FROM types_perdiem WHERE id = ?').run(id));
      for (const t of b.typesPerdiem) {
        if (!t.libelle) continue;
        if (t.id) db.prepare('UPDATE types_perdiem SET libelle=?, montant=?, source=? WHERE id=?').run(t.libelle, Number(t.montant) || 0, v(t.source), t.id);
        else db.prepare('INSERT INTO types_perdiem (libelle, montant, source) VALUES (?,?,?)').run(t.libelle, Number(t.montant) || 0, v(t.source));
      }
    }
    if (Array.isArray(b.typesTransport)) {
      const st = db.prepare('UPDATE types_transport SET libelle=?, montant=?, regle=? WHERE code=?');
      b.typesTransport.forEach((t) => st.run(t.libelle, Number(t.montant) || 0, v(t.regle), t.code));
    }
    if (Array.isArray(b.grilleDistance)) {
      db.prepare('DELETE FROM grille_distance').run();
      const st = db.prepare('INSERT INTO grille_distance (km_min, montant, libelle) VALUES (?,?,?)');
      b.grilleDistance.forEach((g) => st.run(Number(g.km_min) || 0, Number(g.montant) || 0, v(g.libelle)));
    }
    if (Array.isArray(b.baremeMission)) {
      const st = db.prepare('UPDATE bareme_mission SET montant=? WHERE categorie=? AND zone=?');
      b.baremeMission.forEach((x) => st.run(Number(x.montant) || 0, x.categorie, x.zone));
    }
    if (Array.isArray(b.villesMajorees)) {
      db.prepare('DELETE FROM villes_majorees').run();
      const st = db.prepare('INSERT OR IGNORE INTO villes_majorees (nom) VALUES (?)');
      b.villesMajorees.filter((x) => x.nom && x.nom.trim()).forEach((x) => st.run(x.nom.trim()));
    }
  });
  res.json(referentiel());
});

/* -------------------------------- Ateliers -------------------------------- */
const CHAMPS_ATELIER = ['structure', 'projet', 'theme', 'reference', 'lieu', 'date_debut', 'date_fin', 'source_financement', 'beneficiaire', 'point_focal', 'budget_tdr'];

function lireAtelier(id) {
  const a = parseSnap(db.prepare('SELECT * FROM ateliers WHERE id = ?').get(id));
  if (!a) return null;
  a.perdiems = db.prepare('SELECT * FROM atelier_perdiems WHERE atelier_id = ? ORDER BY ordre').all(id);
  a.transports = db.prepare('SELECT * FROM atelier_transports WHERE atelier_id = ? ORDER BY ordre').all(id);
  return a;
}

function ecrireLignesAtelier(id, body) {
  db.prepare('DELETE FROM atelier_perdiems WHERE atelier_id = ?').run(id);
  db.prepare('DELETE FROM atelier_transports WHERE atelier_id = ?').run(id);
  const P = db.prepare('INSERT INTO atelier_perdiems (atelier_id, ordre, type_id, libelle, nb_personnes, nb_jours, frequence, mu_specifique) VALUES (?,?,?,?,?,?,?,?)');
  (body.perdiems || []).filter((l) => l.libelle || l.type_id).forEach((l, i) =>
    P.run(id, i, v(l.type_id), v(l.libelle), v(l.nb_personnes), v(l.nb_jours), v(l.frequence), v(l.mu_specifique)));
  const T = db.prepare('INSERT INTO atelier_transports (atelier_id, ordre, localite, type_code, distance_km, nb_participants, mu_specifique) VALUES (?,?,?,?,?,?,?)');
  (body.transports || []).filter((l) => l.localite || l.type_code).forEach((l, i) =>
    T.run(id, i, v(l.localite), v(l.type_code), v(l.distance_km), v(l.nb_participants), v(l.mu_specifique)));
}

app.get('/api/ateliers', (_req, res) => {
  const ref = referentiel();
  const liste = db.prepare('SELECT id FROM ateliers ORDER BY id DESC').all().map(({ id }) => {
    const a = lireAtelier(id);
    const total = a.statut === 'valide' ? a.snapshot.calcul.totalGeneral : calculAtelier(a, ref).totalGeneral;
    return { id, theme: a.theme, lieu: a.lieu, date_debut: a.date_debut, date_fin: a.date_fin, source_financement: a.source_financement, statut: a.statut, total };
  });
  res.json(liste);
});

app.get('/api/ateliers/:id', (req, res) => {
  const a = lireAtelier(req.params.id);
  return a ? res.json(a) : err(res, 404, 'Atelier introuvable');
});

app.post('/api/ateliers', (req, res) => {
  if (!req.body?.theme) return err(res, 400, "Le thème de l'atelier est obligatoire");
  const id = transaction(() => {
    const r = db.prepare(`INSERT INTO ateliers (${CHAMPS_ATELIER.join(',')}) VALUES (${CHAMPS_ATELIER.map(() => '?').join(',')})`)
      .run(...CHAMPS_ATELIER.map((c) => v(req.body[c])));
    ecrireLignesAtelier(r.lastInsertRowid, req.body);
    return r.lastInsertRowid;
  });
  res.status(201).json(lireAtelier(id));
});

app.put('/api/ateliers/:id', (req, res) => {
  const a = db.prepare('SELECT statut FROM ateliers WHERE id = ?').get(req.params.id);
  if (!a) return err(res, 404, 'Atelier introuvable');
  if (a.statut === 'valide') return err(res, 409, 'Atelier validé : le dévalider avant toute modification');
  if (!req.body?.theme) return err(res, 400, "Le thème de l'atelier est obligatoire");
  transaction(() => {
    db.prepare(`UPDATE ateliers SET ${CHAMPS_ATELIER.map((c) => `${c} = ?`).join(', ')}, modifie_le = datetime('now','localtime') WHERE id = ?`)
      .run(...CHAMPS_ATELIER.map((c) => v(req.body[c])), req.params.id);
    ecrireLignesAtelier(req.params.id, req.body);
  });
  res.json(lireAtelier(req.params.id));
});

app.delete('/api/ateliers/:id', (req, res) => {
  db.prepare('DELETE FROM ateliers WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Validation : fige les calculs ET le référentiel utilisé (traçabilité, art. 5 de la Note 401).
app.post('/api/ateliers/:id/valider', (req, res) => {
  const a = lireAtelier(req.params.id);
  if (!a) return err(res, 404, 'Atelier introuvable');
  const ref = referentiel();
  const snapshot = JSON.stringify({ calcul: calculAtelier(a, ref), parametres: ref.parametres });
  db.prepare("UPDATE ateliers SET statut='valide', snapshot=?, valide_le=datetime('now','localtime') WHERE id=?").run(snapshot, a.id);
  res.json(lireAtelier(a.id));
});
app.post('/api/ateliers/:id/devalider', (req, res) => {
  db.prepare("UPDATE ateliers SET statut='brouillon', snapshot=NULL, valide_le=NULL WHERE id=?").run(req.params.id);
  res.json(lireAtelier(req.params.id));
});

/* -------------------------------- Missions -------------------------------- */
const CHAMPS_MISSION = ['structure', 'projet', 'objet', 'numero_om', 'ville', 'zone_geo', 'date_depart', 'date_retour', 'source_financement'];

function lireMission(id) {
  const m = parseSnap(db.prepare('SELECT * FROM missions WHERE id = ?').get(id));
  if (!m) return null;
  m.missionnaires = db.prepare('SELECT * FROM missionnaires WHERE mission_id = ? ORDER BY ordre').all(id);
  return m;
}
function ecrireMissionnaires(id, body) {
  db.prepare('DELETE FROM missionnaires WHERE mission_id = ?').run(id);
  const st = db.prepare('INSERT INTO missionnaires (mission_id, ordre, nom, fonction, categorie, jours_specifiques, nuitees_specifiques) VALUES (?,?,?,?,?,?,?)');
  (body.missionnaires || []).filter((m) => m.nom).forEach((m, i) =>
    st.run(id, i, m.nom, v(m.fonction), v(m.categorie), v(m.jours_specifiques), v(m.nuitees_specifiques)));
}

app.get('/api/missions', (_req, res) => {
  const ref = referentiel();
  res.json(db.prepare('SELECT id FROM missions ORDER BY id DESC').all().map(({ id }) => {
    const m = lireMission(id);
    const c = m.statut === 'valide' ? m.snapshot.calcul : calculMission(m, ref);
    return { id, objet: m.objet, ville: m.ville, date_depart: m.date_depart, date_retour: m.date_retour, statut: m.statut, nb: c.missionnaires.length, total: c.total };
  }));
});
app.get('/api/missions/:id', (req, res) => {
  const m = lireMission(req.params.id);
  return m ? res.json(m) : err(res, 404, 'Mission introuvable');
});
app.post('/api/missions', (req, res) => {
  if (!req.body?.objet) return err(res, 400, "L'objet de la mission est obligatoire");
  const id = transaction(() => {
    const r = db.prepare(`INSERT INTO missions (${CHAMPS_MISSION.join(',')}) VALUES (${CHAMPS_MISSION.map(() => '?').join(',')})`)
      .run(...CHAMPS_MISSION.map((c) => v(req.body[c])));
    ecrireMissionnaires(r.lastInsertRowid, req.body);
    return r.lastInsertRowid;
  });
  res.status(201).json(lireMission(id));
});
app.put('/api/missions/:id', (req, res) => {
  const m = db.prepare('SELECT statut FROM missions WHERE id = ?').get(req.params.id);
  if (!m) return err(res, 404, 'Mission introuvable');
  if (m.statut === 'valide') return err(res, 409, 'Mission validée : la dévalider avant toute modification');
  if (!req.body?.objet) return err(res, 400, "L'objet de la mission est obligatoire");
  transaction(() => {
    db.prepare(`UPDATE missions SET ${CHAMPS_MISSION.map((c) => `${c} = ?`).join(', ')}, modifie_le = datetime('now','localtime') WHERE id = ?`)
      .run(...CHAMPS_MISSION.map((c) => v(req.body[c])), req.params.id);
    ecrireMissionnaires(req.params.id, req.body);
  });
  res.json(lireMission(req.params.id));
});
app.delete('/api/missions/:id', (req, res) => {
  db.prepare('DELETE FROM missions WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
app.post('/api/missions/:id/valider', (req, res) => {
  const m = lireMission(req.params.id);
  if (!m) return err(res, 404, 'Mission introuvable');
  const ref = referentiel();
  const snapshot = JSON.stringify({ calcul: calculMission(m, ref), parametres: ref.parametres });
  db.prepare("UPDATE missions SET statut='valide', snapshot=?, valide_le=datetime('now','localtime') WHERE id=?").run(snapshot, m.id);
  res.json(lireMission(m.id));
});
app.post('/api/missions/:id/devalider', (req, res) => {
  db.prepare("UPDATE missions SET statut='brouillon', snapshot=NULL, valide_le=NULL WHERE id=?").run(req.params.id);
  res.json(lireMission(req.params.id));
});

/* ------------------------- Frontend compilé (prod) ------------------------- */
const dist = resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

app.use((e, _req, res, _next) => {
  console.error(e);
  err(res, 500, e.message);
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`API Gestion TDR prête sur http://localhost:${PORT}`));
