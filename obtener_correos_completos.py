import psycopg2

# URL de tu base de datos en Render 
DATABASE_URL = "postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general"

try:
    print("Conectando a la base de datos para obtener datos completos...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Obtenemos el correo y el ultimo termino de busqueda (DNI / Nombre) que usó cada empleado
    cur.execute("""
        SELECT email, MAX(search_query) 
        FROM hr_payslip_requests 
        WHERE email IS NOT NULL AND email != '' 
        GROUP BY email
        ORDER BY email;
    """)
    resultados = cur.fetchall()
    
    print("\n--- LISTA DE EMPLEADOS (EMAIL + DNI/NOMBRE) ---")
    if resultados:
        for email, busqueda in resultados:
            print(f"Búsqueda usada: {busqueda.ljust(30)} | Email: {email}")
        print(f"\nTotal único: {len(resultados)}")
    else:
        print("No se encontraron registros.")
        
    print("-----------------------------------------------")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error al conectar con la base de datos: {e}")
