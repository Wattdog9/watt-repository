#!/usr/bin/env node
// Serveur de partage des données du suivi des dossiers PRSEB.
// Aucune dépendance : Node.js 18 ou plus suffit. Lancement : node server.js
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOTE = process.env.HOTE || "0.0.0.0";
const MOT_DE_PASSE = process.env.MOT_DE_PASSE || "";
const DOSSIER_DONNEES = path.resolve(process.env.DOSSIER_DONNEES || path.join(__dirname, "donnees"));
const FICHIER = path.join(DOSSIER_DONNEES, "donnees.json");
const DOSSIER_SAUVEGARDES = path.join(DOSSIER_DONNEES, "sauvegardes");
const NB_SAUVEGARDES = 60;
const TAILLE_MAX = 10 * 1024 * 1024;
const DUREE_SESSION = 30 * 24 * 3600 * 1000;
const PAGE = path.join(__dirname, "index.html");

const PARAMS_DEFAUT = {
  delais: { DE: 5, CF: 5, AC: 5 },
  feries: "01-01\n05-01\n08-15\n11-01\n12-25",
  devise: "FCFA"
};

// ---------- Stockage ----------
fs.mkdirSync(DOSSIER_SAUVEGARDES, { recursive: true });

function chargerBase() {
  if (!fs.existsSync(FICHIER)) {
    return { revision: 0, dossiers: [], params: JSON.parse(JSON.stringify(PARAMS_DEFAUT)), sessions: {} };
  }
  const o = JSON.parse(fs.readFileSync(FICHIER, "utf8"));
  o.dossiers = Array.isArray(o.dossiers) ? o.dossiers : [];
  o.params = Object.assign({}, PARAMS_DEFAUT, o.params || {});
  o.sessions = o.sessions || {};
  o.revision = o.revision || 0;
  return o;
}

const base = chargerBase();

function jour() { return new Date().toISOString().slice(0, 10); }

function sauvegardeDuJour() {
  if (!fs.existsSync(FICHIER)) return;
  const cible = path.join(DOSSIER_SAUVEGARDES, "donnees-" + jour() + ".json");
  if (fs.existsSync(cible)) return;
  fs.copyFileSync(FICHIER, cible);
  const anciennes = fs.readdirSync(DOSSIER_SAUVEGARDES).filter((f) => /^donnees-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  anciennes.slice(0, Math.max(0, anciennes.length - NB_SAUVEGARDES)).forEach((f) => fs.unlinkSync(path.join(DOSSIER_SAUVEGARDES, f)));
}

// Écriture atomique : fichier temporaire puis renommage.
function enregistrer(changement) {
  if (changement !== false) base.revision++;
  sauvegardeDuJour();
  const tmp = FICHIER + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(base, null, 2));
  fs.renameSync(tmp, FICHIER);
}

// ---------- Validation ----------
const ACTEURS = ["DE", "CF", "AC"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function dossierValide(d) {
  if (!d || typeof d !== "object") return "Dossier manquant.";
  if (typeof d.id !== "string" || !d.id) return "Identifiant manquant.";
  if (typeof d.ref !== "string" || !d.ref.trim()) return "La référence est obligatoire.";
  if (typeof d.objet !== "string" || !d.objet.trim()) return "L'objet est obligatoire.";
  if (["en_cours", "paye", "rejete"].indexOf(d.statut) < 0) return "Statut inconnu.";
  if (!Array.isArray(d.etapes) || !d.etapes.length) return "Le dossier doit avoir au moins une étape.";
  for (const e of d.etapes) {
    if (!e || ACTEURS.indexOf(e.acteur) < 0) return "Acteur inconnu dans l'historique.";
    if (!DATE.test(e.debut) || (e.fin && !DATE.test(e.fin))) return "Date invalide dans l'historique.";
  }
  return null;
}

function paramsValides(p) {
  if (!p || typeof p !== "object") return null;
  const delais = {};
  ACTEURS.forEach((a) => {
    const v = parseInt(p.delais && p.delais[a], 10);
    delais[a] = v > 0 && v <= 60 ? v : PARAMS_DEFAUT.delais[a];
  });
  return {
    delais,
    feries: String(p.feries == null ? PARAMS_DEFAUT.feries : p.feries).slice(0, 5000),
    devise: String(p.devise || "FCFA").slice(0, 20)
  };
}

// ---------- Sessions ----------
function egalSecurise(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function utilisateur(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!m) return null;
  const s = base.sessions[m[1]];
  if (!s || s.expire < Date.now()) return null;
  return s.nom;
}

function purgerSessions() {
  const t = Date.now();
  Object.keys(base.sessions).forEach((k) => { if (base.sessions[k].expire < t) delete base.sessions[k]; });
}

// ---------- HTTP ----------
function repondre(res, code, obj) {
  const corps = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(corps);
}

function lireCorps(req) {
  return new Promise((ok, ko) => {
    let taille = 0;
    const morceaux = [];
    req.on("data", (c) => {
      taille += c.length;
      if (taille > TAILLE_MAX) { ko(Object.assign(new Error("Requête trop volumineuse."), { code: 413 })); req.destroy(); return; }
      morceaux.push(c);
    });
    req.on("end", () => {
      if (!morceaux.length) return ok({});
      try { ok(JSON.parse(Buffer.concat(morceaux).toString("utf8"))); }
      catch (e) { ko(Object.assign(new Error("JSON invalide."), { code: 400 })); }
    });
    req.on("error", ko);
  });
}

function etatPublic() {
  return { revision: base.revision, dossiers: base.dossiers, params: base.params };
}

function trouver(id) { return base.dossiers.findIndex((d) => d.id === id); }

async function api(req, res, url) {
  const route = req.method + " " + url.pathname;

  if (route === "GET /api/config") {
    return repondre(res, 200, { motDePasseRequis: !!MOT_DE_PASSE });
  }

  if (route === "POST /api/connexion") {
    const b = await lireCorps(req);
    const nom = String(b.nom || "").trim().slice(0, 60);
    if (!nom) return repondre(res, 400, { erreur: "Indiquez votre nom." });
    if (MOT_DE_PASSE && !egalSecurise(b.motDePasse || "", MOT_DE_PASSE)) {
      return repondre(res, 401, { erreur: "Mot de passe incorrect." });
    }
    purgerSessions();
    const jeton = crypto.randomBytes(24).toString("hex");
    base.sessions[jeton] = { nom, expire: Date.now() + DUREE_SESSION };
    enregistrer(false);
    return repondre(res, 200, { jeton, nom });
  }

  const nom = utilisateur(req);
  if (!nom) return repondre(res, 401, { erreur: "Session expirée. Reconnectez-vous." });

  if (route === "POST /api/deconnexion") {
    delete base.sessions[(req.headers.authorization || "").slice(7)];
    enregistrer(false);
    return repondre(res, 200, { ok: true });
  }

  if (route === "GET /api/revision") return repondre(res, 200, { revision: base.revision });
  if (route === "GET /api/etat") return repondre(res, 200, etatPublic());

  if (route === "POST /api/dossiers") {
    const { dossier } = await lireCorps(req);
    const err = dossierValide(dossier);
    if (err) return repondre(res, 400, { erreur: err });
    if (trouver(dossier.id) >= 0) return repondre(res, 409, { erreur: "Ce dossier existe déjà." });
    if (base.dossiers.some((d) => d.ref === dossier.ref)) return repondre(res, 409, { erreur: "La référence " + dossier.ref + " existe déjà." });
    const d = Object.assign({}, dossier, { exemple: false, version: 1, creePar: nom, modifiePar: nom, modifieLe: new Date().toISOString() });
    base.dossiers.push(d);
    enregistrer();
    return repondre(res, 201, { dossier: d, revision: base.revision });
  }

  const m = /^\/api\/dossiers\/([^/]+)$/.exec(url.pathname);
  if (m && (req.method === "PUT" || req.method === "DELETE")) {
    const id = decodeURIComponent(m[1]);
    const i = trouver(id);
    if (i < 0) return repondre(res, 404, { erreur: "Ce dossier a été supprimé par un autre utilisateur." });
    const actuel = base.dossiers[i];
    if (req.method === "DELETE") {
      base.dossiers.splice(i, 1);
      enregistrer();
      return repondre(res, 200, { ok: true, revision: base.revision });
    }
    const { dossier, version } = await lireCorps(req);
    if ((actuel.version || 0) !== version) {
      return repondre(res, 409, { erreur: "Ce dossier vient d'être modifié par " + (actuel.modifiePar || "un autre utilisateur") + ". Les données ont été rechargées : vérifiez puis recommencez." });
    }
    const err = dossierValide(dossier);
    if (err) return repondre(res, 400, { erreur: err });
    if (base.dossiers.some((d) => d.ref === dossier.ref && d.id !== id)) return repondre(res, 409, { erreur: "La référence " + dossier.ref + " existe déjà." });
    const d = Object.assign({}, dossier, { id, creePar: actuel.creePar, version: (actuel.version || 0) + 1, modifiePar: nom, modifieLe: new Date().toISOString() });
    base.dossiers[i] = d;
    enregistrer();
    return repondre(res, 200, { dossier: d, revision: base.revision });
  }

  if (route === "DELETE /api/exemples") {
    base.dossiers = base.dossiers.filter((d) => !d.exemple);
    enregistrer();
    return repondre(res, 200, { ok: true, revision: base.revision });
  }

  if (route === "PUT /api/params") {
    const b = await lireCorps(req);
    const p = paramsValides(b.params);
    if (!p) return repondre(res, 400, { erreur: "Paramètres invalides." });
    base.params = p;
    enregistrer();
    return repondre(res, 200, { params: p, revision: base.revision });
  }

  // Remplace toutes les données (import d'une sauvegarde ou effacement complet).
  if (route === "POST /api/import") {
    const b = await lireCorps(req);
    if (!Array.isArray(b.dossiers)) return repondre(res, 400, { erreur: "Ce fichier n'est pas une sauvegarde valide de l'application." });
    for (const d of b.dossiers) {
      const err = dossierValide(d);
      if (err) return repondre(res, 400, { erreur: "Dossier " + ((d && d.ref) || "?") + " : " + err });
    }
    base.dossiers = b.dossiers.map((d) => Object.assign({}, d, { version: (d.version || 0) + 1, modifiePar: nom, modifieLe: new Date().toISOString() }));
    if (b.params) base.params = paramsValides(b.params) || base.params;
    enregistrer();
    return repondre(res, 200, etatPublic());
  }

  return repondre(res, 404, { erreur: "Route inconnue." });
}

const serveur = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
      return fs.createReadStream(PAGE).pipe(res);
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Page introuvable.");
  } catch (e) {
    if (!res.headersSent) repondre(res, e.code >= 400 && e.code < 500 ? e.code : 500, { erreur: e.code ? e.message : "Erreur interne du serveur." });
    if (!e.code) console.error(e);
  }
});

serveur.listen(PORT, HOTE, () => {
  console.log("Suivi des dossiers PRSEB : http://localhost:" + PORT);
  console.log("Données : " + FICHIER);
  if (!MOT_DE_PASSE) console.log("Attention : aucun mot de passe défini (variable MOT_DE_PASSE). Toute personne du réseau peut accéder aux données.");
});
