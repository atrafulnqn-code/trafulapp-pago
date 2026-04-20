import os
import csv
import psycopg2
from pyairtable import Api
from dotenv import load_dotenv

load_dotenv("backend/.env")
DATABASE_URL = "postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general"

def load_csv_to_postgres():
    print("Conectando a PostgreSQL para crear tabla y cargar CSV...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    table_name = "historico_19ene_10feb_2026"
    
    # 1. Eliminar la tabla si existe para ser idempotente
    cur.execute(f"DROP TABLE IF EXISTS {table_name}")
    
    # 2. Crear tabla
    create_table_query = f"""
    CREATE TABLE {table_name} (
        id SERIAL PRIMARY KEY,
        origen VARCHAR(50),
        tabla_origen VARCHAR(100),
        fecha_registro VARCHAR(100),
        tipo_operacion VARCHAR(100),
        monto VARCHAR(100),
        nombre_responsable VARCHAR(255),
        email VARCHAR(255),
        datos_adicionales JSONB
    );
    """
    cur.execute(create_table_query)
    
    # 3. Leer y cargar CSV
    csv_file = "REPORTE_TOTAL_UNIFICADO_19ene_10feb.csv"
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        insert_query = f"""
        INSERT INTO {table_name} (
            origen, tabla_origen, fecha_registro, tipo_operacion, monto, nombre_responsable, email, datos_adicionales
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        count = 0
        for row in reader:
            cur.execute(insert_query, (
                row['Origen'],
                row['Tabla'],
                row['Fecha_Registro'],
                row['Tipo_Operacion'],
                row['Monto'],
                row['Nombre_Responsable'],
                row['Email'],
                row['Datos_Adicionales']
            ))
            count += 1
            
    conn.commit()
    cur.close()
    conn.close()
    print(f"Éxito: Se cargaron {count} registros en la tabla {table_name}.")

if __name__ == '__main__':
    load_csv_to_postgres()
