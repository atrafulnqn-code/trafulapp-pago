import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute("SELECT fecha_hora, tipo, mensaje, stack_trace, detalles FROM error_logs WHERE tipo LIKE '%Recaudacion%' ORDER BY fecha_hora DESC LIMIT 5")
for row in cur.fetchall():
    print(f"[{row[0]}] {row[1]}: {row[2]}")
    if row[3]:
        print(f"Stack Trace:\n{row[3]}")
    if row[4]:
        print(f"Detalles:\n{row[4]}")
    print("-" * 50)
