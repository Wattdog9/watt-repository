import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculAtelier, calculMission, nombreEnLettres, montantEnLettres } from './calculs.js';

const ref = {
  parametres: {
    taux_tresor_pay: '0.01', base_tresor_pay: 'perdiems', prix_super: '875', conso_litres_100km: '15',
    plancher_carburant: '25000', coef_ar: '2', part_hebergement: '0.6', base_hebergement: 'jours',
  },
  typesPerdiem: [{ id: 1, libelle: 'Dîner', montant: 15000 }, { id: 3, libelle: 'Facilitation', montant: 40000 }],
  typesTransport: [
    { code: 'ABJ_COMMUNE', mode: 'forfait', montant: 10000 },
    { code: 'DISTANCE', mode: 'distance', montant: 0 },
    { code: 'CARBURANT', mode: 'carburant', montant: 0 },
    { code: 'SPECIFIQUE', mode: 'specifique', montant: 0 },
  ],
  grilleDistance: [
    { km_min: 0, montant: 20000, libelle: '0-150' }, { km_min: 151, montant: 30000, libelle: '151-300' },
    { km_min: 301, montant: 40000, libelle: '301-450' }, { km_min: 451, montant: 45000, libelle: '451-600' },
    { km_min: 601, montant: 50000, libelle: '>600' },
  ],
  baremeMission: [
    [1, 60000, 60000, 170000, 200000], [2, 49000, 55000, 150000, 175000], [3, 43000, 45000, 130000, 150000],
  ].flatMap(([c, ...m]) => ['CI_AUTRES', 'CI_MAJOREE', 'AFRIQUE', 'MONDE'].map((zone, i) => ({ categorie: c, zone, montant: m[i] }))),
  villesMajorees: [{ nom: 'Abidjan' }, { nom: 'Yamoussoukro' }, { nom: 'San Pedro' }, { nom: 'Assinie' }],
};

const atelierPRSEB = {
  source_financement: 'Bailleur (IDA / Banque mondiale)', budget_tdr: 23235050, theme: 'Test',
  perdiems: [
    { type_id: 1, libelle: 'Eq coordination', nb_personnes: 17, nb_jours: 6, frequence: 1 },
    { type_id: 1, libelle: 'Suivi', nb_personnes: 72, nb_jours: 2, frequence: 1 },
    { type_id: 1, libelle: 'MEO', nb_personnes: 165, nb_jours: 4, frequence: 1 },
    { type_id: 3, libelle: 'Facilitation', nb_personnes: 8, nb_jours: 1, frequence: 1 },
  ],
  transports: [['AGBOVILLE', 230, 17], ['TIASSALE', 140, 12], ['ODIENNE', 620, 22], ['MINIGNAN', 650, 13], ['TOUBA', 610, 22],
    ['MAN', 470, 27], ['DANANE', 420, 17], ['DUEKOUE', 260, 30], ['GUIGLO', 290, 20], ['DALOA', 145, 25], ['ISSIA', 170, 11],
    ['FERKESSEDOGOU', 400, 19], ['ABIDJAN', 240, 17]].map(([localite, distance_km, nb_participants]) => ({ localite, type_code: 'DISTANCE', distance_km, nb_participants })),
};

test('atelier PRSEB : totaux du TDR', () => {
  const c = calculAtelier(atelierPRSEB, ref);
  assert.equal(c.totalPerdiems, 13910000);
  assert.equal(c.totalTransport, 9095000);
  assert.equal(c.tresorPay.montant, 139100); // 1 % des perdiems
  assert.equal(c.totalGeneral, 23144100);
  assert.equal(c.recap.perdiems.bailleur, 13910000);
  assert.equal(c.recap.perdiems.tresor, 0);
});

test('Trésor Pay sur perdiems + transport = budget du TDR', () => {
  const c = calculAtelier(atelierPRSEB, { ...ref, parametres: { ...ref.parametres, base_tresor_pay: 'perdiems_transport' } });
  assert.equal(c.tresorPay.montant, 230050);
  assert.equal(c.totalGeneral, 23235050);
  assert.equal(c.ecart, 0);
});

test('transport : grille, carburant avec plancher, forfait, spécifique', () => {
  const c = calculAtelier({ transports: [
    { localite: 'A', type_code: 'DISTANCE', distance_km: 150, nb_participants: 1 },
    { localite: 'B', type_code: 'DISTANCE', distance_km: 151, nb_participants: 1 },
    { localite: 'C', type_code: 'CARBURANT', distance_km: 300, nb_participants: 1 },
    { localite: 'D', type_code: 'CARBURANT', distance_km: 50, nb_participants: 1 },
    { localite: 'E', type_code: 'ABJ_COMMUNE', nb_participants: 3 },
    { localite: 'F', type_code: 'SPECIFIQUE', mu_specifique: 12345, nb_participants: 2 },
  ] }, ref);
  assert.deepEqual(c.transports.map((t) => t.mu), [20000, 30000, 78750, 25000, 10000, 12345]);
  assert.equal(c.transports[5].montant, 24690);
});

test('mission : barème, ville majorée, zones', () => {
  const base = { zone_geo: "Côte d'Ivoire", ville: 'Man', date_depart: '2026-11-16', date_retour: '2026-11-20', source_financement: 'Trésor (Part Etat)',
    missionnaires: [{ nom: 'A', categorie: 1 }, { nom: 'B', categorie: 2 }, { nom: 'C', categorie: 3 }] };
  const c = calculMission(base, ref);
  assert.equal(c.nbJours, 5);
  assert.deepEqual(c.missionnaires.map((m) => m.total), [300000, 245000, 215000]);
  assert.equal(c.missionnaires[0].hebergement, 180000);
  assert.equal(c.tresor, 760000);
  assert.equal(calculMission({ ...base, ville: 'yamoussoukro ' }, ref).missionnaires[1].taux, 55000);
  assert.equal(calculMission({ ...base, zone_geo: 'Afrique (hors Afrique du Nord et Afrique du Sud)' }, ref).missionnaires[0].taux, 170000);
  assert.equal(calculMission({ ...base, zone_geo: 'Afrique du Nord, Afrique du Sud, Autre monde' }, ref).missionnaires[2].taux, 150000);
});

test('mission : hébergement sur nuitées', () => {
  const c = calculMission({ zone_geo: "Côte d'Ivoire", ville: 'Man', date_depart: '2026-11-16', date_retour: '2026-11-20',
    missionnaires: [{ nom: 'A', categorie: 1 }] }, { ...ref, parametres: { ...ref.parametres, base_hebergement: 'nuitees' } });
  assert.equal(c.missionnaires[0].hebergement, 36000 * 4);
  assert.equal(c.missionnaires[0].restauration, 24000 * 5);
});

test('montants en lettres', () => {
  assert.equal(nombreEnLettres(80), 'quatre-vingts');
  assert.equal(nombreEnLettres(80000), 'quatre-vingt mille');
  assert.equal(nombreEnLettres(200), 'deux cents');
  assert.equal(nombreEnLettres(200000), 'deux cent mille');
  assert.equal(nombreEnLettres(71), 'soixante et onze');
  assert.equal(nombreEnLettres(1000), 'mille');
  assert.equal(nombreEnLettres(2000000), 'deux millions');
  assert.match(montantEnLettres(23144100), /^Vingt-trois millions cent quarante-quatre mille cent francs CFA/);
});
