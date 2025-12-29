import os
import json
from pyairtable import Base, Api
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACION ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
OBLIGACIONES_TABLE_ID = "tblRuX3x3goryWwi3" # Your newly created Obligations table ID
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0" # Your existing Contributivos table ID
# --- FIN CONFIGURACION ---

# Initialize PyAirtable API client
api = Api(AIRTABLE_PAT)
base_obj = api.base(BASE_ID)

def inspect_table_schema(base_id, table_id): # Removed table_name_for_print as it's not needed with this approach
    print(f"\n--- INSPECCIONANDO ESQUEMA DE TABLA (ID: {table_id}) ---")
    try:
        # Get metadata for a specific table directly
        # The meta API is used for schema management
        table_metadata = api.get_table_schema(base_id, table_id) # This should work with the API object

        if not table_metadata:
            print(f"  No se pudo obtener el esquema de la tabla {table_id}. ¿Está el ID correcto o la tabla existe?")
            return

        print(f"  Nombre de la tabla: {table_metadata.get('name', 'N/A')}")
        print("\n  CAMPOS ENCONTRADOS Y SUS TIPOS:")
        for field in table_metadata['fields']:
            field_name = field.get('name', 'N/A')
            field_type = field.get('type', 'N/A')
            is_primary = " (Primary)" if field.get('isPrimary') else ""
            
            # Additional details for specific types
            details = ""
            if field_type == 'singleSelect' and 'options' in field:
                choices = [c.get('name', '') for c in field['options'].get('choices', [])]
                details = f" Opciones: [{', '.join(choices)} ]"
            elif field_type == 'multipleRecordLinks' and 'options' in field:
                linked_table_id = field['options'].get('linkedTableId', 'N/A')
                # For linked table name, we'd need another API call to get all tables in base
                prefers_single = field['options'].get('prefersSingleRecordLink', False)
                details = f" Enlaza a: (ID: {linked_table_id}) (Single Link: {prefers_single})"
            elif field_type == 'date' and 'options' in field:
                date_format = field['options'].get('dateFormat', {}).get('name', 'N/A')
                details = f" Formato Fecha: {date_format}"

            print(f"    - {field_name}{is_primary}: {field_type}{details}")
        
    except Exception as e:
        print(f"  Error al inspeccionar el esquema de la tabla {table_id}: {e}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"  Detalle del error de la API: {e.response.text}")

# Iniciar inspección
if __name__ == "__main__":
    inspect_table_schema(BASE_ID, OBLIGACIONES_TABLE_ID)
    inspect_table_schema(BASE_ID, CONTRIBUTIVOS_TABLE_ID)