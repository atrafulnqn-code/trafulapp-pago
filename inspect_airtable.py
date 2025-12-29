from airtable import Airtable
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACION ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
# Un diccionario para mapear nombres de tablas a sus IDs para facilitar la inspección
TABLES_TO_INSPECT = {
    "deudas": "tblHuS8CdqVqTsA3t",
    "contributivos": "tblKbSq61LU1XXco0",
    "patente": "tbl3CMMwccWeo8XSG",
    "Obligaciones de Pago": "tblRuX3x3goryWwi3",
    "Historial de Pagos": "tbl5p19Hv4cMk9NUS"
}

def inspect_table(airtable_instance, table_name, table_id):
    print(f"\n--- INSPECCIONANDO TABLA: '{table_name}' (ID: {table_id}) ---")
    try:
        # Obtener información de los campos (columnas)
        # La API de Airtable no proporciona un endpoint directo para el 'schema' de los campos por tabla ID
        # Sin embargo, podemos deducir los campos inspeccionando los registros.
        
        # Obtener los primeros N registros para deducir los campos
        records = airtable_instance.get_all(maxRecords=5)
        
        if not records:
            print("  La tabla está vacía o no se pudieron obtener registros.")
            print("  No se pudo deducir la estructura de los campos sin registros.")
            return

        print("\n  CAMPOS ENCONTRADOS (deducidos de los primeros registros):")
        # Recopilar todos los campos de los primeros registros
        all_field_names = set()
        for record in records:
            if 'fields' in record:
                all_field_names.update(record['fields'].keys())
        
        if all_field_names:
            for field_name in sorted(list(all_field_names)):
                # Para obtener el tipo de campo exacto requeriría la API de Meta API o inferencia,
                # pero para una inspección básica, el nombre es suficiente.
                print(f"    - {field_name}")
        else:
            print("    No se encontraron campos en los registros de muestra.")

        print("\n  PRIMEROS 5 REGISTROS DE EJEMPLO:")
        for i, record in enumerate(records):
            print(f"    --- Registro {i+1} (ID: {record.get('id', 'N/A')}) ---")
            for field_name, value in record.get('fields', {}).items():
                # Formatear la salida para valores largos o estructuras complejas
                if isinstance(value, dict) or isinstance(value, list):
                    print(f"      {field_name}: {json.dumps(value, indent=2, ensure_ascii=False)}")
                else:
                    print(f"      {field_name}: {str(value)[:100]}{'...' if len(str(value)) > 100 else ''}")
        
    except Exception as e:
        print(f"  Error al inspeccionar la tabla '{table_name}': {e}")
        # Intentar obtener la URL de la API de Airtable para ver si hay algún error específico
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"  Detalle del error de la API: {e.response.text}")

# Iniciar inspección
if __name__ == "__main__":
    for name, table_id in TABLE_CONFIG.items():
        try:
            # La biblioteca Airtable usa el PAT como API_KEY
            airtable = Airtable(BASE_ID, table_id, api_key=AIRTABLE_PAT)
            inspect_table(airtable, name, table_id)
        except Exception as e:
            print(f"\nERROR FATAL: No se pudo conectar a Airtable o inicializar para la tabla {name} (ID: {table_id}).")
            print(f"Detalles: {e}")
            if "Authentication required" in str(e):
                print("Por favor, verifica que tu AIRTABLE_PAT sea correcto y tenga permisos.")
            elif "not found" in str(e) or "INVALID_TABLE_ID" in str(e):
                print("Por favor, verifica que el BASE_ID y el TABLE_ID sean correctos.")
