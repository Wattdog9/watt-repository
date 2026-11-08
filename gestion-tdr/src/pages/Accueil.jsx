import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatMontant } from '../../shared/calculs.js';

const Statut = ({ s }) => <span className={`badge ${s}`}>{s === 'valide' ? 'Validé' : 'Brouillon'}</span>;

export default function Accueil() {
  const [ateliers, setAteliers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [erreur, setErreur] = useState('');

  const charger = () => {
    api.get('/api/ateliers').then(setAteliers).catch((e) => setErreur(e.message));
    api.get('/api/missions').then(setMissions).catch((e) => setErreur(e.message));
  };
  useEffect(charger, []);

  const supprimer = async (type, id, nom) => {
    if (!window.confirm(`Supprimer définitivement « ${nom} » ?`)) return;
    await api.del(`/api/${type}/${id}`);
    charger();
  };

  const totalAteliers = ateliers.reduce((s, a) => s + a.total, 0);
  const totalMissions = missions.reduce((s, m) => s + m.total, 0);

  return (
    <>
      {erreur && <div className="alerte">{erreur}</div>}
      <div className="tuiles">
        <div className="tuile"><div className="lib">Ateliers</div><div className="val">{ateliers.length}</div><div className="sous">{formatMontant(totalAteliers)} FCFA</div></div>
        <div className="tuile"><div className="lib">Missions</div><div className="val">{missions.length}</div><div className="sous">{formatMontant(totalMissions)} FCFA</div></div>
        <div className="tuile"><div className="lib">À valider</div><div className="val">{[...ateliers, ...missions].filter((x) => x.statut !== 'valide').length}</div><div className="sous">dossiers en brouillon</div></div>
      </div>

      <section className="carte">
        <div className="entete-section"><h2>Ateliers</h2><Link className="btn" to="/ateliers/nouveau">+ Nouvel atelier</Link></div>
        <table className="grille">
          <thead><tr><th>N°</th><th>Thème</th><th>Lieu</th><th>Période</th><th>Financement</th><th className="num">Total (FCFA)</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {ateliers.length === 0 && <tr><td colSpan={8} className="vide">Aucun atelier</td></tr>}
            {ateliers.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td className="long">{a.theme}</td>
                <td>{a.lieu}</td>
                <td>{formatDate(a.date_debut)} – {formatDate(a.date_fin)}</td>
                <td>{String(a.source_financement || '').split(' ')[0]}</td>
                <td className="num">{formatMontant(a.total)}</td>
                <td><Statut s={a.statut} /></td>
                <td className="actions">
                  <Link to={`/ateliers/${a.id}`}>Saisie</Link>
                  <Link to={`/ateliers/${a.id}/etat`}>État des perdiems</Link>
                  <button className="lien danger" onClick={() => supprimer('ateliers', a.id, a.theme)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="carte">
        <div className="entete-section"><h2>Missions</h2><Link className="btn" to="/missions/nouvelle">+ Nouvelle mission</Link></div>
        <table className="grille">
          <thead><tr><th>N°</th><th>Objet</th><th>Destination</th><th>Période</th><th className="num">Missionnaires</th><th className="num">Total (FCFA)</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {missions.length === 0 && <tr><td colSpan={8} className="vide">Aucune mission</td></tr>}
            {missions.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td className="long">{m.objet}</td>
                <td>{m.ville}</td>
                <td>{formatDate(m.date_depart)} – {formatDate(m.date_retour)}</td>
                <td className="num">{m.nb}</td>
                <td className="num">{formatMontant(m.total)}</td>
                <td><Statut s={m.statut} /></td>
                <td className="actions">
                  <Link to={`/missions/${m.id}`}>Saisie</Link>
                  <Link to={`/missions/${m.id}/notes`}>Notes de frais</Link>
                  <Link to={`/missions/${m.id}/recap`}>Récapitulatif</Link>
                  <button className="lien danger" onClick={() => supprimer('missions', m.id, m.objet)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
