import os
import time
from pyairtable import Table, Base, Api
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACION ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0"
OBLIGACIONES_TABLE_ID = "tblRuX3x3goryWwi3"
# --- FIN CONFIGURACION ---

# Initialize PyAirtable API client
api = Api(AIRTABLE_PAT)
base_obj = api.base(BASE_ID) # Base object is needed for some operations, but table access via api is recommended

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
                    print(f"  Subido 1 registro individualmente (error en lote): {record.get('DNI Temporal', record.get('Nombre en CSV'))}")
                    time.sleep(0.2)
                except Exception as e_single:
                    print(f"  ERROR GRAVE: No se pudo subir el registro individual: {record}. Detalle: {e_single}")
    print(f"Subida completa. Total de registros subidos: {total_uploaded}")


# --- MAIN EXECUTION ---
if __name__ == "__main__":
    print("Iniciando poblamiento automatizado de 'Obligaciones de Pago'...")

    # Initialize Airtable clients for existing tables
    airtable_contribuyentes_existing = api.table(BASE_ID, CONTRIBUTIVOS_TABLE_ID) # Use api.table
    airtable_obligaciones_new = api.table(BASE_ID, OBLIGACIONES_TABLE_ID) # Use api.table
    
    # 1. Load and process all CSV data
    print("\nCARGANDO Y PROCESANDO DATOS CSV...")
    deudas_data = load_csv_data(CSV_DEUDAS)
    patente_data = load_csv_data(CSV_PATENTE)
    retributivos_data = load_csv_data(CSV_RETRIBUTIVOS)

    # 2. Get existing Contribuyentes for linking
    print(f"\nRECUPERANDO Contribuyentes existentes de la tabla '{CONTRIBUTIVOS_NOMBRE_FIELD}' (ID: {TABLE_CONTRIBUTIVOS_ID}) para vinculación...")
    contribuyentes_lookup_by_dni = {} # {dni: record_id}
    contribuyentes_lookup_by_name = {} # {name: record_id, ...} for deudas.csv
    
    all_existing_contribuyentes = airtable_contribuyentes_existing.all()
    if not all_existing_contribuyentes:
        print(f"ADVERTENCIA: La tabla '{CONTRIBUTIVOS_NOMBRE_FIELD}' (ID: {TABLE_CONTRIBUTIVOS_ID}) está vacía o no se pudieron recuperar registros.")
        print("No se podrán vincular registros de obligaciones a contribuyentes existentes. Por favor, asegúrate de que 'contributivos' esté poblada.")
        exit(1) # Exit if no contributors to link to
    
    for rec in all_existing_contribuyentes:
        dni = rec['fields'].get(CONTRIBUTIVOS_DNI_FIELD)
        nombre = rec['fields'].get(CONTRIBUTIVOS_NOMBRE_FIELD) 
        
        if dni:
            contribuyentes_lookup_by_dni[str(dni)] = rec['id'] 
        if nombre:
            contribuyentes_lookup_by_name[nombre.lower().strip()] = rec['id'] 

    print(f"Mapa de Contribuyentes creado: {len(contribuyentes_lookup_by_dni)} DNI, {len(contribuyentes_lookup_by_name)} Nombres.")

    # 3. Process Obligaciones data and upload
    print("\nGENERANDO REGISTROS de OBLIGACIONES...")
    obligaciones_records_to_upload = process_obligaciones_data(deudas_data, patente_data, retributivos_data, contribuyentes_lookup_by_name) 

    # Add the actual 'Contribuyente' link field (array of record IDs)
    final_obligaciones_records = []
    for record in obligaciones_records_to_upload:
        dni_temp = record.get('DNI Temporal', None)
        nombre_csv_temp = record.get('Nombre en CSV', None)
        
        linked_record_id = None
        if dni_temp and dni_temp in contribuyentes_lookup_by_dni:
            linked_record_id = contribuyentes_lookup_by_dni[dni_temp]
        elif nombre_csv_temp and nombre_csv_temp in contribuyentes_lookup_by_name:
            linked_record_id = contribuyentes_lookup_by_name[nombre_csv_temp]
            print(f"  Advertencia: DNI Temporal no encontrado para '{nombre_csv_temp}'. Vinculando por nombre.")
        
        if linked_record_id:
            record['Contribuyente'] = [linked_record_id] 
        else:
            print(f"  Advertencia: No se pudo encontrar Contribuyente para DNI '{dni_temp}' o Nombre '{nombre_csv_temp}'. El enlace no se creará automáticamente para esta obligación: {record.get('Detalle de Obligación', 'N/A')}.")
            record['Contribuyente'] = [] # Set to empty list if no link

        # Remove DNI Temporal and Nombre en CSV as they are no longer needed after linking attempt
        record.pop('DNI Temporal', None)
        record.pop('Nombre en CSV', None)

        final_obligaciones_records.append(record) # Add to final list after link processing

    print(f"\nSUBIENDO {len(final_obligaciones_records)} REGISTROS a 'Obligaciones de Pago'...")
    upload_records_in_batches(airtable_obligaciones_new, final_obligaciones_records)

    print("\nPOBLAMIENTO AUTOMATIZADO DE 'Obligaciones de Pago' FINALIZADO.")