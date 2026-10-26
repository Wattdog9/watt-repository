# Suivi des dossiers PRSEB

Application web (un seul fichier `index.html`, sans serveur) pour suivre la durée de traitement des dossiers de dépense du Programme PRSEB entre :

- la **Direction exécutive (DE)** : préparation, puis réception des retours ;
- le **Contrôle financier (CF)** : visa, différé ou rejet ;
- l'**Agent comptable (AC)** : paiement, différé ou rejet.

Chaque acteur dispose de **5 jours ouvrables** (modifiable dans les Paramètres).

## Circuit géré

1. Le dossier arrive au secrétariat de la DE, qui le transmet au CF.
2. Le CF retourne le dossier à la DE :
   - **visé** : la DE le transmet à l'AC ;
   - **différé** : la DE corrige et le renvoie au CF ;
   - **rejeté** : le dossier est clôturé (il peut être repris ; il faudra alors un nouveau visa).
3. L'AC **paie** (dossier clôturé), **diffère** (retour à la DE, puis renvoi à l'AC) ou **rejette**.

## Fonctions

- Tableau de bord : nombre de dossiers à chaque étape du circuit, retards, délais moyens par acteur comparés au délai réglementaire, liste des dossiers à relancer.
- Liste des dossiers avec recherche et filtres (position, retard).
- Fiche dossier : décision avec date et motif, historique complet, échéance, annulation de la dernière action.
- Rapports : performance par acteur sur une période, temps passé par dossier, export CSV (ouvrable dans Excel).
- Paramètres : délais, jours fériés (fixes `MM-JJ` ou datés `AAAA-MM-JJ`), devise, sauvegarde et import JSON.

Les durées sont comptées en jours ouvrables, du lendemain de la réception jusqu'au jour de sortie inclus, sans les week-ends ni les jours fériés déclarés.

## Utilisation

Ouvrir `index.html` dans un navigateur. Les données sont enregistrées dans le navigateur (localStorage) : faire des sauvegardes JSON régulières depuis les Paramètres. Des dossiers d'exemple s'affichent au premier lancement ; le bouton « Supprimer les exemples » les retire.
