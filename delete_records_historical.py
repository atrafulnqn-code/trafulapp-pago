import psycopg2
from dotenv import load_dotenv
import os

load_dotenv("backend/.env")
DATABASE_URL = "postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general"

def delete_records():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # User's list of records to delete (descriptions)
    # Plan_de_Pago: 1/18/2026, 9:49:01 PM, 11:03:40 PM, 11:10:32 PM
    # Historial de Pagos: 
    # 1/19/2026, 11:37:13 AM, $30000
    # 1/20/2026, 11:14:49 AM, $26160
    # 1/19/2026, 11:23:17 AM, $50
    # 1/20/2026, 9:44:46 AM, $51880
    # 1/19/2026, 6:30:32 PM, $172170
    # 1/19/2026, 8:59:50 AM, $99.99

    # Due to timezone differences and string formats, I'll search by monto AND tabla_origen first to be safe
    # then check dates if there's confusion.
    
    to_delete = [
        ("Plan_de_Pago", "2026-01-18"), # Searching partial date
        ("Historial de Pagos", "30000"),
        ("Historial de Pagos", "26160"),
        ("Historial de Pagos", "50"),
        ("Historial de Pagos", "51880"),
        ("Historial de Pagos", "172170"),
        ("Historial de Pagos", "99.99")
    ]
    
    total_deleted = 0
    
    # Specific Plan de Pago deletions from Jan 18th (the ones user mentioned)
    cur.execute("""
        DELETE FROM historico_19ene_10feb_2026 
        WHERE tabla_origen = 'Plan_de_Pago' 
        AND (fecha_registro LIKE '2026-01-18%' OR fecha_registro LIKE '2026-01-19%')
    """)
    total_deleted += cur.rowcount

    # Delete the Historial de Pagos ones
    montos = ["30000", "26160", "50", "51880", "172170", "99.99"]
    for m in montos:
        cur.execute("""
            DELETE FROM historico_19ene_10feb_2026 
            WHERE tabla_origen = 'Historial de Pagos' AND monto = %s
        """, (m,))
        total_deleted += cur.rowcount
        
    conn.commit()
    print(f"Eliminados {total_deleted} registros específicos.")
    cur.close()
    conn.close()

if __name__ == '__main__':
    delete_records()
