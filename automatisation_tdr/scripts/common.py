from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment

FONT = "Arial"
NAVY = "1F3864"
F_TITLE = Font(name=FONT, size=14, bold=True, color="FFFFFF")
F_H = Font(name=FONT, size=10, bold=True, color="FFFFFF")
F_B = Font(name=FONT, size=10, bold=True)
F_N = Font(name=FONT, size=10)
F_IN = Font(name=FONT, size=10, color="0000FF")
F_SMALL = Font(name=FONT, size=9, italic=True, color="595959")
FILL_T = PatternFill("solid", fgColor=NAVY)
FILL_H = PatternFill("solid", fgColor="2F5496")
FILL_IN = PatternFill("solid", fgColor="FFF2CC")   # cellules à renseigner
FILL_CALC = PatternFill("solid", fgColor="E2EFDA")  # calculs automatiques
FILL_TOT = PatternFill("solid", fgColor="D9E1F2")
FILL_SEC = PatternFill("solid", fgColor="BDD7EE")
thin = Side(style="thin", color="808080")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
RIGHT = Alignment(horizontal="right", vertical="center")
NUM = '#,##0;(#,##0);"-"'


def style(c, font=F_N, fill=None, align=LEFT, fmt=None, border=True):
    c.font = font
    if fill:
        c.fill = fill
    c.alignment = align
    if fmt:
        c.number_format = fmt
    if border:
        c.border = BORDER


def box(ws, rng, **kw):
    for row in ws[rng]:
        for c in row:
            style(c, **kw)


def title(ws, rng, text, size=14):
    ws.merge_cells(rng)
    c = ws[rng.split(":")[0]]
    c.value = text
    box(ws, rng, font=Font(name=FONT, size=size, bold=True, color="FFFFFF"), fill=FILL_T, align=CENTER)


def section(ws, rng, text):
    ws.merge_cells(rng)
    c = ws[rng.split(":")[0]]
    c.value = text
    box(ws, rng, font=F_B, fill=FILL_SEC, align=LEFT)


def header(ws, row, col0, labels):
    for i, l in enumerate(labels):
        c = ws.cell(row=row, column=col0 + i, value=l)
        style(c, font=F_H, fill=FILL_H, align=CENTER)


def note(c, text):
    c.comment = Comment(text, "RAF")


# ---------- Montant en lettres (français) ----------
U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
     "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
T = {2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante"}


def w99(n):
    if n < 20:
        return U[n]
    d, u = divmod(n, 10)
    if d in T:
        if u == 0:
            return T[d]
        if u == 1:
            return T[d] + " et un"
        return T[d] + "-" + U[u]
    if d == 7:
        return "soixante et onze" if u == 1 else "soixante-" + U[10 + u]
    if d == 8:
        return "quatre-vingts" if u == 0 else "quatre-vingt-" + U[u]
    return "quatre-vingt-" + U[10 + u]  # 90-99


def w999(n, before_mille=False):
    c, r = divmod(n, 100)
    parts = []
    if c:
        if c == 1:
            parts.append("cent")
        else:
            parts.append(U[c] + (" cent" if (r or before_mille) else " cents"))
    if r or not c:
        s = w99(r)
        if before_mille and r == 80:
            s = "quatre-vingt"
        parts.append(s)
    return " ".join(parts)


def build_lettres(wb):
    """Feuille masquée : table 0..999 en lettres, utilisée par les formules."""
    ws = wb.create_sheet("Lettres")
    ws["A1"], ws["B1"], ws["C1"] = "Nombre", "En lettres", "Devant « mille »"
    for n in range(1000):
        ws.cell(row=n + 2, column=1, value=n)
        ws.cell(row=n + 2, column=2, value=w999(n))
        ws.cell(row=n + 2, column=3, value=w999(n, True))
    ws.sheet_state = "hidden"
    return ws


def lettres_formula(ref):
    """Formule Excel convertissant le montant entier de `ref` (< 1 milliard) en lettres."""
    n = f"ROUND({ref},0)"
    m = f"INT({n}/1000000)"
    t = f"INT(MOD({n},1000000)/1000)"
    u = f"MOD({n},1000)"
    core = (f'TRIM(IF({m}=0,"",IF({m}=1,"un million",INDEX(Lettres!$B$2:$B$1001,{m}+1)&" millions"))'
            f'&" "&IF({t}=0,"",IF({t}=1,"mille",INDEX(Lettres!$C$2:$C$1001,{t}+1)&" mille"))'
            f'&" "&IF({u}=0,"",INDEX(Lettres!$B$2:$B$1001,{u}+1)))')
    return (f'=IF(N({ref})=0,"Zéro franc CFA",UPPER(LEFT({core},1))&MID({core},2,500)'
            f'&" francs CFA ("&FIXED({n},0)&" FCFA)")')


if __name__ == "__main__":
    for x in [0, 1, 21, 71, 80, 81, 91, 100, 200, 280, 999]:
        print(x, w999(x), "|", w999(x, True))


def dfmt(ref):
    """Date jj/mm/aaaa indépendante de la langue d'Excel."""
    return f'RIGHT("0"&DAY({ref}),2)&"/"&RIGHT("0"&MONTH({ref}),2)&"/"&YEAR({ref})'
