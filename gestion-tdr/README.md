# Gestion des TDR – Ateliers & Missions

Application web (React + Node.js + SQLite) qui automatise le traitement des TDR :

- **Ateliers** : le service initiateur saisit le TDR (perdiems, transport des participants) et l'application produit
  l'**ÉTAT DES PERDIEMS** (récapitulatif Bailleur / Trésor, frais Trésor Pay, transport, détail des perdiems, montant en lettres).
- **Missions** : saisie de l'ordre de mission et des missionnaires (catégorie 1, 2 ou 3) ; l'application produit une
  **NOTE DE FRAIS DE MISSION** par missionnaire (hébergement justifiable / restauration non justifiable) et l'**état récapitulatif**.

Référentiel : Arrêté n°020/MEFB/CAB du 20/02/2026 (art. 11, 12, 17) et Note n°401/MEFB/CAB/CCSPP-BM du 22/05/2026.

## Installation (une seule fois)

1. Installer **Node.js** (version 18 ou plus récente, version « LTS » conseillée) depuis https://nodejs.org.
2. Ouvrir une invite de commandes (Windows : touche Windows, taper `cmd`) dans le dossier `gestion-tdr`, puis :

```bash
npm install
```

## Lancer l'application

```bash
npm start
```

Attendre le message « Gestion des TDR démarrée », puis ouvrir **http://localhost:3001** dans le navigateur
(Chrome, Edge ou Firefox). Laisser la fenêtre de commandes ouverte pendant l'utilisation ; `Ctrl + C` pour arrêter.

La base de données est créée automatiquement dans `data/tdr.db` (avec les barèmes officiels et un exemple
d'atelier et de mission). Sauvegarder ce fichier suffit pour sauvegarder toutes les données.
Aucun logiciel de base de données n'est à installer.

### En cas de problème

| Symptôme | Solution |
|---|---|
| `'npm' n'est pas reconnu…` | Node.js n'est pas installé (ou fermer/rouvrir l'invite de commandes après l'installation). |
| `Le port 3001 est déjà utilisé` | L'application tourne déjà : ouvrir http://localhost:3001. Sinon : `set PORT=3002 && npm run serveur`. |
| Page « Interface non compilée » | Lancer `npm start` (et non `node server/index.js`). |
| La page ne s'ouvre pas | Vérifier que la fenêtre de commandes est toujours ouverte et affiche « démarrée ». |

### Développement

```bash
npm run dev
```

Ouvrir http://localhost:5173 (l'interface se recharge à chaque modification).

### Tests des calculs

```bash
npm test
```

## Fonctionnement

| Écran | Rôle |
|---|---|
| Tableau de bord | Liste des ateliers et missions, totaux, statut |
| Nouvel atelier / Saisie | Formulaire TDR avec calcul en direct et contrôle du budget |
| État des perdiems | État prêt à imprimer ou à enregistrer en PDF |
| Nouvelle mission / Saisie | Ordre de mission, missionnaires et catégories |
| Notes de frais | Une note par missionnaire (impression : une page par note) |
| Récapitulatif | État collectif Bailleur / Trésor |
| Barèmes & paramètres | Barèmes de l'arrêté, taux Trésor Pay, prix du super, ventilation hébergement/restauration… |

**Validation** : un dossier validé est verrouillé et ses montants sont **figés** (avec les paramètres utilisés à cette date).
Une modification ultérieure des barèmes ne change donc pas les états déjà validés. « Dévalider » permet de corriger un dossier.

## Règles de calcul

- **Frais Trésor Pay** : 1 % du total des perdiems (paramétrable : « Perdiems + transport »).
- **Transport (art. 17 b)** : commune d'Abidjan 10 000 ; intra-ville 5 000 ; périphérie d'Abidjan 15 000 ;
  selon distance 20 000 / 30 000 / 40 000 / 45 000 / 50 000 ; autorités avec véhicule : km x 2 x 15 L/100 km x prix du super (minimum 25 000) ;
  autorités membres de comités locaux 100 000.
- **Missions (Note 401)** : taux journalier selon la catégorie et la zone ; taux majoré automatique pour Abidjan, Yamoussoukro, San Pedro et Assinie.
  Nombre de jours = retour – départ + 1.

### Hypothèses à valider (modifiables dans « Barèmes & paramètres »)

- Ventilation du forfait mission : 60 % hébergement / 40 % restauration.
- Hébergement calculé sur les jours (option : nuitées).
- Distance saisie = distance aller (x 2 pour l'aller-retour) ; prix du super indicatif (875 FCFA/L) à mettre à jour.

## Structure

```
gestion-tdr/
├── server/        API Express + base SQLite via sql.js (schéma, données initiales)
├── shared/        Moteur de calcul commun (navigateur + serveur) et tests
└── src/           Interface React (pages de saisie et états imprimables)
```
