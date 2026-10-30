"""Padrón de empleados habilitados para pedir su recibo de sueldo."""
import re
import unicodedata

# Nombre de búsqueda, correo. El correo se compara en minúsculas.
PADRON = [
    ("Carlos Alberto lagos", "alvertolagos57@gmail.com"),
    ("Olivero Anahi", "anatkm102010@hotmail.com"),
    ("Colipi Antonio segundo", "antoniocolipitraful@gmail.com"),
    ("arturoparada", "arturoparada313@gmail.com"),
    ("carolina andrea guzman", "carotraful@hotmai.com"),
    ("carolina andrea guzman", "carotraful@hotmail.com"),
    ("Paicil david", "davidpaici1987@gmail.com"),
    ("Paicil david", "davidpaicil1987@gmail.com"),
    ("Eduardo Adrian Paicil", "eduardoadrianpaicil@gmail.com"),
    ("EMANUEL TULA", "emanueltula89@gmail.com"),
    ("silva gabriela", "gabi24883@gmail.com"),
    ("Mora Alicia graciela", "gracielamora77@hotmail.com"),
    ("Claudia harris", "gt_030@hotmail.com"),
    ("Miguel huenuqueo", "huenuqueomiguel6@gmail.com"),
    ("Susana iturra", "iturrasusana60@gmail.com"),
    ("Javier alex iturra", "javichanturra@gmail.com"),
    ("Chavez Roxana", "rechlagos@gmail.com"),
    ("Santiago Walter Fernández", "kenayciro2022@gmail.com"),
    ("Lilian Elizabeth Almonacid", "lilian_traful@hotmail.com"),
    ("Roberto Marcelo cueva olatte", "marcelotraful75@gmail.com"),
    ("Márquez.manuel.", "marquez.manueltraful@gmail.com"),
    ("Nicandro ovidio matus", "matusnikandro@gmail.com"),
    ("Nelson Coyla", "nelsoncoyla@live.com.ar"),
    ("Olivero Anahi", "oliveroanahi87@gmail.com"),
    ("Mario eduardo parada", "paradamario202@gmail.com"),
    ("Alba Patricia Novoa", "pn4896054@gmail.com"),
    ("Lucuman Margarita Beatriz", "refugiodebetytraful68@gmail.com"),
    ("AdelioRiquelme", "riquelmeadelio7@gmail.com"),
    ("Novoa Alba Patricia", "rrhhtraful@gmail.com"),
    ("Fernando Javier Miranda", "tukitraful@gmail.com"),
    ("virginia paicil", "vickypaicil@gmail.com"),
    ("Viviana Georgina Gallegos", "vivianagallegos072@gmail.com"),
]


def _split_camel(value):
    return re.sub(r"([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])", r"\1 \2", value or "")


def normalize_text(value):
    text = _split_camel(value or "")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def _tokens(value):
    return [token for token in normalize_text(value).split() if len(token) >= 3]


def names_match(query, canonical_name):
    query_norm = normalize_text(query)
    name_norm = normalize_text(canonical_name)
    if len(query_norm) < 3 or not name_norm:
        return False

    compact_query = query_norm.replace(" ", "")
    compact_name = name_norm.replace(" ", "")
    if compact_query == compact_name:
        return True
    if len(compact_query) >= 6 and (
        compact_query in compact_name or compact_name in compact_query
    ):
        return True

    query_tokens = _tokens(query)
    name_tokens = _tokens(canonical_name)
    if not query_tokens or not name_tokens:
        return False

    query_set = set(query_tokens)
    name_set = set(name_tokens)
    if query_set <= name_set and (len(query_tokens) >= 2 or len(query_tokens[0]) >= 4):
        return True
    if name_set <= query_set:
        return True
    return False


def name_tokens(canonical_name):
    return _tokens(canonical_name)


def find_empleado(query, email):
    """Devuelve el nombre del padrón si el correo es de esa persona y el texto coincide."""
    email_norm = (email or "").strip().lower()
    if not email_norm:
        return None
    for nombre, mail in PADRON:
        if mail == email_norm and names_match(query, nombre):
            return nombre.strip()
    return None


def _same_person(left_name, right_name):
    return frozenset(_tokens(left_name)) == frozenset(_tokens(right_name))


def unique_name_tokens(canonical_name):
    """Tokens del nombre que no comparte con otro empleado."""
    own = set(_tokens(canonical_name))
    others = set()
    for nombre, _mail in PADRON:
        if _same_person(nombre, canonical_name):
            continue
        others.update(_tokens(nombre))
    return [token for token in own if token not in others and len(token) >= 4]


def filename_matches_empleado(filename, canonical_name):
    """True si el PDF parece ser el recibo de esa persona."""
    file_norm = normalize_text(filename)
    compact_file = file_norm.replace(" ", "")
    compact_name = normalize_text(canonical_name).replace(" ", "")
    file_tokens = set(file_norm.split())
    tokens = _tokens(canonical_name)

    if len(compact_name) >= 6 and compact_name in compact_file:
        return True
    if not tokens:
        return False

    hits = sum(1 for token in tokens if token in file_tokens)
    if len(tokens) == 1:
        return hits == 1
    if hits >= 2:
        return True
    return any(token in file_tokens for token in unique_name_tokens(canonical_name))


def period_key(filename):
    """Clave de período para elegir el recibo más nuevo cuando hay varios."""
    name = filename or ""
    year_first = re.search(r"(20\d{2})\D{0,3}(0[1-9]|1[0-2])", name)
    if year_first:
        return year_first.group(1) + year_first.group(2)
    month_first = re.search(r"(0[1-9]|1[0-2])\D{0,3}(20\d{2})", name)
    if month_first:
        return month_first.group(2) + month_first.group(1)
    return ""
