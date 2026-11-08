import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useRef_ } from '../api.js';
import { calculMission, estBailleur, formatDate, formatMontant as f } from '../../shared/calculs.js';

export default function RecapMission() {
  const { id } = useParams();
  const { ref } = useRef_();
  const [m, setM] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { api.get(`/api/missions/${id}`).then(setM).catch((e) => setErreur(e.message)); }, [id]);
  if (erreur) return <div className="alerte">{erreur}</div>;
  if (!m) return <p>Chargement…</p>;

  const c = m.statut === 'valide' ? m.snapshot.calcul : calculMission(m, ref);
  const bailleur = estBailleur(m.source_financement);

  return (
    <>
      <div className="entete-page no-print">
        <Link to={`/missions/${id}`}>← Retour à la saisie</Link>
        <button className="btn" onClick={() => window.print()}>Imprimer / PDF</button>
      </div>
      <article className="etat paysage">
        <h1 className="titre-etat">ÉTAT RÉCAPITULATIF DES FRAIS DE MISSION</h1>
        <p><b>Objet :</b> {m.objet} – {m.ville} – du {formatDate(m.date_depart)} au {formatDate(m.date_retour)} ({c.colonne})</p>
        <table className="etat-table">
          <thead><tr><th>N°</th><th>Nom et prénoms</th><th>Fonction</th><th>Catégorie</th><th>Taux / jour</th><th>Jours</th>
            <th>Hébergement</th><th>Restauration</th><th>TOTAL</th><th>Bailleur</th><th>Trésor</th></tr></thead>
          <tbody>
            {c.missionnaires.map((x, i) => (
              <tr key={i}><td>{i + 1}</td><td>{x.nom}</td><td>{x.fonction}</td><td>Cat. {x.categorie}</td><td className="num">{f(x.taux)}</td>
                <td className="num">{x.jours}</td><td className="num">{f(x.hebergement)}</td><td className="num">{f(x.restauration)}</td>
                <td className="num"><b>{f(x.total)}</b></td><td className="num">{f(bailleur ? x.total : 0)}</td><td className="num">{f(bailleur ? 0 : x.total)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={6}>TOTAL</td><td className="num">{f(c.totalHebergement)}</td><td className="num">{f(c.totalRestauration)}</td>
            <td className="num">{f(c.total)}</td><td className="num">{f(c.bailleur)}</td><td className="num">{f(c.tresor)}</td></tr></tfoot>
        </table>
        <p className="arrete"><b>Arrêté le présent état à la somme de :</b> <i>{c.enLettres}</i></p>
        <div className="signatures"><span /><span>Signature</span></div>
      </article>
    </>
  );
}
