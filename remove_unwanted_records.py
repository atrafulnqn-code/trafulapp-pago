import csv
import psycopg2
from dotenv import load_dotenv

load_dotenv("backend/.env")
DATABASE_URL = "postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general"

tables_to_remove = [
    'payments', 
    'cash_payments', 
    'Contactos', 
    'contacts', 
    'Accesos_Personal', 
    'Application Logs'
]

def clean_database():
    print("Limpiando base de datos PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    placeholders = ','.join(['%s'] * len(tables_to_remove))
    query = f"DELETE FROM historico_19ene_10feb_2026 WHERE tabla_origen IN ({placeholders})"
    
    cur.execute(query, tuple(tables_to_remove))
    deleted_rows = cur.rowcount
    conn.commit()
    
    cur.close()
    conn.close()
    print(f"PostgreSQL: Se eliminaron {deleted_rows} registros.")

def clean_csv():
    print("Limpiando archivo CSV...")
    csv_file = "REPORTE_TOTAL_UNIFICADO_19ene_10feb.csv"
    temp_file = "REPORTE_TEMP.csv"
    
    deleted_count = 0
    kept_count = 0
    
    with open(csv_file, 'r', encoding='utf-8') as fin, open(temp_file, 'w', newline='', encoding='utf-8') as fout:
        reader = csv.DictReader(fin)
        writer = csv.DictWriter(fout, fieldnames=reader.fieldnames)
        writer.writeheader()
        
        for row in reader:
            if row['Tabla'] in tables_to_remove:
                deleted_count += 1
            else:
                writer.writerow(row)
                kept_count += 1
                
    import os
    os.replace(temp_file, csv_file)
    print(f"CSV: Se eliminaron {deleted_count} registros. Quedaron {kept_count}.")

if __name__ == '__main__':
    clean_database()
    clean_csv()
