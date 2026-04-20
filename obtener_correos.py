import psycopg2
import os

# URL de tu base de datos en Render proporcionada en las memorias del proyecto
DATABASE_URL = "postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general"

try:
    print("Conectando a la base de datos...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    cur.execute("SELECT DISTINCT email FROM hr_payslip_requests WHERE email IS NOT NULL AND email != '';")
    correos = cur.fetchall()
    
    print("\n--- LISTA DE CORREOS ELECTRONICOS ---")
    if correos:
        for correo in correos:
            print(correo[0])
        print(f"\nTotal de correos únicos encontrados: {len(correos)}")
    else:
        print("No se encontraron correos electrónicos aún.")
        
    print("-------------------------------------")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error al conectar con la base de datos: {e}")
