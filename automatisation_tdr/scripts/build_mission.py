import sys
from datetime import date
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation
from common import *

OUT = sys.argv[1]
wb = Workbook()

# =====================================================================
# BAREME (Note n°401 du 22/05/2026 – art. 17 Arrêté 020)
# =====================================================================
B = wb.active
B.title = "Bareme"
B.sheet_properties.tabColor = "7F7F7F"
for k, v in {"A": 2, "B": 16, "C": 24, "D": 24, "E": 24, "F": 24, "G": 4}.items():
    B.column_dimensions[k].width = v
title(B, "B1:F1", "BARÈME DES FRAIS DE MISSION (FCFA / jour)", 12)
B.merge_cells("B2:F2")
B["B2"] = "Source : Note n°401/MEFB/CAB/CCSPP-BM du 22/05/2026 portant modalités d'application de l'Arrêté n°020/MEFB/CAB du 20/02/2026 (art. 17)."
style(B["B2"], font=F_SMALL, border=False)

ZONES = ["CI – Toutes villes sauf Abidjan, Yamoussoukro, San Pedro, Assinie",
         "CI – Abidjan, Yamoussoukro, San Pedro, Assinie",
         "Afrique (hors Afrique du Nord et Afrique du Sud)",
         "Afrique du Nord, Afrique du Sud, Autre monde"]
header(B, 4, 2, ["Catégorie"] + ZONES)
B.row_dimensions[4].height = 45
bar = [("Catégorie 1", 60000, 60000, 170000, 200000),
       ("Catégorie 2", 49000, 55000, 150000, 175000),
       ("Catégorie 3", 43000, 45000, 130000, 150000)]
for i, row in enumerate(bar):
    r = 5 + i
    style(B.cell(r, 2, row[0]), font=F_B, align=CENTER)
    for j, v in enumerate(row[1:]):
        style(B.cell(r, 3 + j, v), font=F_IN, fill=FILL_IN, align=RIGHT, fmt=NUM)
BAR = "Bareme!$C$5:$F$7"; CATS = "Bareme!$B$5:$B$7"; ZHDR = "Bareme!$C$4:$F$4"

section(B, "B9:F9", "Définition des catégories de personnel (Note n°401, § 4)")
cats_def = [("Catégorie 1", "Coordonnateurs, Responsables d'administrations centrales"),
            ("Catégorie 2", "Personnel clé (hors coordonnateurs), services du Contrôle Financier, Agence Comptable, Responsables d'administrations régionales et départementales et assimilés"),
            ("Catégorie 3", "Comptables, Assistants projets, Assistants passation, Assistants Sauvegardes Sociales, Secrétaires, chauffeurs, autres agents et assimilés")]
for i, (c, d) in enumerate(cats_def):
    r = 10 + i
    style(B.cell(r, 2, c), font=F_B, align=CENTER)
    B.merge_cells(f"C{r}:F{r}"); B[f"C{r}"] = d; box(B, f"C{r}:F{r}")
    B.row_dimensions[r].height = 30

section(B, "B14:F14", "Zones géographiques (liste de saisie)")
header(B, 15, 2, ["Code", "Zone", "", "", ""])
B.merge_cells("C15:F15")
GZ = ["Côte d'Ivoire", "Afrique (hors Afrique du Nord et Afrique du Sud)", "Afrique du Nord, Afrique du Sud, Autre monde"]
for i, z in enumerate(GZ):
    r = 16 + i
    style(B.cell(r, 2, i + 1), align=CENTER); B.merge_cells(f"C{r}:F{r}"); B[f"C{r}"] = z; box(B, f"C{r}:F{r}")
GZL = "Bareme!$C$16:$C$18"

section(B, "B20:F20", "Villes de Côte d'Ivoire au taux majoré")
for i, v in enumerate(["Abidjan", "Yamoussoukro", "San Pedro", "San-Pédro", "San-Pedro", "Assinie"]):
    style(B.cell(21 + i, 2, v), font=F_IN, fill=FILL_IN)
VILLES = "Bareme!$B$21:$B$26"

section(B, "B28:F28", "Paramètres de ventilation (hébergement / restauration)")
params = [("Part du forfait affectée à l'hébergement", 0.6, "0%",
           "HYPOTHÈSE À VALIDER : l'arrêté fixe un forfait journalier global ; la clé de ventilation hébergement (justifiable) / restauration (non justifiable) est un choix interne."),
          ("Base de calcul de l'hébergement", "Jours", None,
           "« Jours » : forfait x nombre de jours (total = barème x jours). « Nuitées » : part hébergement x nombre de nuitées."),
          ("Sources de financement", "Bailleur (IDA / Banque mondiale)", None, "Liste de saisie"),
          ("", "Trésor (Part Etat)", None, "")]
for i, (lab, v, fmt, obs) in enumerate(params):
    r = 29 + i
    style(B.cell(r, 2, lab), font=F_B); style(B.cell(r, 3, v), font=F_IN, fill=FILL_IN, fmt=fmt, align=RIGHT if fmt else LEFT)
    B.merge_cells(f"D{r}:F{r}"); B[f"D{r}"] = obs; box(B, f"D{r}:F{r}", font=F_SMALL)
    B.row_dimensions[r].height = 40
PCT_HEB, BASE_HEB, SRC_LIST = "Bareme!$C$29", "Bareme!$C$30", "Bareme!$C$31:$C$32"
B.column_dimensions["B"].width = 22
dv_base = DataValidation(type="list", formula1='"Jours,Nuitées"'); B.add_data_validation(dv_base); dv_base.add("C30")

# =====================================================================
# SAISIE MISSION
# =====================================================================
S = wb.create_sheet("Saisie_Mission", 0)
S.sheet_properties.tabColor = "FFC000"
for k, v in {"A": 2, "B": 5, "C": 30, "D": 30, "E": 14, "F": 11, "G": 11, "H": 13, "I": 11, "J": 11, "K": 14, "L": 14, "M": 15}.items():
    S.column_dimensions[k].width = v
title(S, "B1:M1", "FICHE DE SAISIE – ORDRE DE MISSION (à renseigner par le service initiateur)")
S.merge_cells("B2:M2")
S["B2"] = ("Renseigner UNIQUEMENT les cellules jaunes (texte bleu). Le barème (Note n°401) est appliqué automatiquement selon la catégorie "
           "du missionnaire et la zone de destination. La note de frais est générée dans la feuille Note_Frais.")
style(S["B2"], font=F_SMALL, border=False); S.row_dimensions[2].height = 28

section(S, "B4:M4", "I. INFORMATIONS GÉNÉRALES DE LA MISSION")
info = [("Structure initiatrice", "DMOSS – Direction de la Mutualité et des Œuvres Sociales en milieu Scolaire"),
        ("Projet / Programme", "PRSEB – Programme de Renforcement du Système Éducatif de Base"),
        ("Objet / thème de la mission", "Supervision de la visite médicale des apprenants du préscolaire et du CP1 dans la DRENA de Man"),
        ("N° de l'ordre de mission", "OM n°___/DMOSS/2026"),
        ("Ville de destination", "Man"),
        ("Zone géographique", "Côte d'Ivoire"),
        ("Date de départ", date(2026, 11, 16)),
        ("Date de retour", date(2026, 11, 20)),
        ("Source de financement", "Bailleur (IDA / Banque mondiale)")]
INFO = {}
for i, (lab, v) in enumerate(info):
    r = 5 + i
    S.merge_cells(f"B{r}:C{r}"); S[f"B{r}"] = lab; box(S, f"B{r}:C{r}", font=F_B)
    S.merge_cells(f"D{r}:M{r}"); S[f"D{r}"] = v
    box(S, f"D{r}:M{r}", font=F_IN, fill=FILL_IN, fmt="dd/mm/yyyy" if isinstance(v, date) else None)
    INFO[lab] = f"Saisie_Mission!$D${r}"
dv = DataValidation(type="list", formula1=f"={GZL}"); S.add_data_validation(dv); dv.add("D10")
dv2 = DataValidation(type="list", formula1=f"={SRC_LIST}"); S.add_data_validation(dv2); dv2.add("D13")
dv3 = DataValidation(type="date", operator="greaterThan", formula1="DATE(2020,1,1)"); S.add_data_validation(dv3); dv3.add("D11"); dv3.add("D12")
note(S["D9"], "Pour la Côte d'Ivoire, le taux majoré s'applique automatiquement à Abidjan, Yamoussoukro, San Pedro et Assinie (liste modifiable dans Bareme).")

section(S, "B15:M15", "II. PARAMÈTRES CALCULÉS AUTOMATIQUEMENT")
calc = [("Colonne du barème appliquée",
         f'=IF(D10="","",IF(D10=Bareme!$C$16,IF(COUNTIF({VILLES},TRIM(D9))>0,Bareme!$D$4,Bareme!$C$4),IF(D10=Bareme!$C$17,Bareme!$E$4,Bareme!$F$4)))', None),
        ("Nombre de jours (retour – départ + 1)", '=IF(AND(ISNUMBER(D11),ISNUMBER(D12)),D12-D11+1,"")', "0"),
        ("Nombre de nuitées (retour – départ)", '=IF(AND(ISNUMBER(D11),ISNUMBER(D12)),D12-D11,"")', "0")]
for i, (lab, f, fmt) in enumerate(calc):
    r = 16 + i
    S.merge_cells(f"B{r}:C{r}"); S[f"B{r}"] = lab; box(S, f"B{r}:C{r}", font=F_B)
    S.merge_cells(f"D{r}:M{r}"); S[f"D{r}"] = f; box(S, f"D{r}:M{r}", fill=FILL_CALC, fmt=fmt, align=LEFT)
ZONE, NJ, NN = "Saisie_Mission!$D$16", "Saisie_Mission!$D$17", "Saisie_Mission!$D$18"
note(S["D17"], "Peut être ajusté individuellement dans le tableau des missionnaires (colonnes « jours spécifiques » / « nuitées spécifiques »).")

H = 20
section(S, f"B{H}:M{H}", "III. LISTE DES MISSIONNAIRES")
header(S, H + 1, 2, ["N°", "Nom et prénoms", "Fonction", "Catégorie (liste)", "Jours spécifiques (opt.)",
                     "Nuitées spécifiques (opt.)", "Taux journalier barème", "Jours retenus", "Nuitées retenues",
                     "Hébergement (justifiable)", "Restauration (non justifiable)", "TOTAL"])
S.row_dimensions[H + 1].height = 40
M0, NM = H + 2, 20
M1 = M0 + NM - 1
ex = [("KOUASSI Yao Jean", "Coordonnateur", "Catégorie 1"),
      ("TRAORE Aminata", "Spécialiste suivi-évaluation", "Catégorie 2"),
      ("BAMBA Moussa", "Chauffeur", "Catégorie 3")]
dvc = DataValidation(type="list", formula1=f"={CATS}"); S.add_data_validation(dvc)
for i in range(NM):
    r = M0 + i
    style(S.cell(r, 2, i + 1), align=CENTER)
    for c in range(3, 8):
        style(S.cell(r, c), font=F_IN, fill=FILL_IN, align=LEFT if c < 6 else RIGHT, fmt="0" if c >= 6 else None)
    if i < len(ex):
        S.cell(r, 3, ex[i][0]); S.cell(r, 4, ex[i][1]); S.cell(r, 5, ex[i][2])
    dvc.add(f"E{r}")
    ok = f'OR(C{r}="",E{r}="")'
    S.cell(r, 8, f'=IF({ok},"",IFERROR(INDEX({BAR},MATCH(E{r},{CATS},0),MATCH({ZONE},{ZHDR},0)),0))')
    S.cell(r, 9, f'=IF({ok},"",IF(F{r}<>"",F{r},N({NJ})))')
    S.cell(r, 10, f'=IF({ok},"",IF(G{r}<>"",G{r},N({NN})))')
    S.cell(r, 11, f'=IF({ok},"",ROUND(H{r}*{PCT_HEB},0)*IF({BASE_HEB}="Nuitées",J{r},I{r}))')
    S.cell(r, 12, f'=IF({ok},"",(H{r}-ROUND(H{r}*{PCT_HEB},0))*I{r})')
    S.cell(r, 13, f'=IF({ok},"",K{r}+L{r})')
    for c in range(8, 14):
        style(S.cell(r, c), fill=FILL_CALC, align=RIGHT, fmt=NUM)
T = M1 + 1
S.merge_cells(f"B{T}:J{T}"); S[f"B{T}"] = "TOTAL MISSION"
box(S, f"B{T}:M{T}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)
for c in "KLM":
    S[f"{c}{T}"] = f"=SUM({c}{M0}:{c}{M1})"
S.freeze_panes = "B5"

# =====================================================================
# NOTE DE FRAIS (une note par missionnaire, sélection par N°)
# =====================================================================
N = wb.create_sheet("Note_Frais", 1)
N.sheet_properties.tabColor = "00B050"
for k, v in {"A": 2, "B": 52, "C": 16, "D": 18, "E": 20}.items():
    N.column_dimensions[k].width = v
title(N, "B1:E1", "NOTE DE FRAIS DE MISSION")
N["B3"] = "N° du missionnaire à éditer (1 à 20) :"; style(N["B3"], font=F_B, border=False, align=RIGHT)
N["C3"] = 1; style(N["C3"], font=Font(name=FONT, size=12, bold=True, color="0000FF"), fill=FILL_IN, align=CENTER)
dvn = DataValidation(type="whole", operator="between", formula1="1", formula2=str(NM)); N.add_data_validation(dvn); dvn.add("C3")
note(N["C3"], "Changer ce numéro pour éditer la note de frais de chaque missionnaire de la feuille Saisie_Mission.")
SEL = "$C$3"


def pick(col):
    return f"INDEX(Saisie_Mission!${col}${M0}:${col}${M1},{SEL})"


hdr = [("Structure :", f"={INFO['Structure initiatrice']}"),
       ("Projet / Programme :", f"={INFO['Projet / Programme']}"),
       ("Ordre de mission :", f"={INFO['N° de l\'ordre de mission']}"),
       ("Destination :", f'={INFO["Ville de destination"]}&" – "&{ZONE}'),
       ("Période :", f'="Du "&{dfmt(INFO["Date de départ"])}&" au "&{dfmt(INFO["Date de retour"])}'),
       ("Source de financement :", f"={INFO['Source de financement']}")]
for i, (lab, f) in enumerate(hdr):
    r = 5 + i
    N[f"B{r}"] = lab; style(N[f"B{r}"], font=F_B, border=False, align=RIGHT)
    N.merge_cells(f"C{r}:E{r}"); N[f"C{r}"] = f; style(N[f"C{r}"], border=False)

r = 12
header(N, r, 2, ["Désignation", "Nombre de jours", "Prix unitaire", "Montant"])
lines = []
r += 1
N.merge_cells(f"B{r}:E{r}")
N[f"B{r}"] = f'="Règlement relatif à : "&{INFO["Objet / thème de la mission"]}'
box(N, f"B{r}:E{r}", font=F_B); N.row_dimensions[r].height = 32
r += 1
N.merge_cells(f"B{r}:E{r}")
N[f"B{r}"] = f'=IF({pick("C")}="","⚠ Aucun missionnaire à ce numéro","Bénéficiaire : "&{pick("C")}&" – "&{pick("D")}&" ("&{pick("E")}&")")'
box(N, f"B{r}:E{r}", font=F_B)
r += 1
RH = r
N[f"B{r}"] = "Perdiem hébergement (montant justifiable)"
N[f"C{r}"] = f'=IF({pick("C")}="","",IF({BASE_HEB}="Nuitées",{pick("J")},{pick("I")}))'
N[f"D{r}"] = f'=IF({pick("C")}="","",ROUND({pick("H")}*{PCT_HEB},0))'
N[f"E{r}"] = f'=IF({pick("C")}="","",{pick("K")})'
box(N, f"B{r}:E{r}", fmt=NUM); [setattr(N[f"{c}{r}"], "alignment", RIGHT) for c in "CDE"]
r += 1
N.merge_cells(f"B{r}:E{r}")
N[f"B{r}"] = (f'=IF({pick("C")}="","","Détail du calcul : barème "&{pick("E")}&" – "&{ZONE}&" = "&FIXED({pick("H")},0)'
              f'&" FCFA/jour x "&ROUND({PCT_HEB}*100,0)&" % = "&FIXED(D{RH},0)&" FCFA x "&C{RH}&IF({BASE_HEB}="Nuitées"," nuitée(s)"," jour(s)")&" = "&FIXED(E{RH},0)&" FCFA")')
box(N, f"B{r}:E{r}", font=F_SMALL); N.row_dimensions[r].height = 30
r += 1
RR = r
N[f"B{r}"] = "Frais de restauration (montant non justifiable)"
N[f"C{r}"] = f'=IF({pick("C")}="","",{pick("I")})'
N[f"D{r}"] = f'=IF({pick("C")}="","",{pick("H")}-D{RH})'
N[f"E{r}"] = f'=IF({pick("C")}="","",{pick("L")})'
box(N, f"B{r}:E{r}", fmt=NUM); [setattr(N[f"{c}{r}"], "alignment", RIGHT) for c in "CDE"]
r += 1
N.merge_cells(f"B{r}:E{r}")
N[f"B{r}"] = (f'=IF({pick("C")}="","","Détail du calcul : "&FIXED({pick("H")},0)&" FCFA/jour x "&(100-ROUND({PCT_HEB}*100,0))'
              f'&" % = "&FIXED(D{RR},0)&" FCFA x "&C{RR}&" jour(s) = "&FIXED(E{RR},0)&" FCFA")')
box(N, f"B{r}:E{r}", font=F_SMALL); N.row_dimensions[r].height = 30
r += 1
RT = r
N.merge_cells(f"B{r}:D{r}"); N[f"B{r}"] = "TOTAL"
N[f"E{r}"] = f"=N(E{RH})+N(E{RR})"
box(N, f"B{r}:E{r}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)
r += 2
N[f"B{r}"] = "Arrêter la présente note à la somme de :"; style(N[f"B{r}"], font=F_B, border=False)
r += 1
N.merge_cells(f"B{r}:E{r+1}")
N[f"B{r}"] = lettres_formula(f"E{RT}")
style(N[f"B{r}"], font=Font(name=FONT, size=10, bold=True, italic=True), border=False)
r += 3
N[f"E{r}"] = "Signature"; style(N[f"E{r}"], font=F_B, border=False, align=CENTER)
N.print_area = f"B1:E{r+4}"
N.page_setup.fitToWidth = 1; N.page_setup.fitToHeight = 0; N.sheet_properties.pageSetUpPr.fitToPage = True

# =====================================================================
# RECAP (état collectif de la mission)
# =====================================================================
R = wb.create_sheet("Recap_Mission", 2)
R.sheet_properties.tabColor = "00B050"
for k, v in {"A": 2, "B": 5, "C": 30, "D": 26, "E": 13, "F": 12, "G": 9, "H": 15, "I": 15, "J": 15, "K": 15, "L": 15}.items():
    R.column_dimensions[k].width = v
title(R, "B1:L1", "ÉTAT RÉCAPITULATIF DES FRAIS DE MISSION")
R.merge_cells("B2:L2"); R["B2"] = f'="Objet : "&{INFO["Objet / thème de la mission"]}&" – "&{INFO["Ville de destination"]}&" – Du "&{dfmt(INFO["Date de départ"])}&" au "&{dfmt(INFO["Date de retour"])}'
style(R["B2"], font=F_B, border=False)
header(R, 4, 2, ["N°", "Nom et prénoms", "Fonction", "Catégorie", "Taux / jour", "Jours", "Hébergement", "Restauration", "TOTAL", "Bailleur", "Trésor"])
R.row_dimensions[4].height = 30
for i in range(NM):
    r = 5 + i; s = M0 + i
    c = f'Saisie_Mission!$M${s}=""'
    R[f"B{r}"] = f'=IF({c},"",Saisie_Mission!$B${s})'
    for col, src in zip("CDEFGHIJ", "CDEHIKLM"):
        R[f"{col}{r}"] = f'=IF({c},"",Saisie_Mission!${src}${s})'
    R[f"K{r}"] = f'=IF({c},"",IF(LEFT({INFO["Source de financement"]},8)="Bailleur",J{r},0))'
    R[f"L{r}"] = f'=IF({c},"",IF(LEFT({INFO["Source de financement"]},6)="Trésor",J{r},0))'
    box(R, f"B{r}:L{r}", fmt=NUM)
    for col in "FGHIJKL":
        R[f"{col}{r}"].alignment = RIGHT
rt = 5 + NM
R.merge_cells(f"B{rt}:G{rt}"); R[f"B{rt}"] = "TOTAL"
for col in "HIJKL":
    R[f"{col}{rt}"] = f"=SUM({col}5:{col}{rt-1})"
box(R, f"B{rt}:L{rt}", font=F_B, fill=FILL_TOT, align=RIGHT, fmt=NUM)
R[f"B{rt+2}"] = "Arrêté le présent état à la somme de :"; style(R[f"B{rt+2}"], font=F_B, border=False)
R.merge_cells(f"E{rt+2}:L{rt+3}"); R[f"E{rt+2}"] = lettres_formula(f"J{rt}")
style(R[f"E{rt+2}"], font=Font(name=FONT, size=10, bold=True, italic=True), border=False)
R.page_setup.orientation = "landscape"; R.page_setup.fitToWidth = 1; R.page_setup.fitToHeight = 0; R.sheet_properties.pageSetUpPr.fitToPage = True

# =====================================================================
# GUIDE
# =====================================================================
G = wb.create_sheet("Guide", 0)
G.sheet_properties.tabColor = NAVY
G.column_dimensions["A"].width = 2; G.column_dimensions["B"].width = 26; G.column_dimensions["C"].width = 100
title(G, "B1:C1", "AUTOMATISATION DU TRAITEMENT DES TDR – MISSIONS")
rows = [
    ("Objet", "Générer automatiquement la NOTE DE FRAIS DE MISSION (par missionnaire) et l'état récapitulatif à partir de l'ordre de mission saisi par le service initiateur."),
    ("Référentiel", "Arrêté n°020/MEFB/CAB du 20/02/2026 (art. 17) et Note n°401/MEFB/CAB/CCSPP-BM du 22/05/2026 (§ 4 – 3 catégories de personnel x 4 zones)."),
    ("Étape 1 – Service initiateur", "Feuille « Saisie_Mission » : objet, n° OM, ville, zone, dates, source de financement, puis la liste des missionnaires avec leur CATÉGORIE (liste déroulante)."),
    ("Étape 2 – Calcul automatique", "Le taux journalier est lu dans « Bareme » selon la catégorie et la zone (taux majoré automatique pour Abidjan, Yamoussoukro, San Pedro, Assinie). "
                                    "Il est ventilé entre hébergement (justifiable) et restauration (non justifiable)."),
    ("Étape 3 – RAF / Comptable", "Feuille « Note_Frais » : choisir le N° du missionnaire en C3 puis imprimer ; répéter pour chaque missionnaire. "
                                 "Feuille « Recap_Mission » : état collectif (colonnes Bailleur / Trésor)."),
    ("Barème (FCFA/jour)", "Cat. 1 : 60 000 / 60 000 / 170 000 / 200 000 – Cat. 2 : 49 000 / 55 000 / 150 000 / 175 000 – Cat. 3 : 43 000 / 45 000 / 130 000 / 150 000 "
                           "(CI hors grandes villes / Abidjan-Yamoussoukro-San Pedro-Assinie / Afrique / Afrique du Nord-Sud et autre monde)."),
    ("Hypothèses à valider", "1) Ventilation hébergement / restauration : 60 % / 40 % du forfait (paramètre Bareme!C29). "
                             "2) Nombre de jours = date retour – date départ + 1 ; hébergement calculé sur les jours (paramètre Bareme!C30 : « Jours » ou « Nuitées »)."),
    ("Justificatifs", "Ordre de mission dûment signé par les autorités compétentes ; rapport de mission validé par le supérieur hiérarchique (Note n°401)."),
    ("Code couleur", "Jaune / texte bleu = saisie ; Vert = calcul automatique (ne pas modifier) ; Bleu clair = totaux."),
    ("Exemple pré-rempli", "Mission fictive de supervision à Man (3 missionnaires, 1 par catégorie) : effacer les cellules jaunes pour une nouvelle mission."),
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
print("ok")
