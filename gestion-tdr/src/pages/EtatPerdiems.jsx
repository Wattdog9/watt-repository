import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useRef_ } from '../api.js';
import { calculAtelier, formatDate, formatMontant as f } from '../../shared/calculs.js';

export default function EtatPerdiems() {
  const { id } = useParams();
  const { ref } = useRef_();
  const [a, setA] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { api.get(`/api/ateliers/${id}`).then(setA).catch((e) => setErreur(e.message)); }, [id]);
  if (erreur) return <div className="alerte">{erreur}</div>;
  if (!a) return <p>Chargement…</p>;

  const c = a.statut === 'valide' ? a.snapshot.calcul : calculAtelier(a, ref);

  return (
    <>
      <div className="entete-page no-print">
        <Link to={`/ateliers/${id}`}>← Retour à la saisie</Link>
        <div className="boutons">
          {a.statut !== 'valide' && <span className="badge brouillon">Brouillon – montants non figés</span>}
          <button className="btn" onClick={() => window.print()}>Imprimer / PDF</button>
        </div>
      </div>

      <article className="etat">
        <h1 className="titre-etat">ETAT DES PERDIEMS</h1>
        <dl className="entete-etat">
          <dt>Structure :</dt><dd>{a.structure}</dd>
          <dt>Projet / Programme :</dt><dd>{a.projet}</dd>
          <dt>Atelier :</dt><dd>{a.theme}</dd>
          <dt>Activité :</dt><dd>{a.reference}</dd>
          <dt>Lieu et période :</dt><dd>{a.lieu} – du {formatDate(a.date_debut)} au {formatDate(a.date_fin)}</dd>
          <dt>Source de financement :</dt><dd>{a.source_financement}</dd>
        </dl>

        <h3>Etat récapitulatif des perdiems</h3>
        <table className="etat-table">
          <thead>
            <tr><th rowSpan={2}>Bénéficiaire</th><th rowSpan={2}>Objet de la dépense</th><th colSpan={2}>Montant</th></tr>
            <tr><th>Bailleur</th><th>Trésor</th></tr>
          </thead>
          <tbody>
            <tr><td>{a.beneficiaire}</td><td>{c.objet}</td><td className="num">{f(c.recap.perdiems.bailleur)}</td><td className="num">{f(c.recap.perdiems.tresor)}</td></tr>
            <tr><td>{a.beneficiaire}</td><td>Frais Trésor Pay : {+(c.tresorPay.taux * 100).toFixed(2)} % x {f(c.tresorPay.base)} ({c.tresorPay.libelleBase.toLowerCase()})</td>
              <td className="num">{f(c.recap.tresorPay.bailleur)}</td><td className="num">{f(c.recap.tresorPay.tresor)}</td></tr>
          </tbody>
          <tfoot><tr><td colSpan={2}>TOTAL (perdiems + frais Trésor Pay)</td>
            <td className="num">{f(c.recap.perdiems.bailleur + c.recap.tresorPay.bailleur)}</td>
            <td className="num">{f(c.recap.perdiems.tresor + c.recap.tresorPay.tresor)}</td></tr></tfoot>
        </table>

        <h3>Frais TRESOR PAY :</h3>
        <table className="etat-table">
          <thead><tr><th>Base de calcul</th><th>Montant de la base</th><th>Taux</th><th>Montant</th></tr></thead>
          <tbody><tr><td>{c.tresorPay.libelleBase}</td><td className="num">{f(c.tresorPay.base)}</td>
            <td className="num">{+(c.tresorPay.taux * 100).toFixed(2)} %</td><td className="num"><b>{f(c.tresorPay.montant)}</b></td></tr></tbody>
        </table>

        <h3>Transport :</h3>
        <table className="etat-table">
          <thead><tr><th>Bénéficiaire (localité de provenance)</th><th>Montant unitaire</th><th>Fréquence (nb participants)</th><th>Total</th></tr></thead>
          <tbody>
            {c.transports.map((t, i) => (
              <tr key={i}><td>{t.localite}</td><td className="num">{f(t.mu)}</td><td className="num">{f(t.nbParticipants)}</td><td className="num">{f(t.montant)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td>TOTAL</td><td /><td className="num">{f(c.nbParticipants)}</td><td className="num">{f(c.totalTransport)}</td></tr></tfoot>
        </table>

        <h3>Détail des perdiems</h3>
        <table className="etat-table">
          <thead><tr><th>Libellé ou catégorie</th><th>Nombre de personnes</th><th>Nombre de jours</th><th>Fréquence</th><th>Montant unitaire</th><th>Montant total</th></tr></thead>
          <tbody>
            {c.perdiems.map((p, i) => (
              <tr key={i}><td>{p.libelleAffiche}</td><td className="num">{f(p.nbPersonnes)}</td><td className="num">{p.nbJours}</td>
                <td className="num">{p.frequence}</td><td className="num">{f(p.mu)}</td><td className="num">{f(p.montant)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={5}>TOTAL</td><td className="num">{f(c.totalPerdiems)}</td></tr>
            <tr><td colSpan={5}>{c.tresorPay.libelle}</td><td className="num">{f(c.tresorPay.montant)}</td></tr>
          </tfoot>
        </table>

        <table className="etat-table total-general">
          <tbody><tr><td>TOTAL GÉNÉRAL (perdiems + transport + Trésor Pay)</td><td className="num">{f(c.totalGeneral)}</td></tr></tbody>
        </table>

        <p className="arrete"><b>Arrêté le présent état à la somme de :</b> <i>{c.enLettres}</i></p>
        <div className="signatures"><span>Signature</span><span>Date</span></div>
      </article>
    </>
  );
}
