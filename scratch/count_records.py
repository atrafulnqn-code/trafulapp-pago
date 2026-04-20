import os
from pyairtable import Api
from dotenv import load_dotenv
from pyairtable.formulas import AND, OR, match
from datetime import datetime

load_dotenv()

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"

START_DATE = "2026-01-19"
END_DATE = "2026-02-10"

api = Api(AIRTABLE_PAT)

tables = {
    "Historial de Pagos": ("tbl5p19Hv4cMk9NUS", "Fecha de Transacción"),
    "Pagos Efectivo": ("tblXqPkaVnF9GHGdI", "Fecha y Hora"),
    "Recaudación": ("tblzRhxpeqbuhrf78", "Fecha")
}

for name, (table_id, date_field) in tables.items():
    table = api.table(BASE_ID, table_id)
    # Formula for date range
    # IS_AFTER({Field}, 'YYYY-MM-DD') and IS_BEFORE({Field}, 'YYYY-MM-DD')
    # Or just comparison if it's a string, but Airtable functions are better.
    # Note: Fecha in Recaudacion is YYYY-MM-DD, others are ISO.
    
    formula = f"AND(IS_AFTER({{ {date_field} }}, '{START_DATE}'), IS_BEFORE({{ {date_field} }}, '{END_DATE}'))"
    # Actually IS_AFTER and IS_BEFORE are exclusive or inclusive? Let's use >= and <= if possible or include the days.
    # To include Jan 19 and Feb 10:
    formula = f"AND(IS_AFTER({{ {date_field} }}, DATEADD('{START_DATE}', -1, 'days')), IS_BEFORE({{ {date_field} }}, DATEADD('{END_DATE}', 1, 'days')))"
    
    try:
        count = len(table.all(formula=formula))
        print(f"Tabla {name}: {count} registros encontrados.")
    except Exception as e:
        print(f"Error en tabla {name}: {e}")
