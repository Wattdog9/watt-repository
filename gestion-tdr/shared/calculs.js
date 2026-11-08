// Moteur de calcul partagé (navigateur + serveur).
// Référentiel : Arrêté n°020/MEFB/CAB du 20/02/2026 et Note n°401/MEFB/CAB/CCSPP-BM du 22/05/2026.

export const SOURCES = ['Bailleur (IDA / Banque mondiale)', 'Trésor (Part Etat)'];

export const ZONES_GEO = [
  "Côte d'Ivoire",
  'Afrique (hors Afrique du Nord et Afrique du Sud)',
  'Afrique du Nord, Afrique du Sud, Autre monde',
];

export const COLONNES_BAREME = {
  CI_AUTRES: 'CI – Toutes villes sauf Abidjan, Yamoussoukro, San Pedro, Assinie',
  CI_MAJOREE: 'CI – Abidjan, Yamoussoukro, San Pedro, Assinie',
  AFRIQUE: 'Afrique (hors Afrique du Nord et Afrique du Sud)',
  MONDE: 'Afrique du Nord, Afrique du Sud, Autre monde',
};

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const vide = (v) => v === null || v === undefined || String(v).trim() === '';
const round = (n) => Math.round(n);

export const estBailleur = (source) => String(source || '').startsWith('Bailleur');

export function formatMontant(n) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(round(num(n)));
}

export function formatDate(d) {
  if (!d) return '';
  const [y, m, j] = String(d).slice(0, 10).split('-');
  return j && m && y ? `${j}/${m}/${y}` : String(d);
}

export function joursEntre(debut, fin) {
  if (!debut || !fin) return null;
  const d1 = Date.parse(String(debut).slice(0, 10) + 'T00:00:00Z');
  const d2 = Date.parse(String(fin).slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(d1) || !Number.isFinite(d2)) return null;
  return Math.round((d2 - d1) / 86400000);
}

/* ------------------------------------------------------------------ */
/* Montant en lettres                                                   */
/* ------------------------------------------------------------------ */
const U = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const D = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

function w99(n) {
  if (n < 20) return U[n];
  const d = Math.floor(n / 10), u = n % 10;
  if (D[d]) return u === 0 ? D[d] : u === 1 ? `${D[d]} et un` : `${D[d]}-${U[u]}`;
  if (d === 7) return u === 1 ? 'soixante et onze' : `soixante-${U[10 + u]}`;
  if (d === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${U[u]}`;
  return `quatre-vingt-${U[10 + u]}`;
}

function w999(n, devantMille = false) {
  const c = Math.floor(n / 100), r = n % 100;
  const parts = [];
  if (c) parts.push(c === 1 ? 'cent' : `${U[c]} ${r || devantMille ? 'cent' : 'cents'}`);
  if (r || !c) parts.push(devantMille && r === 80 ? 'quatre-vingt' : w99(r));
  return parts.join(' ');
}

export function nombreEnLettres(n) {
  n = round(Math.abs(num(n)));
  if (n === 0) return 'zéro';
  const parts = [];
  const mrd = Math.floor(n / 1e9), m = Math.floor((n % 1e9) / 1e6), k = Math.floor((n % 1e6) / 1e3), u = n % 1e3;
  if (mrd) parts.push(mrd === 1 ? 'un milliard' : `${w999(mrd)} milliards`);
  if (m) parts.push(m === 1 ? 'un million' : `${w999(m)} millions`);
  if (k) parts.push(k === 1 ? 'mille' : `${w999(k, true)} mille`);
  if (u) parts.push(w999(u));
  return parts.join(' ');
}

export function montantEnLettres(n) {
  const v = round(num(n));
  if (v === 0) return 'Zéro franc CFA';
  const s = nombreEnLettres(v);
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} francs CFA (${formatMontant(v)} FCFA)`;
}

/* ------------------------------------------------------------------ */
/* ATELIERS                                                             */
/* ------------------------------------------------------------------ */
export function montantTransportUnitaire(ligne, ref) {
  const p = ref.parametres;
  const type = ref.typesTransport.find((t) => t.code === ligne.type_code);
  const km = num(ligne.distance_km);
  if (!vide(ligne.mu_specifique)) return { mu: num(ligne.mu_specifique), regle: 'Montant spécifique saisi' };
  if (!type) return { mu: 0, regle: 'Type de transport non renseigné' };
  switch (type.mode) {
    case 'distance': {
      const grille = [...ref.grilleDistance].sort((a, b) => a.km_min - b.km_min);
      let tranche = grille[0];
      for (const g of grille) if (km >= g.km_min) tranche = g;
      return { mu: tranche ? num(tranche.montant) : 0, regle: `Distance ${formatMontant(km)} km – ${tranche?.libelle ?? ''}` };
    }
    case 'carburant': {
      const calc = round(km * num(p.coef_ar) * (num(p.conso_litres_100km) / 100) * num(p.prix_super));
      const mu = Math.max(num(p.plancher_carburant), calc);
      return {
        mu,
        regle: `Carburant : ${formatMontant(km)} km x ${num(p.coef_ar)} x ${num(p.conso_litres_100km)} L/100 x ${formatMontant(p.prix_super)} = ${formatMontant(calc)} (min. ${formatMontant(p.plancher_carburant)})`,
      };
    }
    case 'specifique':
      return { mu: 0, regle: '⚠ Saisir le montant spécifique' };
    default:
      return { mu: num(type.montant), regle: 'Forfait barème' };
  }
}

export function calculAtelier(atelier, ref) {
  const p = ref.parametres;
  const perdiems = (atelier.perdiems || [])
    .map((l, index) => ({ ...l, index }))
    .filter((l) => !vide(l.libelle) || !vide(l.type_id))
    .map((l) => {
      const type = ref.typesPerdiem.find((t) => String(t.id) === String(l.type_id));
      const mu = !vide(l.mu_specifique) ? num(l.mu_specifique) : num(type?.montant);
      const nbJours = vide(l.nb_jours) ? 1 : num(l.nb_jours);
      const frequence = vide(l.frequence) ? 1 : num(l.frequence);
      const nb = num(l.nb_personnes);
      return { ...l, libelleAffiche: !vide(l.libelle) ? l.libelle : type?.libelle ?? '', nbPersonnes: nb, nbJours, frequence, mu, montant: nb * nbJours * frequence * mu };
    });
  const transports = (atelier.transports || [])
    .map((l, index) => ({ ...l, index }))
    .filter((l) => !vide(l.localite) || !vide(l.type_code))
    .map((l) => {
      const { mu, regle } = montantTransportUnitaire(l, ref);
      const nb = num(l.nb_participants);
      return { ...l, nbParticipants: nb, mu, regle, montant: nb * mu };
    });
  const totalPerdiems = perdiems.reduce((s, l) => s + l.montant, 0);
  const totalTransport = transports.reduce((s, l) => s + l.montant, 0);
  const nbParticipants = transports.reduce((s, l) => s + l.nbParticipants, 0);
  const avecTransport = p.base_tresor_pay === 'perdiems_transport';
  const baseTP = totalPerdiems + (avecTransport ? totalTransport : 0);
  const taux = num(p.taux_tresor_pay);
  const tresorPay = {
    base: baseTP,
    taux,
    montant: round(baseTP * taux),
    libelleBase: avecTransport ? 'Total perdiems + total transport' : 'Montant total des perdiems',
    libelle: `Frais Trésor Pay (${+(taux * 100).toFixed(2)} % ${avecTransport ? 'des perdiems + transport' : 'du total des perdiems'})`,
  };
  const totalGeneral = totalPerdiems + totalTransport + tresorPay.montant;
  const budget = num(atelier.budget_tdr);
  const ecart = budget - totalGeneral;
  const bailleur = estBailleur(atelier.source_financement);
  return {
    perdiems, transports, totalPerdiems, totalTransport, nbParticipants, tresorPay, totalGeneral,
    budget, ecart,
    alerte: budget === 0 ? 'Budget TDR non renseigné' : ecart < 0 ? `⚠ Dépassement du budget TDR de ${formatMontant(-ecart)} FCFA` : '✔ Total conforme au budget du TDR',
    recap: {
      perdiems: { bailleur: bailleur ? totalPerdiems : 0, tresor: bailleur ? 0 : totalPerdiems },
      tresorPay: { bailleur: bailleur ? tresorPay.montant : 0, tresor: bailleur ? 0 : tresorPay.montant },
    },
    objet: `Règlement des perdiems relatifs à l'atelier « ${atelier.theme || ''} »`,
    enLettres: montantEnLettres(totalGeneral),
  };
}

/* ------------------------------------------------------------------ */
/* MISSIONS                                                             */
/* ------------------------------------------------------------------ */
export function colonneBareme(mission, ref) {
  if (!mission.zone_geo) return null;
  if (mission.zone_geo === ZONES_GEO[0]) {
    const ville = String(mission.ville || '').trim().toLowerCase();
    const majoree = ref.villesMajorees.some((v) => v.nom.trim().toLowerCase() === ville);
    return majoree ? 'CI_MAJOREE' : 'CI_AUTRES';
  }
  return mission.zone_geo === ZONES_GEO[1] ? 'AFRIQUE' : 'MONDE';
}

export function tauxJournalier(categorie, zone, ref) {
  const b = ref.baremeMission.find((x) => Number(x.categorie) === Number(categorie) && x.zone === zone);
  return b ? num(b.montant) : 0;
}

export function calculMission(mission, ref) {
  const p = ref.parametres;
  const zone = colonneBareme(mission, ref);
  const ecartJours = joursEntre(mission.date_depart, mission.date_retour);
  const nbJours = ecartJours === null ? 0 : ecartJours + 1;
  const nbNuitees = ecartJours === null ? 0 : ecartJours;
  const part = num(p.part_hebergement);
  const surNuitees = p.base_hebergement === 'nuitees';
  const missionnaires = (mission.missionnaires || [])
    .map((m, index) => ({ ...m, index }))
    .filter((m) => !vide(m.nom))
    .map((m) => {
      const taux = tauxJournalier(m.categorie, zone, ref);
      const jours = vide(m.jours_specifiques) ? nbJours : num(m.jours_specifiques);
      const nuitees = vide(m.nuitees_specifiques) ? nbNuitees : num(m.nuitees_specifiques);
      const puHeb = round(taux * part);
      const puRest = taux - puHeb;
      const qteHeb = surNuitees ? nuitees : jours;
      const hebergement = puHeb * qteHeb;
      const restauration = puRest * jours;
      const lib = `barème Catégorie ${m.categorie} – ${COLONNES_BAREME[zone] ?? '?'}`;
      return {
        ...m, taux, jours, nuitees, puHeb, puRest, qteHeb, hebergement, restauration,
        total: hebergement + restauration,
        uniteHeb: surNuitees ? 'nuitée(s)' : 'jour(s)',
        detailHeb: `Détail du calcul : ${lib} = ${formatMontant(taux)} FCFA/jour x ${round(part * 100)} % = ${formatMontant(puHeb)} FCFA x ${qteHeb} ${surNuitees ? 'nuitée(s)' : 'jour(s)'} = ${formatMontant(hebergement)} FCFA`,
        detailRest: `Détail du calcul : ${formatMontant(taux)} FCFA/jour x ${100 - round(part * 100)} % = ${formatMontant(puRest)} FCFA x ${jours} jour(s) = ${formatMontant(restauration)} FCFA`,
        enLettres: montantEnLettres(hebergement + restauration),
      };
    });
  const tot = (k) => missionnaires.reduce((s, m) => s + m[k], 0);
  const total = tot('total');
  const bailleur = estBailleur(mission.source_financement);
  return {
    zone, colonne: COLONNES_BAREME[zone] ?? '', nbJours, nbNuitees, missionnaires,
    totalHebergement: tot('hebergement'), totalRestauration: tot('restauration'), total,
    bailleur: bailleur ? total : 0, tresor: bailleur ? 0 : total,
    objet: `Règlement relatif à : ${mission.objet || ''}`,
    enLettres: montantEnLettres(total),
  };
}
