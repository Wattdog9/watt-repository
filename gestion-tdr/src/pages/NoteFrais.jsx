import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useRef_ } from '../api.js';
import { calculMission, formatDate, formatMontant as f } from '../../shared/calculs.js';

export default function NoteFrais() {
  const { id } = useParams();
  const { ref } = useRef_();
  const [m, setM] = useState(null);
  const [choix, setChoix] = useState('tous');
  const [erreur, setErreur] = useState('');
  useEffect(() => { api.get(`/api/missions/${id}`).then(setM).catch((e) => setErreur(e.message)); }, [id]);
  if (erreur) return <div className="alerte">{erreur}</div>;
  if (!m) return <p>Chargement…</p>;

  const c = m.statut === 'valide' ? m.snapshot.calcul : calculMission(m, ref);
  const liste = choix === 'tous' ? c.missionnaires : c.missionnaires.filter((_, i) => String(i) === choix);

  return (
    <>
      <div className="entete-page no-print">
        <Link to={`/missions/${id}`}>← Retour à la saisie</Link>
        <div className="boutons">
          {m.statut !== 'valide' && <span className="badge brouillon">Brouillon – montants non figés</span>}
          <select value={choix} onChange={(e) => setChoix(e.target.value)}>
            <option value="tous">Tous les missionnaires ({c.missionnaires.length} notes)</option>
            {c.missionnaires.map((x, i) => <option key={i} value={i}>{i + 1}. {x.nom}</option>)}
          </select>
          <button className="btn" onClick={() => window.print()}>Imprimer / PDF</button>
        </div>
      </div>

      {liste.length === 0 && <div className="alerte">Aucun missionnaire saisi.</div>}
      {liste.map((x, i) => (
        <article className="etat saut-page" key={i}>
          <h1 className="titre-etat">NOTE DE FRAIS DE MISSION</h1>
          <dl className="entete-etat">
            <dt>Structure :</dt><dd>{m.structure}</dd>
            <dt>Projet / Programme :</dt><dd>{m.projet}</dd>
            <dt>Ordre de mission :</dt><dd>{m.numero_om}</dd>
            <dt>Destination :</dt><dd>{m.ville} – {c.colonne}</dd>
            <dt>Période :</dt><dd>Du {formatDate(m.date_depart)} au {formatDate(m.date_retour)}</dd>
            <dt>Source de financement :</dt><dd>{m.source_financement}</dd>
          </dl>
          <table className="etat-table">
            <thead><tr><th>Désignation</th><th>Nombre de jours</th><th>Prix unitaire</th><th>Montant</th></tr></thead>
            <tbody>
              <tr><td colSpan={4}><b>{c.objet}</b></td></tr>
              <tr><td colSpan={4}><b>Bénéficiaire : {x.nom} – {x.fonction} (Catégorie {x.categorie})</b></td></tr>
              <tr><td>Perdiem hébergement (montant justifiable)</td><td className="num">{x.qteHeb} {x.uniteHeb}</td><td className="num">{f(x.puHeb)}</td><td className="num">{f(x.hebergement)}</td></tr>
              <tr><td colSpan={4} className="detail">{x.detailHeb}</td></tr>
              <tr><td>Frais de restauration (montant non justifiable)</td><td className="num">{x.jours} jour(s)</td><td className="num">{f(x.puRest)}</td><td className="num">{f(x.restauration)}</td></tr>
              <tr><td colSpan={4} className="detail">{x.detailRest}</td></tr>
            </tbody>
            <tfoot><tr><td colSpan={3}>TOTAL</td><td className="num">{f(x.total)}</td></tr></tfoot>
          </table>
          <p className="arrete"><b>Arrêter la présente note à la somme de :</b> <i>{x.enLettres}</i></p>
          <div className="signatures"><span /><span>Signature</span></div>
        </article>
      ))}
    </>
  );
}
