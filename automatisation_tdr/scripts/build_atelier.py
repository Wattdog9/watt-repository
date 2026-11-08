import sys
from datetime import date
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation
from common import *

OUT = sys.argv[1]
wb = Workbook()

# =====================================================================
# PARAMETRES
# =====================================================================
P = wb.active
P.title = "Parametres"
P.sheet_properties.tabColor = "7F7F7F"
for col, w in zip("ABCDE", [4, 62, 18, 60, 4]):
    P.column_dimensions[col].width = w
title(P, "B1:D1", "PARAMÈTRES ET BARÈMES – ATELIERS (Arrêté n°020/MEFB/CAB du 20/02/2026)", 12)

section(P, "B3:D3", "1. Paramètres généraux")
header(P, 4, 2, ["Paramètre", "Valeur", "Source / observation"])
gen = [
    ("Taux frais Trésor Pay", 0.01, "1 % du montant des perdiems (instruction RAF)", "0%"),
    ("Prix du litre de super (FCFA)", 875, "À METTRE À JOUR selon le prix à la pompe en vigueur (valeur indicative)", NUM),
    ("Consommation moyenne (litres / 100 km)", 15, "Arrêté 020, art. 17 b) – véhicules administratifs / autorités", NUM),
    ("Plancher transport autorités (FCFA)", 25000, "Arrêté 020, art. 17 b) – minimum si le calcul au km est inférieur", NUM),
    ("Coefficient aller-retour (distance x)", 2, "Hypothèse : le kilométrage saisi est la distance ALLER ; x2 pour l'aller-retour", NUM),
]
for i, (lab, val, src, fmt) in enumerate(gen):
    r = 5 + i
    style(P.cell(r, 2, lab))
    style(P.cell(r, 3, val), font=F_IN, fill=FILL_IN, align=RIGHT, fmt=fmt)
    style(P.cell(r, 4, src), font=F_SMALL)
TAUX_TP, PRIX_SUPER, CONSO, PLANCHER, COEF_AR = "Parametres!$C$5", "Parametres!$C$6", "Parametres!$C$7", "Parametres!$C$8", "Parametres!$C$9"
style(P.cell(10, 2, "Base de calcul des frais Trésor Pay"))
style(P.cell(10, 3, "Perdiems seuls"), font=F_IN, fill=FILL_IN, align=RIGHT)
style(P.cell(10, 4, "« Perdiems seuls » (par défaut) ou « Perdiems + transport » (ancien modèle d'état / budget TDR)"), font=F_SMALL)
dv_tp = DataValidation(type="list", formula1='"Perdiems seuls,Perdiems + transport"'); P.add_data_validation(dv_tp); dv_tp.add("C10")
BASE_TP = "Parametres!$C$10"

section(P, "B11:D11", "2. Sources de financement")
header(P, 12, 2, ["Source", "Colonne de l'état", "Observation"])
sources = [("Bailleur (IDA / Banque mondiale)", "Bailleur", "Ressources du bailleur"),
           ("Trésor (Part Etat)", "Trésor", "Contrepartie / Part Etat")]
for i, (s, colname, o) in enumerate(sources):
    style(P.cell(13 + i, 2, s)); style(P.cell(13 + i, 3, colname), align=CENTER); style(P.cell(13 + i, 4, o), font=F_SMALL)
SRC_LIST = "Parametres!$B$13:$B$14"

section(P, "B16:D16", "3. Types de perdiems / indemnités (montant unitaire par défaut)")
header(P, 17, 2, ["Type de perdiem", "Montant unitaire (FCFA)", "Source / observation"])
perd = [
    ("Forfait dîner (quartier libre)", 15000, "Pratique TDR (budget atelier) – à ajuster si nécessaire"),
    ("Forfait déjeuner", 15000, "Pratique TDR – à ajuster si nécessaire"),
    ("Forfait facilitation / personne-ressource", 40000, "Pratique TDR – forfait par facilitateur"),
    ("Président Comité de Pilotage (par session)", 200000, "Arrêté 020, art. 12"),
    ("Membre Comité de Pilotage (par session)", 100000, "Arrêté 020, art. 12"),
    ("Président Comité Technique (par session)", 150000, "Arrêté 020, art. 12"),
    ("Membre Comité Technique (par session)", 75000, "Arrêté 020, art. 12"),
    ("Président Comité local (par session)", 100000, "Arrêté 020, art. 12"),
    ("Membre Comité local (par session)", 50000, "Arrêté 020, art. 12"),
    ("Membre Commission ouverture plis / jugement offres (par AO)", 75000, "Arrêté 020, art. 11"),
    ("Frais de mission Côte d'Ivoire (forfait/jour)", 60000, "Arrêté 020, art. 17 a) – maximum ; voir Note n°401 par catégorie"),
    ("Autre (saisir le montant unitaire spécifique)", 0, "Renseigner obligatoirement la colonne « MU spécifique »"),
]
for i, (lab, mu, src) in enumerate(perd):
    r = 18 + i
    style(P.cell(r, 2, lab)); style(P.cell(r, 3, mu), font=F_IN, fill=FILL_IN, align=RIGHT, fmt=NUM); style(P.cell(r, 4, src), font=F_SMALL)
PERD_TYPES = f"Parametres!$B$18:$B${17+len(perd)}"
PERD_MU = f"Parametres!$C$18:$C${17+len(perd)}"

r0 = 18 + len(perd) + 1
section(P, f"B{r0}:D{r0}", "4. Barème transport des participants (Arrêté 020, art. 17 b)")
header(P, r0 + 1, 2, ["Type de transport", "Montant A/R (FCFA)", "Règle de calcul"])
transp = [
    ("Commune d'Abidjan", 10000, "Forfait unique, non justifiable"),
    ("Intra-ville (intérieur)", 5000, "Forfait unique aller/retour, non justifiable"),
    ("Périphérie d'Abidjan (Dabou, Bassam, Bingerville, Anyama)", 15000, "Forfait unique aller/retour, non justifiable"),
    ("Selon distance – sans véhicule administratif", None, "Forfait selon la distance résidence → lieu de l'atelier (grille ci-dessous)"),
    ("Véhicule administratif / autorités (calcul carburant)", None, "Distance x coef. A/R x 15 L/100 km x prix du super ; minimum 25 000"),
    ("Autorité membre comité local de suivi / exécution", 100000, "Forfait art. 17 b)"),
    ("Montant spécifique (saisir)", 0, "Renseigner obligatoirement la colonne « MU spécifique »"),
]
tr0 = r0 + 2
for i, (lab, mu, rule) in enumerate(transp):
    r = tr0 + i
    style(P.cell(r, 2, lab)); style(P.cell(r, 3, mu if mu is not None else "calculé"), font=F_IN if mu is not None else F_SMALL,
                                    fill=FILL_IN if mu is not None else None, align=RIGHT, fmt=NUM)
    style(P.cell(r, 4, rule), font=F_SMALL)
TR_TYPES = f"Parametres!$B${tr0}:$B${tr0+len(transp)-1}"
TR_MU = f"Parametres!$C${tr0}:$C${tr0+len(transp)-1}"
TR_DIST = f"Parametres!$B${tr0+3}"
TR_CARB = f"Parametres!$B${tr0+4}"

g0 = tr0 + len(transp) + 1
section(P, f"B{g0}:D{g0}", "5. Grille « selon distance » (km ALLER, résidence → lieu de l'atelier)")
header(P, g0 + 1, 2, ["Distance à partir de (km)", "Montant A/R (FCFA)", "Tranche"])
grid = [(0, 20000, "De 0 à 150 km"), (151, 30000, "De 151 à 300 km"), (301, 40000, "De 301 à 450 km"),
        (451, 45000, "De 451 à 600 km"), (601, 50000, "Supérieur à 600 km")]
for i, (d, mu, lab) in enumerate(grid):
    r = g0 + 2 + i
    style(P.cell(r, 2, d), align=RIGHT, fmt=NUM); style(P.cell(r, 3, mu), font=F_IN, fill=FILL_IN, align=RIGHT, fmt=NUM)
    style(P.cell(r, 4, lab), font=F_SMALL)
GRID = f"Parametres!$B${g0+2}:$C${g0+6}"
P.freeze_panes = "A3"

# =====================================================================
# SAISIE TDR  (renseignée par le service initiateur)
# =====================================================================
S = wb.create_sheet("Saisie_TDR", 0)
S.sheet_properties.tabColor = "FFC000"
widths = {"A": 2, "B": 6, "C": 44, "D": 46, "E": 13, "F": 12, "G": 12, "H": 15, "I": 15, "J": 17}
for k, v in widths.items():
    S.column_dimensions[k].width = v
title(S, "B1:J1", "FICHE DE SAISIE TDR – ATELIER (à renseigner par le service initiateur)")
S.merge_cells("B2:J2")
S["B2"] = ("Renseigner UNIQUEMENT les cellules jaunes (texte bleu). Les cellules vertes sont calculées automatiquement. "
           "L'« ETAT DES PERDIEMS » est généré automatiquement dans la feuille Etat_Perdiems.")
style(S["B2"], font=F_SMALL, border=False)
S.row_dimensions[2].height = 28

section(S, "B4:J4", "I. INFORMATIONS GÉNÉRALES DE L'ATELIER")
info = [
    ("Structure initiatrice", "DMOSS – Direction de la Mutualité et des Œuvres Sociales en milieu Scolaire"),
    ("Projet / Programme", "PRSEB – Programme de Renforcement du Système Éducatif de Base"),
    ("Thème / intitulé de l'atelier", "Renforcement de capacités des acteurs locaux de suivi (DRENA, DR Santé, DRFFE, DD Santé, Coordo CEC/CS et IDE) et opérationnels de la visite médicale des apprenants du préscolaire, pré-primaire et CP1 dans les zones du PRSEB"),
    ("Référence activité (PTBA)", "Activité 2.1.1 – PTBA 2026-2027"),
    ("Lieu de l'atelier", "Yamoussoukro"),
    ("Date de début", date(2026, 10, 18)),
    ("Date de fin", date(2026, 10, 24)),
    ("Source de financement", "Bailleur (IDA / Banque mondiale)"),
    ("Bénéficiaire du paiement (régisseur / payeur)", "Séka née ASSAMOUA"),
    ("Point focal (nom, fonction, contact)", "Dr N'fah SANDOKO, S/D Education pour la Santé – DMOSS"),
    ("Budget « perdiems participants » prévu au TDR (contrôle)", 23235050),
]
INFO = {}
for i, (lab, val) in enumerate(info):
    r = 5 + i
    S.merge_cells(f"B{r}:C{r}"); S.merge_cells(f"D{r}:J{r}")
    S[f"B{r}"] = lab
    box(S, f"B{r}:C{r}", font=F_B)
    S[f"D{r}"] = val
    fmt = "dd/mm/yyyy" if isinstance(val, date) else (NUM if isinstance(val, int) else None)
    box(S, f"D{r}:J{r}", font=F_IN, fill=FILL_IN, fmt=fmt, align=LEFT)
    INFO[lab] = f"Saisie_TDR!$D${r}"
S.row_dimensions[7].height = 42
r_src = 5 + 7
dv_src = DataValidation(type="list", formula1=f"={SRC_LIST}", allow_blank=False)
S.add_data_validation(dv_src); dv_src.add(f"D{r_src}")
dv_date = DataValidation(type="date", operator="greaterThan", formula1="DATE(2020,1,1)")
S.add_data_validation(dv_date); dv_date.add("D10"); dv_date.add("D11")
note(S["D12"], "Choisir dans la liste : le montant total des perdiems sera placé dans la colonne Bailleur ou Trésor de l'état récapitulatif.")
note(S["D13"], "Nom de la personne au nom de laquelle l'état des perdiems est établi (ex. régisseur).")

r = 17
S[f"B{r}"] = "Durée (jours calendaires)"
S.merge_cells(f"B{r}:C{r}"); box(S, f"B{r}:C{r}", font=F_B)
S[f"D{r}"] = "=IF(AND(ISNUMBER(D10),ISNUMBER(D11)),D11-D10+1,\"\")"
style(S[f"D{r}"], fill=FILL_CALC, align=LEFT, fmt="0")

# ---- A. Perdiems
PA_H = 19
section(S, f"B{PA_H}:J{PA_H}", "II. DÉTAIL DES PERDIEMS (une ligne par catégorie de bénéficiaires)")
header(S, PA_H + 1, 2, ["N°", "Type de perdiem (liste)", "Libellé détaillé / catégorie de bénéficiaires",
                        "Nombre de personnes", "Nombre de jours", "Fréquence", "MU spécifique (optionnel)",
                        "Montant unitaire retenu", "Montant total"])
S.row_dimensions[PA_H + 1].height = 32
PA0, NPA = PA_H + 2, 30
PA1 = PA0 + NPA - 1
ex_perd = [
    ("Forfait dîner (quartier libre)", "Forfait dîners quartier libre – Equipe de coordination", 17, 6, 1, None),
    ("Forfait dîner (quartier libre)", "Forfait dîners quartier libre – Participants chargés du suivi et Directeurs centraux", 72, 2, 1, None),
    ("Forfait dîner (quartier libre)", "Forfait dîners quartier libre – Participants chargés de la mise en œuvre", 165, 4, 1, None),
    ("Forfait facilitation / personne-ressource", "Forfaits de facilitation (personnes-ressources)", 8, 1, 1, None),
]
dv_pt = DataValidation(type="list", formula1=f"={PERD_TYPES}", allow_blank=True)
S.add_data_validation(dv_pt)
for i in range(NPA):
    r = PA0 + i
    style(S.cell(r, 2, i + 1), align=CENTER)
    for c in range(3, 9):
        style(S.cell(r, c), font=F_IN, fill=FILL_IN, align=LEFT if c < 5 else RIGHT, fmt=None if c < 5 else NUM)
    if i < len(ex_perd):
        t, l, n, j, f, mu = ex_perd[i]
        S.cell(r, 3, t); S.cell(r, 4, l); S.cell(r, 5, n); S.cell(r, 6, j); S.cell(r, 7, f); S.cell(r, 8, mu)
    dv_pt.add(f"C{r}")
    S.cell(r, 9, f'=IF(AND(C{r}="",D{r}=""),"",IF(H{r}<>"",H{r},IFERROR(INDEX({PERD_MU},MATCH(C{r},{PERD_TYPES},0)),0)))')
    S.cell(r, 10, f'=IF(I{r}="","",N(E{r})*IF(F{r}="",1,F{r})*IF(G{r}="",1,G{r})*I{r})')
    style(S.cell(r, 9), fill=FILL_CALC, align=RIGHT, fmt=NUM)
    style(S.cell(r, 10), fill=FILL_CALC, align=RIGHT, fmt=NUM)
note(S[f"G{PA0}"], "Fréquence : nombre de fois où le forfait est servi par jour / session (1 par défaut si vide).")
note(S[f"H{PA0}"], "Laisser vide pour appliquer le montant du barème (feuille Parametres). Renseigner pour imposer un autre montant.")
PT = PA1 + 1
S.merge_cells(f"B{PT}:D{PT}"); S[f"B{PT}"] = "TOTAL PERDIEMS"
box(S, f"B{PT}:J{PT}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)
S[f"E{PT}"] = f"=SUM(E{PA0}:E{PA1})"
S[f"J{PT}"] = f"=SUM(J{PA0}:J{PA1})"
TOT_PERD = f"Saisie_TDR!$J${PT}"

# ---- B. Transport
TB_H = PT + 2
section(S, f"B{TB_H}:J{TB_H}", "III. TRANSPORT DES PARTICIPANTS (une ligne par localité de provenance)")
header(S, TB_H + 1, 2, ["N°", "Localité de provenance", "Type de transport (barème art. 17 b – liste)",
                        "Distance ALLER (km)", "Nombre de participants", "MU spécifique (optionnel)",
                        "Tranche / règle appliquée", "Montant unitaire A/R retenu", "Montant total"])
S.row_dimensions[TB_H + 1].height = 32
TB0, NTB = TB_H + 2, 25
TB1 = TB0 + NTB - 1
D = "Selon distance – sans véhicule administratif"
ex_tr = [("AGBOVILLE", D, 230, 17), ("TIASSALE", D, 140, 12), ("ODIENNE", D, 620, 22), ("MINIGNAN", D, 650, 13),
         ("TOUBA", D, 610, 22), ("MAN", D, 470, 27), ("DANANE", D, 420, 17), ("DUEKOUE", D, 260, 30),
         ("GUIGLO", D, 290, 20), ("DALOA", D, 145, 25), ("ISSIA", D, 170, 11), ("FERKESSEDOGOU", D, 400, 19),
         ("ABIDJAN (Comité d'organisation)", D, 240, 17)]
dv_tt = DataValidation(type="list", formula1=f"={TR_TYPES}", allow_blank=True)
S.add_data_validation(dv_tt)
for i in range(NTB):
    r = TB0 + i
    style(S.cell(r, 2, i + 1), align=CENTER)
    for c in range(3, 8):
        style(S.cell(r, c), font=F_IN, fill=FILL_IN, align=LEFT if c < 5 else RIGHT, fmt=None if c < 5 else NUM)
    if i < len(ex_tr):
        loc, t, km, n = ex_tr[i]
        S.cell(r, 3, loc); S.cell(r, 4, t); S.cell(r, 5, km); S.cell(r, 6, n)
    dv_tt.add(f"D{r}")
    S.cell(r, 8, (f'=IF(D{r}="","",IF(G{r}<>"","Montant spécifique saisi",IF(D{r}={TR_DIST},'
                  f'"Distance "&FIXED(N(E{r}),0)&" km",IF(D{r}={TR_CARB},'
                  f'"Carburant : "&FIXED(N(E{r}),0)&" km x "&{COEF_AR}&" x "&{CONSO}&" L/100 x "&{PRIX_SUPER}&" (min. "&FIXED({PLANCHER},0)&")",'
                  f'"Forfait barème"))))'))
    S.cell(r, 9, (f'=IF(D{r}="","",IF(G{r}<>"",G{r},IF(D{r}={TR_DIST},VLOOKUP(N(E{r}),{GRID},2,TRUE),'
                  f'IF(D{r}={TR_CARB},MAX({PLANCHER},ROUND(N(E{r})*{COEF_AR}*{CONSO}/100*{PRIX_SUPER},0)),'
                  f'IFERROR(N(INDEX({TR_MU},MATCH(D{r},{TR_TYPES},0))),0)))))'))
    S.cell(r, 10, f'=IF(I{r}="","",N(F{r})*I{r})')
    style(S.cell(r, 8), font=F_SMALL, fill=FILL_CALC)
    style(S.cell(r, 9), fill=FILL_CALC, align=RIGHT, fmt=NUM)
    style(S.cell(r, 10), fill=FILL_CALC, align=RIGHT, fmt=NUM)
note(S[f"E{TB0}"], "Distance ALLER entre la localité de résidence et le lieu de l'atelier. Obligatoire pour les types « Selon distance » et « Véhicule administratif ». "
                   "Les distances de l'exemple sont indicatives (choisies pour retrouver les coûts unitaires du TDR) : à confirmer.")
TT = TB1 + 1
S.merge_cells(f"B{TT}:E{TT}"); S[f"B{TT}"] = "TOTAL TRANSPORT"
box(S, f"B{TT}:J{TT}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)
S[f"F{TT}"] = f"=SUM(F{TB0}:F{TB1})"
S[f"J{TT}"] = f"=SUM(J{TB0}:J{TB1})"
TOT_TR = f"Saisie_TDR!$J${TT}"

# ---- C. Récap
RC = TT + 2
section(S, f"B{RC}:J{RC}", "IV. RÉCAPITULATIF ET CONTRÔLE BUDGÉTAIRE")
rec = [
    ("Total perdiems", f"={TOT_PERD}"),
    ("Total transport", f"={TOT_TR}"),
    ("Frais Trésor Pay (taux x base définie dans Parametres)", f'=ROUND({TAUX_TP}*(J{RC+1}+IF({BASE_TP}="Perdiems + transport",J{RC+2},0)),0)'),
    ("TOTAL GÉNÉRAL À PAYER", f"=J{RC+1}+J{RC+2}+J{RC+3}"),
    ("Budget « perdiems participants » prévu au TDR", f"=N({INFO['Budget « perdiems participants » prévu au TDR (contrôle)']})"),
    ("Écart (Budget TDR – Total général)", f"=J{RC+5}-J{RC+4}"),
]
for i, (lab, f) in enumerate(rec):
    r = RC + 1 + i
    S.merge_cells(f"B{r}:I{r}"); S[f"B{r}"] = lab
    bold = lab.startswith("TOTAL") or lab.startswith("Écart")
    box(S, f"B{r}:I{r}", font=F_B if bold else F_N, fill=FILL_TOT if bold else None, align=RIGHT)
    S[f"J{r}"] = f
    style(S[f"J{r}"], font=F_B if bold else F_N, fill=FILL_TOT if bold else FILL_CALC, align=RIGHT, fmt=NUM)
TOT_TP = f"Saisie_TDR!$J${RC+3}"
TOT_GEN = f"Saisie_TDR!$J${RC+4}"
r = RC + 7
S.merge_cells(f"B{r}:J{r}")
S[f"B{r}"] = f'=IF(J{RC+6}<0,"⚠ ALERTE : le total dépasse le budget prévu au TDR de "&FIXED(-J{RC+6},0)&" FCFA",IF(J{RC+5}=0,"Budget TDR non renseigné","✔ Total conforme au budget du TDR"))'
style(S[f"B{r}"], font=Font(name=FONT, size=10, bold=True, color="C00000"), border=False)
S.freeze_panes = "B5"

# =====================================================================
# ETAT DES PERDIEMS (automatique)
# =====================================================================
E = wb.create_sheet("Etat_Perdiems", 1)
E.sheet_properties.tabColor = "00B050"
for k, v in {"A": 2, "B": 40, "C": 48, "D": 14, "E": 14, "F": 16, "G": 18}.items():
    E.column_dimensions[k].width = v
title(E, "B1:G1", "ETAT DES PERDIEMS")
hdr = [("Structure :", f"={INFO['Structure initiatrice']}"),
       ("Projet / Programme :", f"={INFO['Projet / Programme']}"),
       ("Atelier :", f"={INFO['Thème / intitulé de l\'atelier']}"),
       ("Activité :", f"={INFO['Référence activité (PTBA)']}"),
       ("Lieu et période :", f'={INFO["Lieu de l\'atelier"]}&" – du "&{dfmt(INFO["Date de début"])}&" au "&{dfmt(INFO["Date de fin"])}'),
       ("Source de financement :", f"={INFO['Source de financement']}")]
for i, (lab, f) in enumerate(hdr):
    r = 2 + i
    E[f"B{r}"] = lab; style(E[f"B{r}"], font=F_B, border=False)
    E.merge_cells(f"C{r}:G{r}"); E[f"C{r}"] = f; style(E[f"C{r}"], border=False)
E.row_dimensions[4].height = 40

# Recap
r = 9
section(E, f"B{r}:G{r}", "Etat récapitulatif des perdiems")
E.merge_cells(f"B{r+1}:B{r+2}"); E.merge_cells(f"C{r+1}:E{r+2}"); E.merge_cells(f"F{r+1}:G{r+1}")
E[f"B{r+1}"] = "Bénéficiaire"; E[f"C{r+1}"] = "Objet de la dépense"; E[f"F{r+1}"] = "Montant"
E[f"F{r+2}"] = "Bailleur"; E[f"G{r+2}"] = "Trésor"
box(E, f"B{r+1}:G{r+2}", font=F_H, fill=FILL_H, align=CENTER)
rr = r + 3
E[f"B{rr}"] = f"={INFO['Bénéficiaire du paiement (régisseur / payeur)']}"
E.merge_cells(f"C{rr}:E{rr}")
E[f"C{rr}"] = f'="Règlement des perdiems relatifs à l\'atelier « "&{INFO["Thème / intitulé de l\'atelier"]}&" »"'
E[f"F{rr}"] = f'=IF(LEFT({INFO["Source de financement"]},8)="Bailleur",{TOT_PERD},0)'
E[f"G{rr}"] = f'=IF(LEFT({INFO["Source de financement"]},6)="Trésor",{TOT_PERD},0)'
box(E, f"B{rr}:G{rr}")
for c in "FG":
    E[f"{c}{rr}"].number_format = NUM; E[f"{c}{rr}"].alignment = RIGHT
E.row_dimensions[rr].height = 58
rt = rr + 1
E.merge_cells(f"B{rt}:E{rt}"); E[f"B{rt}"] = "TOTAL"
E[f"F{rt}"] = f"=F{rr}"; E[f"G{rt}"] = f"=G{rr}"
box(E, f"B{rt}:G{rt}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)

# Transport
r = rt + 2
section(E, f"B{r}:G{r}", "Transport :")
E[f"B{r+1}"] = "Bénéficiaire (localité de provenance)"; E[f"C{r+1}"] = "Montant unitaire"
E[f"E{r+1}"] = "Fréquence (nb participants)"; E[f"F{r+1}"] = "Total"
E.merge_cells(f"C{r+1}:D{r+1}"); E.merge_cells(f"F{r+1}:G{r+1}")
box(E, f"B{r+1}:G{r+1}", font=F_H, fill=FILL_H, align=CENTER)
E1 = r + 2
for i in range(NTB):
    rr = E1 + i; s = TB0 + i
    E.merge_cells(f"C{rr}:D{rr}"); E.merge_cells(f"F{rr}:G{rr}")
    E[f"B{rr}"] = f'=IF(Saisie_TDR!$J${s}="","",Saisie_TDR!$C${s})'
    E[f"C{rr}"] = f'=IF(Saisie_TDR!$J${s}="","",Saisie_TDR!$I${s})'
    E[f"E{rr}"] = f'=IF(Saisie_TDR!$J${s}="","",Saisie_TDR!$F${s})'
    E[f"F{rr}"] = f'=IF(Saisie_TDR!$J${s}="","",Saisie_TDR!$J${s})'
    box(E, f"B{rr}:G{rr}", fmt=NUM)
    for c in "CEF":
        E[f"{c}{rr}"].alignment = RIGHT
E2 = E1 + NTB - 1
rt = E2 + 1
E.merge_cells(f"C{rt}:D{rt}"); E.merge_cells(f"F{rt}:G{rt}")
E[f"B{rt}"] = "TOTAL"; E[f"C{rt}"] = "TOTAL"
E[f"E{rt}"] = f"=SUM(E{E1}:E{E2})"; E[f"F{rt}"] = f"=SUM(F{E1}:F{E2})"
box(E, f"B{rt}:G{rt}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)

# Trésor pay
r = rt + 2
E.merge_cells(f"B{r}:E{r}")
E[f"B{r}"] = (f'=IF({BASE_TP}="Perdiems + transport","Frais TRESOR PAY : "&ROUND({TAUX_TP}*100,2)&" % x (Montant total perdiem + total transport) = "&ROUND({TAUX_TP}*100,2)&" % x "&FIXED({TOT_PERD}+{TOT_TR},0),'
               f'"Frais TRESOR PAY : "&ROUND({TAUX_TP}*100,2)&" % x Montant total perdiem = "&ROUND({TAUX_TP}*100,2)&" % x "&FIXED({TOT_PERD},0))')
box(E, f"B{r}:E{r}", font=F_B)
E.merge_cells(f"F{r}:G{r}"); E[f"F{r}"] = f"={TOT_TP}"
box(E, f"F{r}:G{r}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)

# Détail perdiems
r = r + 2
section(E, f"B{r}:G{r}", "Détail des perdiems")
header(E, r + 1, 2, ["Libellé ou catégorie", "Nombre de personnes", "Nombre de jours", "Fréquence", "Montant unitaire", "Montant total"])
# columns: B lib, C nb pers, D jours, E freq, F MU, G total
D1 = r + 2
for i in range(NPA):
    rr = D1 + i; s = PA0 + i
    cond = f'Saisie_TDR!$J${s}=""'
    E[f"B{rr}"] = f'=IF({cond},"",IF(Saisie_TDR!$D${s}<>"",Saisie_TDR!$D${s},Saisie_TDR!$C${s}))'
    E[f"C{rr}"] = f'=IF({cond},"",Saisie_TDR!$E${s})'
    E[f"D{rr}"] = f'=IF({cond},"",IF(Saisie_TDR!$F${s}="",1,Saisie_TDR!$F${s}))'
    E[f"E{rr}"] = f'=IF({cond},"",IF(Saisie_TDR!$G${s}="",1,Saisie_TDR!$G${s}))'
    E[f"F{rr}"] = f'=IF({cond},"",Saisie_TDR!$I${s})'
    E[f"G{rr}"] = f'=IF({cond},"",Saisie_TDR!$J${s})'
    box(E, f"B{rr}:G{rr}", fmt=NUM)
    for c in "CDEFG":
        E[f"{c}{rr}"].alignment = RIGHT
D2 = D1 + NPA - 1
rt = D2 + 1
E.merge_cells(f"B{rt}:F{rt}"); E[f"B{rt}"] = "TOTAL"
E[f"G{rt}"] = f"=SUM(G{D1}:G{D2})"
box(E, f"B{rt}:G{rt}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)

# Arrêté
r = rt + 2
E[f"B{r}"] = "TOTAL GÉNÉRAL (perdiems + transport + Trésor Pay)"
E.merge_cells(f"B{r}:F{r}"); box(E, f"B{r}:F{r}", font=F_B, fill=FILL_TOT, align=RIGHT)
E[f"G{r}"] = f"={TOT_GEN}"; style(E[f"G{r}"], font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)
r += 2
E[f"B{r}"] = "Arrêté le présent état à la somme de :"; style(E[f"B{r}"], font=F_B, border=False)
E.merge_cells(f"C{r}:G{r+1}")
E[f"C{r}"] = lettres_formula(TOT_GEN)
style(E[f"C{r}"], font=Font(name=FONT, size=10, bold=True, italic=True), border=False)
r += 3
E[f"B{r}"] = "Signature"; E[f"F{r}"] = "Date"
style(E[f"B{r}"], font=F_B, border=False); style(E[f"F{r}"], font=F_B, border=False)
E.print_area = f"B1:G{r+4}"
E.page_setup.orientation = "portrait"; E.page_setup.fitToWidth = 1; E.page_setup.fitToHeight = 0
E.sheet_properties.pageSetUpPr.fitToPage = True

# =====================================================================
# GUIDE
# =====================================================================
G = wb.create_sheet("Guide", 0)
G.sheet_properties.tabColor = NAVY
G.column_dimensions["A"].width = 2; G.column_dimensions["B"].width = 26; G.column_dimensions["C"].width = 100
title(G, "B1:C1", "AUTOMATISATION DU TRAITEMENT DES TDR – ATELIERS")
rows = [
    ("Objet", "Générer automatiquement l'ETAT DES PERDIEMS d'un atelier à partir des informations du TDR saisies par le service initiateur."),
    ("Référentiel", "Arrêté n°020/MEFB/CAB du 20/02/2026 (art. 11, 12, 17) et Note n°401/MEFB/CAB/CCSPP-BM du 22/05/2026."),
    ("Étape 1 – Service initiateur", "Feuille « Saisie_TDR » : renseigner les cellules JAUNES (texte bleu) : informations générales, détail des perdiems, transport par localité de provenance."),
    ("Étape 2 – Contrôle", "Vérifier le bloc IV « Récapitulatif et contrôle budgétaire » (alerte si le total dépasse le budget prévu au TDR)."),
    ("Étape 3 – RAF / Comptable", "Feuille « Etat_Perdiems » : état prêt à imprimer (récapitulatif Bailleur/Trésor, transport, frais Trésor Pay, détail des perdiems, montant en lettres)."),
    ("Paramètres", "Feuille « Parametres » : barèmes de l'arrêté, montants unitaires par défaut, taux Trésor Pay, prix du super. Mettre à jour le prix du super avant chaque traitement."),
    ("Code couleur", "Jaune / texte bleu = saisie ; Vert = calcul automatique (ne pas modifier) ; Bleu clair = totaux."),
    ("Transport (art. 17 b)", "Commune d'Abidjan 10 000 ; intra-ville 5 000 ; périphérie Abidjan 15 000 ; selon distance : 0-150 km 20 000, 151-300 km 30 000, 301-450 km 40 000, 451-600 km 45 000, > 600 km 50 000 ; "
                              "véhicules administratifs / autorités : km x 15 L/100 km x prix du super (minimum 25 000) ; autorités membres de comités locaux 100 000."),
    ("MU spécifique", "Laisser vide pour appliquer automatiquement le barème. Renseigner uniquement pour imposer un autre montant (à justifier)."),
    ("Exemple pré-rempli", "Le fichier est pré-rempli avec le TDR « Activité 2.1.1 – PRSEB / DMOSS » (Yamoussoukro, 18-24/10/2026). "
                           "Effacer les cellules jaunes pour un nouvel atelier. Les distances kilométriques de l'exemple sont indicatives."),
    ("Hypothèses", "Frais Trésor Pay = 1 % du montant total des perdiems, arrondi à l'unité (base modifiable dans Parametres!C10 : « Perdiems + transport »). Pour le calcul carburant, la distance saisie est la distance ALLER multipliée par 2 (aller-retour) – modifiable dans Parametres."),
]
for i, (a, b) in enumerate(rows):
    r = 3 + i
    G[f"B{r}"] = a; G[f"C{r}"] = b
    style(G[f"B{r}"], font=F_B, fill=FILL_TOT); style(G[f"C{r}"])
    G.row_dimensions[r].height = 44
r = 3 + len(rows) + 1
for lab, fill in [("Cellule à renseigner", FILL_IN), ("Calcul automatique", FILL_CALC), ("Total", FILL_TOT)]:
    G[f"B{r}"] = lab; style(G[f"B{r}"], fill=fill, font=F_IN if fill is FILL_IN else F_N); r += 1

build_lettres(wb)
wb.active = 1
wb.save(OUT)
print("ok", OUT)
