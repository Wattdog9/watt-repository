import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useRef_ } from '../api.js';
import { SOURCES, calculAtelier, formatMontant } from '../../shared/calculs.js';

const VIDE = {
  structure: '', projet: '', theme: '', reference: '', lieu: '', date_debut: '', date_fin: '',
  source_financement: SOURCES[0], beneficiaire: '', point_focal: '', budget_tdr: '',
  perdiems: [], transports: [],
};
const lignePerdiem = () => ({ type_id: '', libelle: '', nb_personnes: '', nb_jours: '', frequence: 1, mu_specifique: '' });
const ligneTransport = () => ({ localite: '', type_code: 'DISTANCE', distance_km: '', nb_participants: '', mu_specifique: '' });

export default function AtelierForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { ref } = useRef_();
  const [a, setA] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!id) setA({ ...VIDE, perdiems: [lignePerdiem()], transports: [ligneTransport()] });
    else api.get(`/api/ateliers/${id}`).then(setA).catch((e) => setMsg({ t: 'alerte', m: e.message }));
  }, [id]);

  const calc = useMemo(() => (a ? calculAtelier(a, ref) : null), [a, ref]);
  if (!a) return msg ? <div className="alerte">{msg.m}</div> : <p>Chargement…</p>;

  const verrou = a.statut === 'valide';
  const set = (k) => (e) => setA({ ...a, [k]: e.target.value });
  const setLigne = (liste, i, k, val) => setA({ ...a, [liste]: a[liste].map((l, j) => (j === i ? { ...l, [k]: val } : l)) });
  const ajouter = (liste, f) => setA({ ...a, [liste]: [...a[liste], f()] });
  const retirer = (liste, i) => setA({ ...a, [liste]: a[liste].filter((_, j) => j !== i) });

  const enregistrer = async () => {
    try {
      const r = id ? await api.put(`/api/ateliers/${id}`, a) : await api.post('/api/ateliers', a);
      setA(r);
      setMsg({ t: 'succes', m: 'Atelier enregistré.' });
      if (!id) nav(`/ateliers/${r.id}`, { replace: true });
    } catch (e) { setMsg({ t: 'alerte', m: e.message }); }
  };
  const basculer = async (action) => {
    try {
      if (action === 'valider') await api.put(`/api/ateliers/${id}`, a);
      setA(await api.post(`/api/ateliers/${id}/${action}`));
      setMsg({ t: 'succes', m: action === 'valider' ? 'Atelier validé : les montants sont figés.' : 'Atelier repassé en brouillon.' });
    } catch (e) { setMsg({ t: 'alerte', m: e.message }); }
  };

  const champ = (lab, k, type = 'text', props = {}) => (
    <label className="champ"><span>{lab}</span><input type={type} value={a[k] ?? ''} onChange={set(k)} disabled={verrou} {...props} /></label>
  );

  return (
    <>
      <div className="entete-page no-print">
        <h1>{id ? `Atelier n°${id}` : 'Nouvel atelier'} {verrou && <span className="badge valide">Validé le {a.valide_le}</span>}</h1>
        <div className="boutons">
          {!verrou && <button className="btn" onClick={enregistrer}>Enregistrer</button>}
          {id && !verrou && <button className="btn secondaire" onClick={() => basculer('valider')}>Valider (figer les montants)</button>}
          {id && verrou && <button className="btn secondaire" onClick={() => basculer('devalider')}>Dévalider</button>}
          {id && <Link className="btn vert" to={`/ateliers/${id}/etat`}>État des perdiems →</Link>}
        </div>
      </div>
      {msg && <div className={msg.t}>{msg.m}</div>}

      <section className="carte">
        <h2>I. Informations générales du TDR</h2>
        <div className="formulaire">
          {champ('Structure initiatrice', 'structure')}
          {champ('Projet / Programme', 'projet')}
          <label className="champ large"><span>Thème / intitulé de l'atelier *</span>
            <textarea rows={2} value={a.theme ?? ''} onChange={set('theme')} disabled={verrou} /></label>
          {champ('Référence activité (PTBA)', 'reference')}
          {champ("Lieu de l'atelier", 'lieu')}
          {champ('Date de début', 'date_debut', 'date')}
          {champ('Date de fin', 'date_fin', 'date')}
          <label className="champ"><span>Source de financement</span>
            <select value={a.source_financement ?? ''} onChange={set('source_financement')} disabled={verrou}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select></label>
          {champ('Bénéficiaire du paiement (régisseur)', 'beneficiaire')}
          {champ('Point focal', 'point_focal')}
          {champ('Budget « perdiems participants » du TDR (contrôle)', 'budget_tdr', 'number', { min: 0 })}
        </div>
      </section>

      <section className="carte">
        <h2>II. Détail des perdiems</h2>
        <div className="defile">
          <table className="grille saisie">
            <thead><tr><th>N°</th><th>Type de perdiem</th><th>Libellé détaillé / catégorie</th><th>Nb personnes</th><th>Nb jours</th><th>Fréquence</th><th>MU spécifique</th><th className="num">MU retenu</th><th className="num">Montant</th><th /></tr></thead>
            <tbody>
              {a.perdiems.map((l, i) => {
                const c = calc.perdiems.find((x) => x.index === i);
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><select value={l.type_id ?? ''} disabled={verrou} onChange={(e) => setLigne('perdiems', i, 'type_id', e.target.value)}>
                      <option value="">—</option>
                      {ref.typesPerdiem.map((t) => <option key={t.id} value={t.id}>{t.libelle} ({formatMontant(t.montant)})</option>)}
                    </select></td>
                    <td><input value={l.libelle ?? ''} disabled={verrou} onChange={(e) => setLigne('perdiems', i, 'libelle', e.target.value)} /></td>
                    {['nb_personnes', 'nb_jours', 'frequence', 'mu_specifique'].map((k) => (
                      <td key={k}><input type="number" min={0} className="court" value={l[k] ?? ''} disabled={verrou} onChange={(e) => setLigne('perdiems', i, k, e.target.value)} /></td>
                    ))}
                    <td className="num calc">{c ? formatMontant(c.mu) : ''}</td>
                    <td className="num calc">{c ? formatMontant(c.montant) : ''}</td>
                    <td>{!verrou && <button className="lien danger" onClick={() => retirer('perdiems', i)} title="Retirer">✕</button>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total"><td colSpan={8}>TOTAL PERDIEMS</td><td className="num">{formatMontant(calc.totalPerdiems)}</td><td /></tr>
              <tr className="total"><td colSpan={8}>{calc.tresorPay.libelle}</td><td className="num">{formatMontant(calc.tresorPay.montant)}</td><td /></tr>
            </tfoot>
          </table>
        </div>
        {!verrou && <button className="btn secondaire" onClick={() => ajouter('perdiems', lignePerdiem)}>+ Ajouter une ligne</button>}
      </section>

      <section className="carte">
        <h2>III. Transport des participants (barème art. 17 b)</h2>
        <div className="defile">
          <table className="grille saisie">
            <thead><tr><th>N°</th><th>Localité de provenance</th><th>Type de transport</th><th>Distance ALLER (km)</th><th>Nb participants</th><th>MU spécifique</th><th>Règle appliquée</th><th className="num">MU A/R</th><th className="num">Montant</th><th /></tr></thead>
            <tbody>
              {a.transports.map((l, i) => {
                const c = calc.transports.find((x) => x.index === i);
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><input value={l.localite ?? ''} disabled={verrou} onChange={(e) => setLigne('transports', i, 'localite', e.target.value)} /></td>
                    <td><select value={l.type_code ?? ''} disabled={verrou} onChange={(e) => setLigne('transports', i, 'type_code', e.target.value)}>
                      {ref.typesTransport.map((t) => <option key={t.code} value={t.code}>{t.libelle}</option>)}
                    </select></td>
                    {['distance_km', 'nb_participants', 'mu_specifique'].map((k) => (
                      <td key={k}><input type="number" min={0} className="court" value={l[k] ?? ''} disabled={verrou} onChange={(e) => setLigne('transports', i, k, e.target.value)} /></td>
                    ))}
                    <td className="petit">{c?.regle}</td>
                    <td className="num calc">{c ? formatMontant(c.mu) : ''}</td>
                    <td className="num calc">{c ? formatMontant(c.montant) : ''}</td>
                    <td>{!verrou && <button className="lien danger" onClick={() => retirer('transports', i)} title="Retirer">✕</button>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="total"><td colSpan={4}>TOTAL TRANSPORT</td><td className="num">{formatMontant(calc.nbParticipants)}</td><td colSpan={3} /><td className="num">{formatMontant(calc.totalTransport)}</td><td /></tr></tfoot>
          </table>
        </div>
        {!verrou && <button className="btn secondaire" onClick={() => ajouter('transports', ligneTransport)}>+ Ajouter une localité</button>}
      </section>

      <section className="carte">
        <h2>IV. Récapitulatif et contrôle budgétaire</h2>
        <table className="grille recap">
          <tbody>
            <tr><td>Total perdiems</td><td className="num">{formatMontant(calc.totalPerdiems)}</td></tr>
            <tr><td>Total transport</td><td className="num">{formatMontant(calc.totalTransport)}</td></tr>
            <tr><td>{calc.tresorPay.libelle}</td><td className="num">{formatMontant(calc.tresorPay.montant)}</td></tr>
            <tr className="total"><td>TOTAL GÉNÉRAL À PAYER</td><td className="num">{formatMontant(calc.totalGeneral)}</td></tr>
            <tr><td>Budget prévu au TDR</td><td className="num">{formatMontant(calc.budget)}</td></tr>
            <tr className="total"><td>Écart (budget – total)</td><td className="num">{formatMontant(calc.ecart)}</td></tr>
          </tbody>
        </table>
        <div className={calc.ecart < 0 ? 'alerte' : 'succes'}>{calc.alerte}</div>
      </section>
    </>
  );
}
