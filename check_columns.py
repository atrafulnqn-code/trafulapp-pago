import psycopg2
conn = psycopg2.connect('postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general')
cur = conn.cursor()

cur.execute("SELECT count(*) FROM cash_payments WHERE fecha_pago >= '2026-01-19' AND fecha_pago < '2026-02-11'")
print('cash_payment count by fecha_pago:', cur.fetchall())

cur.execute("SELECT count(*) FROM cash_payments WHERE created_at >= '2026-01-19' AND created_at < '2026-02-11'")
print('cash_payment count by created_at:', cur.fetchall())
