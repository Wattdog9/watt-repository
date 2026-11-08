import { useState } from 'react';
import { api, useRef_ } from '../api.js';
import { COLONNES_BAREME } from '../../shared/calculs.js';

const CHOIX = {
  base_tresor_pay: [['perdiems', 'Perdiems seuls'], ['perdiems_transport', 'Perdiems + transport']],
  base_hebergement: [['jours', 'Jours'], ['nuitees', 'Nuitées']],
};

export default function Parametres() {
  const { ref, setRef } = useRef_();
  const [d, setD] = useState(() => structuredClone(ref));
  const [msg, setMsg] = useState(null);

  const maj = (liste, i, k, v) => setD({ ...d, [liste]: d[liste].map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  const enregistrer = async () => {
    try {
      const r = await api.put('/api/referentiel', d);
      setRef(r); setD(structuredClone(r));
      setMsg({ t: 'succes', m: 'Barèmes et paramètres enregistrés. Les dossiers validés conservent leurs montants figés.' });
    } catch (e) { setMsg({ t: 'alerte', m: e.message }); }
  };
  const bareme = (cat, zone) => d.baremeMission.findIndex((x) => x.categorie === cat && x.zone === zone);

  return (
    <>
      <div className="entete-page"><h1>Barèmes & paramètres</h1><button className="btn" onClick={enregistrer}>Enregistrer</button></div>
      {msg && <div className={msg.t}>{msg.m}</div>}

      <section className="carte">
        <h2>Paramètres généraux</h2>
        <table className="grille saisie">
          <thead><tr><th>Paramètre</th><th>Valeur</th><th>Source / observation</th></tr></thead>
          <tbody>{d.parametresListe.map((p, i) => (
            <tr key={p.cle}><td>{p.libelle}</td>
              <td>{CHOIX[p.cle]
                ? <select value={p.valeur} onChange={(e) => maj('parametresListe', i, 'valeur', e.target.value)}>{CHOIX[p.cle].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                : <input type="number" step="any" className="court" value={p.valeur} onChange={(e) => maj('parametresListe', i, 'valeur', e.target.value)} />}</td>
              <td className="petit">{p.source}</td></tr>
          ))}</tbody>
        </table>
      </section>

      <section className="carte">
        <h2>Barème des frais de mission (FCFA / jour) – Note n°401</h2>
        <div className="defile"><table className="grille saisie">
          <thead><tr><th>Catégorie</th>{Object.values(COLONNES_BAREME).map((z) => <th key={z}>{z}</th>)}</tr></thead>
          <tbody>{d.categories.map((c) => (
            <tr key={c.categorie}><td title={c.description}><b>Catégorie {c.categorie}</b></td>
              {Object.keys(COLONNES_BAREME).map((z) => {
                const i = bareme(c.categorie, z);
                return <td key={z}><input type="number" value={d.baremeMission[i]?.montant ?? ''} onChange={(e) => maj('baremeMission', i, 'montant', e.target.value)} /></td>;
              })}</tr>
          ))}</tbody>
        </table></div>
        <h3>Villes de Côte d'Ivoire au taux majoré</h3>
        <div className="villes">
          {d.villesMajorees.map((v, i) => (
            <span key={i} className="ville"><input value={v.nom} onChange={(e) => maj('villesMajorees', i, 'nom', e.target.value)} />
              <button className="lien danger" onClick={() => setD({ ...d, villesMajorees: d.villesMajorees.filter((_, j) => j !== i) })}>✕</button></span>
          ))}
          <button className="btn secondaire" onClick={() => setD({ ...d, villesMajorees: [...d.villesMajorees, { nom: '' }] })}>+ Ville</button>
        </div>
      </section>

      <section className="carte">
        <h2>Types de perdiems (montant unitaire par défaut)</h2>
        <table className="grille saisie">
          <thead><tr><th>Libellé</th><th>Montant (FCFA)</th><th>Source</th><th /></tr></thead>
          <tbody>{d.typesPerdiem.map((t, i) => (
            <tr key={t.id ?? `n${i}`}>
              <td><input value={t.libelle} onChange={(e) => maj('typesPerdiem', i, 'libelle', e.target.value)} /></td>
              <td><input type="number" value={t.montant} onChange={(e) => maj('typesPerdiem', i, 'montant', e.target.value)} /></td>
              <td><input value={t.source ?? ''} onChange={(e) => maj('typesPerdiem', i, 'source', e.target.value)} /></td>
              <td><button className="lien danger" onClick={() => setD({ ...d, typesPerdiem: d.typesPerdiem.filter((_, j) => j !== i) })}>✕</button></td>
            </tr>
          ))}</tbody>
        </table>
        <button className="btn secondaire" onClick={() => setD({ ...d, typesPerdiem: [...d.typesPerdiem, { libelle: '', montant: 0, source: '' }] })}>+ Type de perdiem</button>
      </section>

      <section className="carte">
        <h2>Transport des participants – Arrêté 020, art. 17 b)</h2>
        <table className="grille saisie">
          <thead><tr><th>Type</th><th>Mode</th><th>Montant A/R (FCFA)</th><th>Règle</th></tr></thead>
          <tbody>{d.typesTransport.map((t, i) => (
            <tr key={t.code}><td>{t.libelle}</td><td>{t.mode}</td>
              <td>{t.mode === 'forfait' ? <input type="number" value={t.montant} onChange={(e) => maj('typesTransport', i, 'montant', e.target.value)} /> : <span className="petit">calculé</span>}</td>
              <td className="petit">{t.regle}</td></tr>
          ))}</tbody>
        </table>
        <h3>Grille « selon distance » (km ALLER)</h3>
        <table className="grille saisie">
          <thead><tr><th>À partir de (km)</th><th>Montant A/R (FCFA)</th><th>Libellé</th></tr></thead>
          <tbody>{d.grilleDistance.map((g, i) => (
            <tr key={i}>
              <td><input type="number" value={g.km_min} onChange={(e) => maj('grilleDistance', i, 'km_min', e.target.value)} /></td>
              <td><input type="number" value={g.montant} onChange={(e) => maj('grilleDistance', i, 'montant', e.target.value)} /></td>
              <td><input value={g.libelle ?? ''} onChange={(e) => maj('grilleDistance', i, 'libelle', e.target.value)} /></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
