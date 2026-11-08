import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useRef_ } from '../api.js';
import { SOURCES, ZONES_GEO, calculMission, formatMontant } from '../../shared/calculs.js';

const VIDE = {
  structure: '', projet: '', objet: '', numero_om: '', ville: '', zone_geo: ZONES_GEO[0],
  date_depart: '', date_retour: '', source_financement: SOURCES[0], missionnaires: [],
};
const ligne = () => ({ nom: '', fonction: '', categorie: 3, jours_specifiques: '', nuitees_specifiques: '' });

export default function MissionForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { ref } = useRef_();
  const [m, setM] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!id) setM({ ...VIDE, missionnaires: [ligne()] });
    else api.get(`/api/missions/${id}`).then(setM).catch((e) => setMsg({ t: 'alerte', m: e.message }));
  }, [id]);

  const calc = useMemo(() => (m ? calculMission(m, ref) : null), [m, ref]);
  if (!m) return msg ? <div className="alerte">{msg.m}</div> : <p>Chargement…</p>;

  const verrou = m.statut === 'valide';
  const set = (k) => (e) => setM({ ...m, [k]: e.target.value });
  const setLigne = (i, k, v) => setM({ ...m, missionnaires: m.missionnaires.map((l, j) => (j === i ? { ...l, [k]: v } : l)) });

  const enregistrer = async () => {
    try {
      const r = id ? await api.put(`/api/missions/${id}`, m) : await api.post('/api/missions', m);
      setM(r);
      setMsg({ t: 'succes', m: 'Mission enregistrée.' });
      if (!id) nav(`/missions/${r.id}`, { replace: true });
    } catch (e) { setMsg({ t: 'alerte', m: e.message }); }
  };
  const basculer = async (action) => {
    try {
      if (action === 'valider') await api.put(`/api/missions/${id}`, m);
      setM(await api.post(`/api/missions/${id}/${action}`));
      setMsg({ t: 'succes', m: action === 'valider' ? 'Mission validée : les montants sont figés.' : 'Mission repassée en brouillon.' });
    } catch (e) { setMsg({ t: 'alerte', m: e.message }); }
  };
  const champ = (lab, k, type = 'text') => (
    <label className="champ"><span>{lab}</span><input type={type} value={m[k] ?? ''} onChange={set(k)} disabled={verrou} /></label>
  );

  return (
    <>
      <div className="entete-page no-print">
        <h1>{id ? `Mission n°${id}` : 'Nouvelle mission'} {verrou && <span className="badge valide">Validée le {m.valide_le}</span>}</h1>
        <div className="boutons">
          {!verrou && <button className="btn" onClick={enregistrer}>Enregistrer</button>}
          {id && !verrou && <button className="btn secondaire" onClick={() => basculer('valider')}>Valider (figer les montants)</button>}
          {id && verrou && <button className="btn secondaire" onClick={() => basculer('devalider')}>Dévalider</button>}
          {id && <Link className="btn vert" to={`/missions/${id}/notes`}>Notes de frais →</Link>}
          {id && <Link className="btn vert" to={`/missions/${id}/recap`}>Récapitulatif →</Link>}
        </div>
      </div>
      {msg && <div className={msg.t}>{msg.m}</div>}

      <section className="carte">
        <h2>I. Ordre de mission</h2>
        <div className="formulaire">
          {champ('Structure initiatrice', 'structure')}
          {champ('Projet / Programme', 'projet')}
          <label className="champ large"><span>Objet / thème de la mission *</span>
            <textarea rows={2} value={m.objet ?? ''} onChange={set('objet')} disabled={verrou} /></label>
          {champ("N° de l'ordre de mission", 'numero_om')}
          {champ('Ville de destination', 'ville')}
          <label className="champ"><span>Zone géographique</span>
            <select value={m.zone_geo ?? ''} onChange={set('zone_geo')} disabled={verrou}>{ZONES_GEO.map((z) => <option key={z}>{z}</option>)}</select></label>
          {champ('Date de départ', 'date_depart', 'date')}
          {champ('Date de retour', 'date_retour', 'date')}
          <label className="champ"><span>Source de financement</span>
            <select value={m.source_financement ?? ''} onChange={set('source_financement')} disabled={verrou}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        <div className="infos-calc">
          <div><span>Colonne du barème appliquée</span><b>{calc.colonne || '—'}</b></div>
          <div><span>Nombre de jours</span><b>{calc.nbJours}</b></div>
          <div><span>Nombre de nuitées</span><b>{calc.nbNuitees}</b></div>
        </div>
      </section>

      <section className="carte">
        <h2>II. Missionnaires</h2>
        <div className="defile">
          <table className="grille saisie">
            <thead><tr><th>N°</th><th>Nom et prénoms</th><th>Fonction</th><th>Catégorie</th><th>Jours spécif.</th><th>Nuitées spécif.</th>
              <th className="num">Taux / jour</th><th className="num">Jours</th><th className="num">Hébergement</th><th className="num">Restauration</th><th className="num">Total</th><th /></tr></thead>
            <tbody>
              {m.missionnaires.map((l, i) => {
                const c = calc.missionnaires.find((x) => x.index === i);
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><input value={l.nom ?? ''} disabled={verrou} onChange={(e) => setLigne(i, 'nom', e.target.value)} /></td>
                    <td><input value={l.fonction ?? ''} disabled={verrou} onChange={(e) => setLigne(i, 'fonction', e.target.value)} /></td>
                    <td><select value={l.categorie ?? ''} disabled={verrou} onChange={(e) => setLigne(i, 'categorie', Number(e.target.value))} title={ref.categories.find((x) => x.categorie === Number(l.categorie))?.description}>
                      {ref.categories.map((x) => <option key={x.categorie} value={x.categorie}>Catégorie {x.categorie}</option>)}
                    </select></td>
                    <td><input type="number" min={0} className="court" value={l.jours_specifiques ?? ''} disabled={verrou} onChange={(e) => setLigne(i, 'jours_specifiques', e.target.value)} /></td>
                    <td><input type="number" min={0} className="court" value={l.nuitees_specifiques ?? ''} disabled={verrou} onChange={(e) => setLigne(i, 'nuitees_specifiques', e.target.value)} /></td>
                    <td className="num calc">{c && formatMontant(c.taux)}</td>
                    <td className="num calc">{c?.jours}</td>
                    <td className="num calc">{c && formatMontant(c.hebergement)}</td>
                    <td className="num calc">{c && formatMontant(c.restauration)}</td>
                    <td className="num calc"><b>{c && formatMontant(c.total)}</b></td>
                    <td>{!verrou && <button className="lien danger" onClick={() => setM({ ...m, missionnaires: m.missionnaires.filter((_, j) => j !== i) })}>✕</button>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="total"><td colSpan={8}>TOTAL MISSION</td><td className="num">{formatMontant(calc.totalHebergement)}</td>
              <td className="num">{formatMontant(calc.totalRestauration)}</td><td className="num">{formatMontant(calc.total)}</td><td /></tr></tfoot>
          </table>
        </div>
        {!verrou && <button className="btn secondaire" onClick={() => setM({ ...m, missionnaires: [...m.missionnaires, ligne()] })}>+ Ajouter un missionnaire</button>}
        <details className="aide"><summary>Catégories de personnel (Note n°401)</summary>
          <ul>{ref.categories.map((x) => <li key={x.categorie}><b>Catégorie {x.categorie} :</b> {x.description}</li>)}</ul></details>
      </section>
    </>
  );
}
