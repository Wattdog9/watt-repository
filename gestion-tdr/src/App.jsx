import { useCallback, useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { api, RefContext } from './api.js';
import Accueil from './pages/Accueil.jsx';
import AtelierForm from './pages/AtelierForm.jsx';
import EtatPerdiems from './pages/EtatPerdiems.jsx';
import MissionForm from './pages/MissionForm.jsx';
import NoteFrais from './pages/NoteFrais.jsx';
import RecapMission from './pages/RecapMission.jsx';
import Parametres from './pages/Parametres.jsx';

export default function App() {
  const [ref, setRef] = useState(null);
  const [erreur, setErreur] = useState('');
  const recharger = useCallback(() => api.get('/api/referentiel').then(setRef).catch((e) => setErreur(e.message)), []);
  useEffect(() => { recharger(); }, [recharger]);

  if (erreur) return <div className="page"><div className="alerte">Serveur inaccessible : {erreur}</div></div>;
  if (!ref) return <div className="page">Chargement…</div>;

  return (
    <RefContext.Provider value={{ ref, setRef, recharger }}>
      <header className="barre no-print">
        <div className="marque">Gestion des TDR <span>Ateliers & Missions</span></div>
        <nav>
          <NavLink to="/" end>Tableau de bord</NavLink>
          <NavLink to="/ateliers/nouveau">Nouvel atelier</NavLink>
          <NavLink to="/missions/nouvelle">Nouvelle mission</NavLink>
          <NavLink to="/parametres">Barèmes & paramètres</NavLink>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/ateliers/nouveau" element={<AtelierForm />} />
          <Route path="/ateliers/:id" element={<AtelierForm />} />
          <Route path="/ateliers/:id/etat" element={<EtatPerdiems />} />
          <Route path="/missions/nouvelle" element={<MissionForm />} />
          <Route path="/missions/:id" element={<MissionForm />} />
          <Route path="/missions/:id/notes" element={<NoteFrais />} />
          <Route path="/missions/:id/recap" element={<RecapMission />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="*" element={<p>Page introuvable.</p>} />
        </Routes>
      </main>
    </RefContext.Provider>
  );
}
