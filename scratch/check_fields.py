import os
from pyairtable import Api
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
HISTORIAL_TABLE_ID = "tbl5p19Hv4cMk9NUS"

api = Api(AIRTABLE_PAT)
table = api.table(BASE_ID, HISTORIAL_TABLE_ID)

# Obtener una muestra para ver los campos
records = table.all(max_records=5)
if records:
    print("Campos en Historial de Pagos:")
    for key in records[0]['fields'].keys():
        print(f"- {key}")
    print("\nEjemplo de registro:")
    print(records[0])
else:
    print("No se encontraron registros en Historial de Pagos.")
