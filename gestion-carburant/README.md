# Carbu·Suivi : gestion du carburant (3 fournisseurs, 2 sources de financement)

Application web autonome (un seul fichier `index.html`, sans serveur ni dépendance) pour suivre
les approvisionnements en carburant auprès de **trois fournisseurs**, imputés sur **deux sources
de financement** disposant chacune d'une enveloppe budgétaire.

Ouvrir `gestion-carburant/index.html` dans un navigateur. Les données sont enregistrées dans le
navigateur (`localStorage`). Au premier lancement, un jeu de données d'exemple est chargé (voir la
mention « Données d'exemple »).

## Fonctionnalités

### 1. Tableau de bord
- **Jauge par source de financement** : enveloppe, montant engagé, reste disponible, volume (L),
  nombre de bons, avec un état *Disponible* / *Seuil atteint* / *Épuisé* selon le seuil d'alerte.
- **Matrice fournisseur × source** : montants (FCFA) et volumes (L) croisés, totaux, part de
  chaque fournisseur.
- **Dépenses mensuelles** empilées par source.
- **Prix en vigueur** par fournisseur (gasoil / super), avec le moins cher signalé.

### 2. Approvisionnements (bons)
- Saisie d'un bon : date, n° de bon (numérotation automatique `BC-<exercice>-0001`), fournisseur,
  source, carburant, litres, prix unitaire (prérempli depuis le tarif du fournisseur), bénéficiaire.
- Calcul du montant en direct et du **reste sur la source après le bon**.
- **Contrôle budgétaire** : un bon qui dépasse le reste disponible de la source est refusé.
- Contrôle des doublons de numéro de bon.
- Historique filtrable par fournisseur et par source, suppression avec confirmation.
- **Export CSV** (séparateur `;`, prêt pour Excel) copié dans le presse-papiers.

### 3. Paramètres
- Nom, contact et tarifs (gasoil / super) des 3 fournisseurs.
- Intitulé, code et enveloppe des 2 sources de financement.
- Seuil d'alerte (%) et exercice budgétaire.
- Rechargement des données d'exemple ou remise à zéro.

## Modèle de données

```
fournisseurs[3] : { id: F1|F2|F3, nom, contact, prix: { gasoil, super } }
sources[2]      : { id: S1|S2, nom, code, budget }
operations[]    : { id, date, bon, fournisseur, source, carburant, litres, prix, beneficiaire }
montant = litres × prix  (le prix est figé sur le bon au moment de la saisie)
```

## Pistes d'évolution
- Back-end partagé (ex. API + base PostgreSQL) pour un usage multi-utilisateurs avec rôles
  (saisie, validation, ordonnateur).
- Circuit de validation des bons (brouillon → validé → livré → facturé → payé).
- Rapprochement avec les factures fournisseurs et suivi des paiements par source.
- Suivi par véhicule (kilométrage, consommation L/100 km) et cartes carburant.
- Plafonds par fournisseur ou répartition contractuelle entre les sources.
