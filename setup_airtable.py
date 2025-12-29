import os
import time
from airtable import Airtable
from pyairtable import Table, Base, Api
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACION ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
# --- FIN CONFIGURACION ---

# Initialize PyAirtable API client
api = Api(AIRTABLE_PAT)
base_obj = api.base(BASE_ID) # Correct way to get base object from Api

# --- HELPER FUNCTIONS ---
def clean_and_parse_money(value_str):
    if not value_str:
        return 0.0
    clean_value = re.sub(r'[^\d,\.]', '', value_str)
    clean_value = clean_value.replace(',', '.') # Ensure dot as decimal separator
    try:
        return float(clean_value)
    except ValueError:
        return 0.0

def get_first_numeric_dni(dni_str):
    if not dni_str:
        return ""
    match = re.search(r'\d+', dni_str)
    if match:
        return match.group(0).replace('.', '')
    return ""

def create_airtable_table_schema(base_id, table_name, fields_schema):
    """
    Crea una tabla en Airtable con el esquema dado.
    fields_schema es una lista de diccionarios, cada uno con 'name', 'type', y otras propiedades.
    """
    print(f"Intentando crear tabla '{table_name}' con esquema...")
    try:
        primary_field_name = fields_schema[0]['name'] # Assume first field is primary
        
        # Prepare fields for pyairtable's create_table, removing 'isPrimary'
        formatted_fields = []
        for field in fields_schema:
            field_copy = field.copy()
            field_copy.pop('isPrimary', None) # Remove isPrimary as it's passed separately
            if field_copy.get('options') and 'choices' in field_copy['options']:
                field_copy['options']['choices'] = [{"name": choice} for choice in field_copy['options']['choices']]
            formatted_fields.append(field_copy)

        new_table_obj = base_obj.create_table(table_name, formatted_fields, primary_field_name=primary_field_name)
        new_table_id = new_table_obj['id']
        print(f"Tabla '{table_name}' creada con éxito. ID: {new_table_id}")
        return new_table_id
    except Exception as e:
        print(f"Error al crear la tabla '{table_name}': {e}")
        return None

def delete_airtable_table(base_id, table_id):
    """Elimina una tabla de Airtable por su ID."""
    print(f"Intentando borrar tabla con ID: {table_id}...")
    try:
        api.delete_table(base_id, table_id) # Corrected: use api.delete_table
        print(f"Tabla con ID: {table_id} borrada con éxito.")
        return True
    except Exception as e:
        if "TABLE_NOT_FOUND" in str(e) or "NOT_FOUND" in str(e): # Added NOT_FOUND for robustness
            print(f"Tabla con ID: {table_id} no encontrada. No es necesario borrar.")
            return True # Consider it deleted if not found
        print(f"Error al borrar la tabla con ID: {table_id}: {e}")
        return False

def load_csv_data(file_path):
    """Carga y limpia un archivo CSV."""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cleaned_row = {k.strip().lower(): v.strip() if isinstance(v, str) else v for k, v in row.items()}
            data.append(cleaned_row)
    return data

def process_contribuyentes_data(deudas_data, patente_data, retributivos_data):
    """Extrae DNI y nombres completos únicos de todos los CSVs."""
    contribuyentes_map = {} # {dni: nombre_completo}

    # From patente.csv (titular, dni)
    for row in patente_data:
        dni = get_first_numeric_dni(row.get('dni', ''))
        nombre = row.get('titular', '').lower().strip()
        if dni and nombre:
            contribuyentes_map[dni] = nombre

    # From retributivos.csv (contribuyente, dni)
    for row in retributivos_data:
        dni = get_first_numeric_dni(row.get('dni', ''))
        nombre = row.get('contribuyente', '').lower().strip()
        if dni and nombre:
            contribuyentes_map[dni] = nombre
    
    # Convert map to list of records for Airtable
    contribuyentes_records = []
    for dni, nombre in contribuyentes_map.items():
        contribuyentes_records.append({
            "DNI": dni,
            "Nombre Completo": nombre
        })
    return contribuyentes_records

def process_obligaciones_data(deudas_data, patente_data, retributivos_data, contribuyentes_lookup):
    """Genera registros de obligaciones y los prepara para Airtable."""
    obligaciones_records = []
    months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    year = "2026"

    # --- Obligaciones de Deudas (from deudas.csv) ---
    for row in deudas_data:
        nombre_csv = row.get('nombre y apellido', '').lower().strip()
        monto = clean_and_parse_money(row.get('monto total deuda', ''))
        
        found_dni_for_name = ""
        # Try to find DNI in our lookup map based on name (less robust)
        for c_dni, c_name in contribuyentes_lookup.items():
            if c_name == nombre_csv:
                found_dni_for_name = c_dni
                break
        
        obligaciones_records.append({
            "Nombre en CSV": nombre_csv,
            "DNI Temporal": found_dni_for_name, 
            "Tipo de Impuesto": "Deuda General",
            "Detalle de Obligación": "deuda 2025", # Changed to 2025 as per original request
            "Monto Original": monto,
            "Monto Pendiente": monto,
            "Estado": "pendiente",
            "Información Adicional (Patente/Nomenclatura)": "" 
        })

    # --- Obligaciones de Patente (from patente.csv) ---
    for row in patente_data:
        nombre_csv = row.get('titular', '').lower().strip()
        dni_temporal = get_first_numeric_dni(row.get('dni', '')) 
        
        info_adicional_parts = []
        # Ensure all fields are handled gracefully for string construction
        for col in ['marca', 'tipo', 'patente', 'kilos', 'modelo', 'motor', 'codigo aut']:
            val = row.get(col, '')
            info_adicional_parts.append(val.lower().strip() if isinstance(val, str) else str(val))
        info_adicional = ", ".join(filter(None, info_adicional_parts)) 
        
        for month_name in months:
            monto = PATENTE_MONTHLY_AMOUNT 
            
            if monto > 0:
                obligaciones_records.append({
                    "Nombre en CSV": nombre_csv,
                    "DNI Temporal": dni_temporal,
                    "Tipo de Impuesto": "Patente",
                    "Detalle de Obligación": f"patente {month_name} {year}",
                    "Monto Original": monto,
                    "Monto Pendiente": monto,
                    "Estado": "pendiente",
                    "Información Adicional (Patente/Nomenclatura)": info_adicional
                })

    # --- Obligaciones de Retributivos (from retributivos.csv) ---
    for row in retributivos_data:
        nombre_csv = row.get('contribuyente', '').lower().strip()
        dni_temporal = get_first_numeric_dni(row.get('dni', '')) 

        info_adicional_parts = []
        for col in ['lote', 'nomenclatura catastral', 'dni']: 
            val = row.get(col, '')
            info_adicional_parts.append(val.lower().strip() if isinstance(val, str) else str(val))
        info_adicional = ", ".join(filter(None, info_adicional_parts))
        
        # Process "Deuda" column
        deuda_monto = clean_and_parse_money(row.get('deuda', ''))
        if deuda_monto > 0:
            obligaciones_records.append({
                "Nombre en CSV": nombre_csv,
                "DNI Temporal": dni_temporal,
                "Tipo de Impuesto": "Retributivo",
                "Detalle de Obligación": f"retributivo deuda {year}",
                "Monto Original": deuda_monto,
                "Monto Pendiente": deuda_monto,
                "Estado": "pendiente",
                "Información Adicional (Patente/Nomenclatura)": info_adicional
            })

        # Process monthly columns for retributivos
        for month_name in months:
            monthly_monto = clean_and_parse_money(row.get(month_name, ''))
            if monthly_monto > 0:
                obligaciones_records.append({
                    "Nombre en CSV": nombre_csv,
                    "DNI Temporal": dni_temporal,
                    "Tipo de Impuesto": "Retributivo",
                    "Detalle de Obligación": f"retributivo {month_name} {year}",
                    "Monto Original": monthly_monto,
                    "Monto Pendiente": monthly_monto,
                    "Estado": "pendiente",
                    "Información Adicional (Patente/Nomenclatura)": info_adicional
                })
                
    return obligaciones_records

def upload_records_in_batches(airtable_table_instance, records, batch_size=10):
    """Sube registros a Airtable en lotes."""
    total_uploaded = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            airtable_table_instance.batch_create(batch)
            total_uploaded += len(batch)
            print(f"  Subidos {total_uploaded}/{len(records)} registros...")
            time.sleep(0.5) # Wait to avoid hitting API rate limits
        except Exception as e:
            print(f"  Error al subir lote de registros: {e}")
            # Try to upload one by one if batch fails, to identify problematic records
            for record in batch:
                try:
                    airtable_table_instance.insert(record)
                    total_uploaded += 1
                    print(f"  Subido 1 registro individualmente (error en lote): {record.get('DNI', record.get('Nombre en CSV'))}")
                    time.sleep(0.2)
                except Exception as e_single:
                    print(f"  ERROR GRAVE: No se pudo subir el registro individual: {record}. Detalle: {e_single}")
    print(f"Subida completa. Total de registros subidos: {total_uploaded}")


# --- MAIN EXECUTION ---
if __name__ == "__main__":
    print("Iniciando configuración automatizada de Airtable...")

    # 0. Delete existing tables
    for name, table_id in TABLE_IDS_TO_DELETE.items():
        delete_airtable_table(BASE_ID, table_id)
        time.sleep(1) # Small delay between deletions

    # 1. Define Schemas for new tables
    contribuyentes_schema = [
        {"name": "DNI", "type": "singleLineText"}, # Removed isPrimary here
        {"name": "Nombre Completo", "type": "singleLineText"},
        # Add other optional fields if desired
    ]

    obligaciones_schema = [
        {"name": "ID Obligación", "type": "autoNumber"}, # Removed isPrimary here
        {"name": "DNI Temporal", "type": "singleLineText"},
        {"name": "Nombre en CSV", "type": "singleLineText"},
        {"name": "Contribuyente", "type": "multipleRecordLinks", "options": {"linkedTableId": "", "prefersSingleRecordLink": True}}, # linkedTableId will be set after Contribuyentes is created
        {"name": "Tipo de Impuesto", "type": "singleSelect", "options": {"choices": ["Deuda General", "Patente", "Retributivo"]}},
        {"name": "Detalle de Obligación", "type": "singleLineText"},
        {"name": "Monto Original", "type": "currency"},
        {"name": "Monto Pendiente", "type": "currency"},
        {"name": "Fecha Vencimiento", "type": "date", "options": {"dateFormat": {"name": "iso", "format": "YYYY-MM-DD"}}},
        {"name": "Estado", "type": "singleSelect", "options": {"choices": ["Pendiente", "Pagado Parcial", "Pagado Total", "Vencido"]}},
        {"name": "Fecha de Pago", "type": "date", "options": {"dateFormat": {"name": "iso", "format": "YYYY-MM-DD"}}},
        {"name": "ID Transacción MercadoPago", "type": "singleLineText"},
        {"name": "Información Adicional (Patente/Nomenclatura)", "type": "multilineText"},
    ]

    # 2. Create Contribuyentes table
    print("\nCREANDO TABLA 'Contribuyentes'...")
    contribuyentes_table_id = create_airtable_table_schema(BASE_ID, "Contribuyentes", contribuyentes_schema)
    if not contribuyentes_table_id:
        print("Error fatal: No se pudo crear la tabla Contribuyentes.")
        exit(1)
    time.sleep(2) # Give Airtable a moment to process table creation

    # Update linkedTableId for Obligaciones_de_Pago schema
    for field in obligaciones_schema:
        if field["name"] == "Contribuyente":
            field["options"]["linkedTableId"] = contribuyentes_table_id
            break
            
    # 3. Create Obligaciones de Pago table
    print("\nCREANDO TABLA 'Obligaciones de Pago'...")
    obligaciones_table_id = create_airtable_table_schema(BASE_ID, "Obligaciones de Pago", obligaciones_schema)
    if not obligaciones_table_id:
        print("Error fatal: No se pudo crear la tabla Obligaciones de Pago.")
        exit(1)
    time.sleep(2) # Give Airtable a moment to process table creation

    # Initialize Airtable clients for data population
    airtable_contribuyentes = Table(AIRTABLE_PAT, BASE_ID, "Contribuyentes")
    airtable_obligaciones = Table(AIRTABLE_PAT, BASE_ID, "Obligaciones de Pago")
    
    # 4. Load and process all CSV data
    print("\nCARGANDO Y PROCESANDO DATOS CSV...")
    deudas_data = load_csv_data(CSV_DEUDAS)
    patente_data = load_csv_data(CSV_PATENTE)
    retributivos_data = load_csv_data(CSV_RETRIBUTIVOS)

    # 5. Process Contribuyentes data and upload
    contribuyentes_records_to_upload = process_contribuyentes_data(deudas_data, patente_data, retributivos_data)
    print(f"\nSUBIENDO {len(contribuyentes_records_to_upload)} REGISTROS a 'Contribuyentes'...")
    upload_records_in_batches(airtable_contribuyentes, contribuyentes_records_to_upload)

    # Retrieve uploaded Contribuyentes to create a DNI -> Record ID map for linking
    print("\nRECUPERANDO IDs de Contribuyentes para vinculación...")
    contribuyentes_lookup_by_dni = {} # {dni: record_id}
    all_contribuyentes = airtable_contribuyentes.all()
    for rec in all_contribuyentes:
        dni = rec['fields'].get('DNI')
        if dni:
            contribuyentes_lookup_by_dni[dni] = rec['id']
    print(f"Mapa de Contribuyentes creado con {len(contribuyentes_lookup_by_dni)} entradas.")

    # 6. Process Obligaciones data and upload
    print("\nGENERANDO REGISTROS de OBLIGACIONES...")
    obligaciones_records_to_upload = process_obligaciones_data(deudas_data, patente_data, retributivos_data, contribuyentes_lookup_by_dni)

    # Add the actual 'Contribuyente' link field (array of record IDs)
    for record in obligaciones_records_to_upload:
        dni_temp = record.pop('DNI Temporal', None) # Remove DNI Temporal, as we're using it for lookup
        if dni_temp and dni_temp in contribuyentes_lookup_by_dni:
            record['Contribuyente'] = [contribuyentes_lookup_by_dni[dni_temp]] # Link using Airtable record ID
        else:
            # Handle cases where DNI is not found in Contribuyentes (e.g., deudas.csv lacks DNI)
            # Or if 'Nombre en CSV' is the only identifier, user might need to link manually.
            # For now, if DNI Temporal is not found, Contribuyente link will be empty.
            record['Contribuyente'] = [] # Set to empty list if no link

    print(f"\nSUBIENDO {len(obligaciones_records_to_upload)} REGISTROS a 'Obligaciones de Pago'...")
    upload_records_in_batches(airtable_obligaciones, obligaciones_records_to_upload)

    print("\nCONFIGURACIÓN Y POBLACIÓN AUTOMATIZADA DE AIRTABLE FINALIZADA.")