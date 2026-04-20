import os
import csv
import json
from datetime import datetime, date
import psycopg2
from pyairtable import Api
import decimal
import uuid
from dotenv import load_dotenv

load_dotenv("backend/.env")

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
DATABASE_URL = "postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general"

start_date_str = '2026-01-19'
end_date_str = '2026-02-10'

def serialize_custom(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, decimal.Decimal):
        return float(obj)
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

def unify_data():
    all_combined_records = []

    # 1. FETCH AIRTABLE
    print("Conectando a Airtable...")
    api = Api(AIRTABLE_PAT)
    base = api.base(BASE_ID)
    
    airtable_tables = [
        ("Efectivo", "Cobro/Pago"),
        ("Historial de Pagos", "Cobro/Pago"),
        ("Comprobante_Recaudacion", "Cobro/Pago"),
        ("Comprobante_Patente", "Cobro/Pago"),
        ("Plan_de_Pago", "Cobro/Pago"),
        ("Application Logs", "Registro de Sistema"),
        ("Accesos_Personal", "Registro de Personal"),
        ("Contactos", "Contacto")
    ]
    
    formula = f"AND(IS_AFTER(CREATED_TIME(), '2026-01-18'), IS_BEFORE(CREATED_TIME(), '2026-02-11'))"
    
    for t_name, tipo_op in airtable_tables:
        try:
            table = base.table(t_name)
            records = table.all(formula=formula)
            for r in records:
                fields = r['fields']
                
                # Try to extract common data
                monto = fields.get('Total', fields.get('Monto', fields.get('monto_total', 0)))
                nombre = fields.get('Contribuyente', fields.get('Nombre', fields.get('Operador', '')))
                email = fields.get('Email', fields.get('email', ''))
                
                all_combined_records.append({
                    'Origen': 'Airtable',
                    'Tabla': t_name,
                    'Fecha_Registro': r['createdTime'],
                    'Tipo_Operacion': tipo_op,
                    'Monto': str(monto) if monto else '',
                    'Nombre_Responsable': str(nombre) if nombre else '',
                    'Email': str(email) if email else '',
                    'Datos_Adicionales': json.dumps(fields, default=serialize_custom, ensure_ascii=False)
                })
        except Exception as e:
            print(f"Airtable error en {t_name}: {e}")

    # 2. FETCH POSTGRESQL
    print("Conectando a PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    end_date = datetime.strptime('2026-02-11', '%Y-%m-%d')
    
    postgres_tables = [
        ('cash_payments', 'created_at', 'Cobro/Pago'),
        ('payments', 'created_at', 'Cobro/Pago'),
        ('error_logs', 'fecha_hora', 'Registro de Sistema'),
        ('audit_logs', 'timestamp', 'Registro de Sistema'),
        ('contacts', 'created_at', 'Contacto')
    ]
    
    for t_name, date_col, tipo_op in postgres_tables:
        try:
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{t_name}'")
            columns = [c[0] for c in cur.fetchall()]
            if not columns:
                continue
                
            # Fallback for audit_logs timestamp reserved keyword
            col_query = f'"{date_col}"' if t_name == 'audit_logs' else date_col
                
            query = f"SELECT * FROM {t_name} WHERE {col_query} >= %s AND {col_query} < %s"
            cur.execute(query, (start_date, end_date))
            rows = cur.fetchall()
            
            for row in rows:
                rec_dict = dict(zip(columns, row))
                
                # Extract common data
                monto = rec_dict.get('monto_total', rec_dict.get('amount', ''))
                nombre = rec_dict.get('nombre', rec_dict.get('operador', rec_dict.get('user_id', '')))
                email = rec_dict.get('email', rec_dict.get('payer_email', ''))
                fecha = rec_dict.get(date_col)
                
                all_combined_records.append({
                    'Origen': 'PostgreSQL',
                    'Tabla': t_name,
                    'Fecha_Registro': serialize_custom(fecha) if fecha else '',
                    'Tipo_Operacion': tipo_op,
                    'Monto': str(monto) if monto else '',
                    'Nombre_Responsable': str(nombre) if nombre else '',
                    'Email': str(email) if email else '',
                    'Datos_Adicionales': json.dumps(rec_dict, default=serialize_custom, ensure_ascii=False)
                })
        except Exception as e:
             # Just pass silently if table fails or missing 
             pass
            
    conn.close()

    # 3. WRITE CSV
    csv_file = "REPORTE_TOTAL_UNIFICADO_19ene_10feb.csv"
    headers = ['Origen', 'Tabla', 'Fecha_Registro', 'Tipo_Operacion', 'Monto', 'Nombre_Responsable', 'Email', 'Datos_Adicionales']
    
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(all_combined_records)
        
    print(f"¡Éxito! Se escribieron {len(all_combined_records)} registros unificados en {csv_file}")

if __name__ == '__main__':
    unify_data()
