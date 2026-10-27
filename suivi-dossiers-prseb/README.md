# Suivi des dossiers PRSEB

Application web (un seul fichier `index.html`, sans serveur) pour suivre la durée de traitement des dossiers de dépense du Programme PRSEB entre :

- la **Direction exécutive (DE)** : préparation, puis réception des retours ;
- le **Contrôle financier (CF)** : visa, différé ou rejet ;
- l'**Agent comptable (AC)** : paiement, différé ou rejet.

Chaque acteur dispose de **5 jours ouvrables** (modifiable dans les Paramètres).

Chaque dossier est identifié par son **numéro d'ordre de paiement (OP)**, qui en est la clé : il est obligatoire et ne peut pas être enregistré deux fois. Les majuscules et les espaces ne comptent pas, donc « OP-2026-0145 », « op-2026-0145 » et « OP-2026- 0145 » désignent le même ordre de paiement. En cas de doublon, l'application propose d'ouvrir le dossier existant.

## Circuit géré

1. Le dossier arrive au secrétariat de la DE, qui le transmet au CF.
2. Le CF retourne le dossier à la DE :
   - **visé** : la DE le transmet à l'AC ;
   - **différé** : la DE corrige et le renvoie au CF ;
   - **rejeté** : le dossier est clôturé (il peut être repris ; il faudra alors un nouveau visa).
3. L'AC **paie** (dossier clôturé), **diffère** (retour à la DE, puis renvoi à l'AC) ou **rejette**.

## Fonctions

- Tableau de bord : nombre de dossiers à chaque étape du circuit, retards, délais moyens par acteur comparés au délai réglementaire, liste des dossiers à relancer.
- Liste des dossiers avec recherche par n° d'ordre de paiement, objet ou bénéficiaire, et filtres (position, retard).
- Fiche dossier : décision avec date et motif, historique complet, échéance, annulation de la dernière action.
- Rapports : performance par acteur sur une période, temps passé par dossier, export CSV (ouvrable dans Excel).
- Paramètres : délais, jours fériés (fixes `MM-JJ` ou datés `AAAA-MM-JJ`), devise, sauvegarde et import JSON.

Les durées sont comptées en jours ouvrables, du lendemain de la réception jusqu'au jour de sortie inclus, sans les week-ends ni les jours fériés déclarés.

## Version en ligne (claude.ai)

L'application est publiée en ligne : https://claude.ai/artifact/RwZVLb9Y6fqD8HChDaRaSp

- Les dossiers sont enregistrés dans la base de données de l'application, accessible à tout moment et depuis n'importe quel appareil.
- Seul le propriétaire de l'application peut créer, modifier ou supprimer des dossiers.
- Toutes les autres personnes avec qui le lien est partagé consultent en **lecture seule**. Elles doivent être connectées à un compte claude.ai. Leurs écrans se mettent à jour automatiquement.
- Les dossiers saisis auparavant dans le même navigateur peuvent être versés dans la base en un clic (bandeau en haut de la page).
- Paramètres → « Exporter une sauvegarde » ou Rapports → « Exporter en CSV » permettent de garder une copie des données.

## Installation sur un serveur (données partagées)

Le serveur permet au secrétariat de la DE, au Contrôle financier et à l'Agent comptable de travailler sur les **mêmes dossiers**, depuis plusieurs postes.

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus récente, installé sur un ordinateur du bureau allumé pendant les heures de travail, ou sur un serveur. Aucun module à installer.

```bash
cd suivi-dossiers-prseb
MOT_DE_PASSE="choisissez-un-mot-de-passe" node server.js
```

Sous Windows (PowerShell) :

```powershell
cd suivi-dossiers-prseb
$env:MOT_DE_PASSE = "choisissez-un-mot-de-passe"
node server.js
```

Les collègues ouvrent ensuite `http://ADRESSE-IP-DU-SERVEUR:3000` dans leur navigateur et saisissent leur nom et le mot de passe. Pour donner un accès en consultation seulement, lancez aussi `MOT_DE_PASSE_LECTURE="autre-mot-de-passe"` et communiquez ce second mot de passe aux personnes concernées. Le nom de la personne est enregistré sur chaque transmission et chaque décision.

| Variable | Rôle | Par défaut |
|---|---|---|
| `MOT_DE_PASSE` | Mot de passe donnant le droit de modifier. Sans lui, toute personne du réseau peut accéder aux données et les modifier. | aucun |
| `MOT_DE_PASSE_LECTURE` | Second mot de passe, pour consulter sans pouvoir rien modifier (nécessite `MOT_DE_PASSE`). | aucun |
| `PORT` | Port d'écoute | `3000` |
| `HOTE` | Adresse d'écoute | `0.0.0.0` (tout le réseau local) |
| `DOSSIER_DONNEES` | Dossier où sont stockées les données | `./donnees` |

Fonctionnement :

- Les données sont stockées dans `donnees/donnees.json`. Une copie est faite chaque jour dans `donnees/sauvegardes/`, et les 60 dernières sont conservées. Copiez régulièrement ce dossier sur un autre support.
- Les écrans se mettent à jour automatiquement (toutes les 15 secondes) quand un collègue enregistre une modification.
- Si deux personnes modifient le même dossier en même temps, la seconde est prévenue, les données sont rechargées et elle peut recommencer : aucune saisie n'écrase celle d'un autre.
- Pour reprendre des dossiers saisis avant l'installation du serveur : sur l'ancien poste, ouvrez Paramètres puis « Exporter une sauvegarde » ; sur le serveur, ouvrez Paramètres puis « Importer une sauvegarde ».
- Pour un accès depuis Internet (et non le seul réseau du bureau), placez le serveur derrière un serveur web en HTTPS (Nginx, Caddy, IIS…), afin que le mot de passe ne circule pas en clair.

## Utilisation sans serveur

Ouvrir `index.html` dans un navigateur. Les données sont enregistrées dans le navigateur (localStorage) : faire des sauvegardes JSON régulières depuis les Paramètres. Des dossiers d'exemple s'affichent au premier lancement ; le bouton « Supprimer les exemples » les retire.
