import csv
import json
import os
import time
from pyairtable import Table, Base, Api
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACION ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
TABLE_CONTRIBUTIVOS_ID = "tblKbSq61LU1XXco0"  # <- IMPORTANTE: Este es el ID de la tabla Contributivos
# --- FIN CONFIGURACION ---

# Initialize PyAirtable API client
api = Api(AIRTABLE_PAT)
base_obj = api.base(BASE_ID)

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

def create_obligaciones_table(base_id, contribuyentes_table_id):
    """Crea la tabla 'Obligaciones de Pago' con el esquema definido y vincula a 'Contribuyentes'."""
    table_name = "Obligaciones de Pago"
    fields_schema = [
        {"name": "ID Obligación", "type": "autoNumber"},
        {"name": "DNI Temporal", "type": "singleLineText"},
        {"name": "Nombre en CSV", "type": "singleLineText"},
        {"name": "Contribuyente", "type": "multipleRecordLinks", "options": {"linkedTableId": contribuyentes_table_id, "prefersSingleRecordLink": True}},
        {"name": "Tipo de Impuesto", "type": "singleSelect", "options": {"choices": ["Deuda General", "Patente", "Retributivo"]}},
        {"name": "Detalle de Obligación", "type": "singleLineText"},
        {"name": "Monto Original", "type": "currency"},
        {"name": "Monto Pendiente", "type": "currency"},
        {"name": "Fecha Vencimiento", "type": "date", "options": {"dateFormat": {"name": "iso", "format": "YYYY-MM-DD"}}}, # Removed trailing comma here
        {"name": "Estado", "type": "singleSelect", "options": {"choices": ["Pendiente", "Pagado Parcial", "Pagado Total", "Vencido"]}},
        {"name": "Fecha de Pago", "type": "date", "options": {"dateFormat": {"name": "iso", "format": "YYYY-MM-DD"}}}, # Removed trailing comma here
        {"name": "ID Transacción MercadoPago", "type": "singleLineText"},
        {"name": "Información Adicional (Patente/Nomenclatura)", "type": "multilineText"},
    ]

    print(f"\nIntentando crear tabla '{table_name}' con esquema...")
    try:
        primary_field_name = "ID Obligación"
        formatted_fields = []
        for field in fields_schema:
            field_copy = field.copy()
            if field_copy.get('options') and 'choices' in field_copy['options']:
                field_copy['options']['choices'] = [{"name": choice} for choice in field_copy['options']['choices']]
            formatted_fields.append(field_copy)

        new_table_obj = base_obj.create_table(table_name, formatted_fields, primary_field_name=primary_field_name)
        new_table_id = new_table_obj['id']
        print(f"Tabla '{table_name}' creada con éxito. ID: {new_table_id}")
        return new_table_id
    except Exception as e:
        print(f"Error al crear la tabla '{table_name}': {e}")
        # If table name already exists, try to get its ID
        if "TABLE_NAME_ALREADY_USED" in str(e) or "ALREADY_EXISTS" in str(e): # Added ALREADY_EXISTS for robustness
            print(f"La tabla '{table_name}' ya existe. Intentando obtener su ID...")
            try:
                tables = base_obj.tables()
                for table_info in tables:
                    if table_info['name'] == table_name:
                        print(f"ID de la tabla '{table_name}' existente: {table_info['id']}")
                        return table_info['id']
            except Exception as e_get:
                print(f"Error al obtener ID de tabla existente: {e_get}")
        return None

def load_csv_data(file_path):
    """Carga y limpia un archivo CSV."""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cleaned_row = {k.strip().lower(): v.strip() if isinstance(v, str) else v for k, v in row.items()}
            data.append(cleaned_row)
    return data

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
            if c_name == nombre_csv: # We compare against the primary field name in 'contributivos'
                found_dni_for_name = c_dni
                break
        
        obligaciones_records.append({
            "Nombre en CSV": nombre_csv,
            "DNI Temporal": found_dni_for_name, 
            "Tipo de Impuesto": "Deuda General",
            "Detalle de Obligación": "deuda 2025", 
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
    print("Iniciando configuración automatizada de Airtable con tablas existentes...")

    # --- NO SE BORRARÁN TABLAS EXISTENTES ---
    # --- NO SE CREARÁ LA TABLA 'Contribuyentes', SE USARÁ LA TABLA 'contributivos' EXISTENTE ---
    
    contribuyentes_table_id = TABLE_CONTRIBUTIVOS_ID
    
    # 1. Define Schema for new Obligaciones de Pago table
    # This schema will be used to CREATE the 'Obligaciones de Pago' table
    obligaciones_schema = [
        {"name": "ID Obligación", "type": "autoNumber"},
        {"name": "DNI Temporal", "type": "singleLineText"},
        {"name": "Nombre en CSV", "type": "singleLineText"},
        {"name": "Contribuyente", "type": "multipleRecordLinks", "options": {"linkedTableId": contribuyentes_table_id, "prefersSingleRecordLink": True}},
        {"name": "Tipo de Impuesto", "type": "singleSelect", "options": {"choices": ["Deuda General", "Patente", "Retributivo"]}},
        {"name": "Detalle de Obligación", "type": "singleLineText"},
        {"name": "Monto Original", "type": "currency"},
        {"name": "Monto Pendiente", "type": "currency"},
        {"name": "Fecha Vencimiento", "type": "date", "options": {"dateFormat": {"name": "iso", "format": "YYYY-MM-DD"}}}, # Removed trailing comma here
        {"name": "Estado", "type": "singleSelect", "options": {"choices": ["Pendiente", "Pagado Parcial", "Pagado Total", "Vencido"]}},
        {"name": "Fecha de Pago", "type": "date", "options": {"dateFormat": {"name": "iso", "format": "YYYY-MM-DD"}}}, # Removed trailing comma here
        {"name": "ID Transacción MercadoPago", "type": "singleLineText"},
        {"name": "Información Adicional (Patente/Nomenclatura)", "type": "multilineText"},
    ]
            
    # 2. Create Obligaciones de Pago table (if it doesn't exist)
    print("\nCREANDO TABLA 'Obligaciones de Pago' (si no existe)...")
    obligaciones_table_id = create_obligaciones_table(BASE_ID, contribuyentes_table_id)
    if not obligaciones_table_id:
        print("Error fatal: No se pudo crear la tabla Obligaciones de Pago o encontrar su ID.")
        exit(1)
    time.sleep(2) # Give Airtable a moment to process table creation

    # Initialize Airtable clients for data population
    # airtable_contribuyentes will use the existing 'contributivos' table
    airtable_contribuyentes = Table(AIRTABLE_PAT, BASE_ID, TABLE_CONTRIBUTIVOS_ID)
    airtable_obligaciones = Table(AIRTABLE_PAT, BASE_ID, obligaciones_table_id)
    
    # 3. Load and process all CSV data
    print("\nCARGANDO Y PROCESANDO DATOS CSV...")
    deudas_data = load_csv_data(CSV_DEUDAS)
    patente_data = load_csv_data(CSV_PATENTE)
    retributivos_data = load_csv_data(CSV_RETRIBUTIVOS)

    # 4. Get existing Contribuyentes for linking
    print(f"\nRECUPERANDO Contribuyentes existentes de la tabla '{CONTRIBUTIVOS_NOMBRE_FIELD}' (ID: {TABLE_CONTRIBUTIVOS_ID}) para vinculación...")
    contribuyentes_lookup_by_dni = {} # {dni: record_id, ...}
    contribuyentes_lookup_by_name = {} # {name: record_id, ...} For deudas.csv
    
    all_existing_contribuyentes = airtable_contribuyentes.all()
    if not all_existing_contribuyentes:
        print(f"ADVERTENCIA: La tabla '{CONTRIBUTIVOS_NOMBRE_FIELD}' (ID: {TABLE_CONTRIBUTIVOS_ID}) está vacía o no se pudieron recuperar registros.")
        print("No se podrán vincular registros de obligaciones a contribuyentes existentes.")
    
    for rec in all_existing_contribuyentes:
        dni = rec['fields'].get(CONTRIBUTIVOS_DNI_FIELD)
        nombre = rec['fields'].get(CONTRIBUTIVOS_NOMBRE_FIELD) # Get the name from the existing primary field
        
        if dni:
            contribuyentes_lookup_by_dni[str(dni)] = rec['id'] # Ensure DNI is string
        if nombre:
            contribuyentes_lookup_by_name[nombre.lower().strip()] = rec['id'] # For deudas.csv linking

    print(f"Mapa de Contribuyentes creado: {len(contribuyentes_lookup_by_dni)} DNI, {len(contribuyentes_lookup_by_name)} Nombres.")

    # 5. Process Obligaciones data and upload
    print("\nGENERANDO REGISTROS de OBLIGACIONES...")
    obligaciones_records_to_upload = process_obligaciones_data(deudas_data, patente_data, retributivos_data, contribuyentes_lookup_by_name) # Pass name lookup here

    # Add the actual 'Contribuyente' link field (array of record IDs)
    final_obligaciones_records = []
    for record in obligaciones_records_to_upload:
        dni_temp = record.pop('DNI Temporal', None)
        nombre_csv_temp = record.pop('Nombre en CSV', None) # Get name for deudas.csv lookup
        
        linked_record_id = None
        if dni_temp and dni_temp in contribuyentes_lookup_by_dni:
            linked_record_id = contribuyentes_lookup_by_dni[dni_temp]
        elif nombre_csv_temp and nombre_csv_temp in contribuyentes_lookup_by_name:
            # Fallback for deudas.csv where DNI might be missing but name exists
            linked_record_id = contribuyentes_lookup_by_name[nombre_csv_temp]
            print(f"  Advertencia: DNI Temporal no encontrado para '{nombre_csv_temp}'. Vinculando por nombre.")
        
        if linked_record_id:
            record['Contribuyente'] = [linked_record_id] 
        else:
            print(f"  Advertencia: No se pudo encontrar Contribuyente para DNI '{dni_temp}' o Nombre '{nombre_csv_temp}'. El enlace no se creará automáticamente.")
            record['Contribuyente'] = [] # Set to empty list if no link

        final_obligaciones_records.append(record) # Add to final list after link processing

    print(f"\nSUBIENDO {len(final_obligaciones_records)} REGISTROS a 'Obligaciones de Pago'...")
    upload_records_in_batches(airtable_obligaciones, final_obligaciones_records)

    # Optionally, you might want to clean up the temporary tables ('deudas', 'patente')
    # but I'll leave them for now unless you specifically ask me to delete them.

    print("\nCONFIGURACIÓN Y POBLACIÓN AUTOMATIZADA DE AIRTABLE FINALIZADA.")