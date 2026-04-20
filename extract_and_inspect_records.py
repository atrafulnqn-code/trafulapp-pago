import os
import csv
import json
from datetime import datetime
import psycopg2
from pyairtable import Api
from dotenv import load_dotenv

load_dotenv("backend/.env")

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
DATABASE_URL = "postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general"

start_date_str = '2026-01-19'
end_date_str = '2026-02-10'

import uuid
import decimal
from datetime import datetime, date

def serialize_custom(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, decimal.Decimal):
        return float(obj)
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

def extract_airtable():
    print("--- Extracting Airtable Data ---")
    api = Api(AIRTABLE_PAT)
    base = api.base(BASE_ID)
    
    tables_to_extract = [
        "Efectivo", 
        "Historial de Pagos", 
        "Comprobante_Recaudacion", 
        "Comprobante_Patente", 
        "Plan_de_Pago"
    ]
    
    all_records = []
    
    # formula to fetch records
    formula = f"AND(IS_AFTER(CREATED_TIME(), '2026-01-18'), IS_BEFORE(CREATED_TIME(), '2026-02-11'))"
    
    for t_name in tables_to_extract:
        try:
            table = base.table(t_name)
            # Use same formula strategy as before
            records = table.all(formula=formula)
            for r in records:
                # Add table source
                d = {'Origen_Tabla': t_name, 'Airtable_ID': r['id'], 'Fecha_Creacion': r['createdTime']}
                # Add all fields and flatten them
                for k, v in r['fields'].items():
                    d[k] = str(v) if isinstance(v, (list, dict)) else v
                all_records.append(d)
        except Exception as e:
            print(f"Error fetching {t_name}: {e}")
            
    # Get all unique fields for CSV headers
    fieldnames = set()
    for rec in all_records:
        fieldnames.update(rec.keys())
    
    # Move some keys to front
    headers = ["Origen_Tabla", "Fecha_Creacion", "Airtable_ID"]
    for f in fieldnames:
        if f not in headers:
            headers.append(f)
            
    csv_file = "consolidado_pagos_airtable_19ene_10feb.csv"
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(all_records)
        
    print(f"Exported {len(all_records)} Airtable records to {csv_file}")

def inspect_postgres():
    print("\n--- Inspecting PostgreSQL Data ---")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    tables_to_inspect = {
        'error_logs': 'fecha_hora',
        'audit_logs': 'timestamp',
        'cash_payments': 'created_at',
        'payments': 'created_at'
    }
    
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    end_date = datetime.strptime('2026-02-11', '%Y-%m-%d')
    
    for t_name, date_col in tables_to_inspect.items():
        try:
            # Get columns dynamically
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{t_name}'")
            columns = [c[0] for c in cur.fetchall()]
            if not columns:
                continue
                
            cur.execute(f"SELECT * FROM {t_name} WHERE {date_col} >= %s AND {date_col} < %s", (start_date, end_date))
            rows = cur.fetchall()
            
            # Convert to dict
            result = []
            for row in rows:
                result.append(dict(zip(columns, row)))
                
            json_file = f"postgres_{t_name}_19ene_10feb.json"
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=4, default=serialize_custom)
                
            print(f"Exported {len(result)} {t_name} records to {json_file}")
            
        except Exception as e:
            print(f"Error inspecting {t_name}: {e}")
            
    conn.close()

if __name__ == '__main__':
    # extract_airtable() # Already done
    inspect_postgres()

