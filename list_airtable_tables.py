import os
from pyairtable import Api, Base
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACION ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
# --- FIN CONFIGURACION ---

def list_and_read_airtable_tables():
    """
    Lista todas las tablas en la base de Airtable especificada y lee los primeros 5 registros de cada una.
    """
    print("Iniciando la conexión a Airtable para listar y leer tablas...")
    try:
        # Inicializar el cliente API de PyAirtable
        api = Api(AIRTABLE_PAT)
        base = api.base(BASE_ID)

        print(f"\nConectado a la Base de Airtable con ID: {BASE_ID}")

        # Obtener la lista de todas las tablas en la base
        tables = base.tables()

        if not tables:
            print("No se encontraron tablas en esta Base de Airtable.")
            return

        print(f"\nSe encontraron {len(tables)} tabla(s):")
        for table in tables:
            print(f"\n--- Tabla: {table.name} (ID: {table.id}) ---")
            
            # Leer los primeros 5 registros de la tabla
            print("  Leyendo los primeros 5 registros:")
            try:
                records = table.all(max_records=5)
                if records:
                    for i, record in enumerate(records):
                        print(f"    Registro {i+1}: {record['fields']}")
                else:
                    print("    No se encontraron registros en esta tabla.")
            except Exception as e:
                print(f"    Error al leer registros de la tabla {table.name}: {e}")

    except Exception as e:
        print(f"Error al conectar o listar tablas de Airtable: {e}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"Detalle del error de la API: {e.response.text}")

if __name__ == "__main__":
    list_and_read_airtable_tables()
