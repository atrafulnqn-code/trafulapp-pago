import os
from pyairtable import Api
from dotenv import load_dotenv

load_dotenv()

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
EFECTIVO_TABLE_ID = "tblXqPkaVnF9GHGdI"

api = Api(AIRTABLE_PAT)
table = api.table(BASE_ID, EFECTIVO_TABLE_ID)

records = table.all(max_records=5)
if records:
    print("Campos en Pagos Efectivo:")
    for key in records[0]['fields'].keys():
        print(f"- {key}")
    print("\nEjemplo de registro:")
    print(records[0])
else:
    print("No se encontraron registros en Pagos Efectivo.")
