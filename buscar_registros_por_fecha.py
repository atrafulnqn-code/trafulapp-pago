import os
import psycopg2
from pyairtable import Api
from datetime import datetime
from dotenv import load_dotenv

load_dotenv("backend/.env")

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
DATABASE_URL = "postgresql://base_datos_tablero_traful_pagina_general_user:bEKhclV6N026s8jNQcBDaH5sou0HZtmA@dpg-d64tk2i4d50c73eoksug-a.oregon-postgres.render.com/base_datos_tablero_traful_pagina_general"

start_date_str = '2026-01-19'
end_date_str = '2026-02-10'
start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
end_date = datetime.strptime('2026-02-11', '%Y-%m-%d') # exclusive end date

def check_postgres():
    print("=== POSTGRESQL ===")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Get all tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cur.fetchall()
        
        total_records_found = 0
        
        for table in tables:
            table_name = table[0]
            # Get columns to find date fields
            cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}'")
            columns = cur.fetchall()
            
            date_cols = [col[0] for col in columns if 'timestamp' in col[1] or 'date' in col[1]]
            
            # Use the first date column if available, else skip or maybe there's a created_at
            col_to_check = 'created_at' if 'created_at' in [c[0] for c in columns] else None
            if not col_to_check and date_cols:
                col_to_check = date_cols[0]
                
            if col_to_check:
                cur.execute(f"SELECT * FROM {table_name} WHERE {col_to_check} >= %s AND {col_to_check} < %s", (start_date, end_date))
                rows = cur.fetchall()
                if rows:
                    print(f"[{table_name}] Found {len(rows)} records between {start_date_str} and {end_date_str} based on {col_to_check}")
                    total_records_found += len(rows)
            else:
                pass
                
        print(f"Total Postgres Records: {total_records_found}")
        conn.close()
    except Exception as e:
        print(f"Error checking Postgres: {e}")

def check_airtable():
    print("\n=== AIRTABLE ===")
    try:
        api = Api(AIRTABLE_PAT)
        base = api.base(BASE_ID)
        tables = base.tables()
        
        total_records_found = 0
        formula = f"AND(IS_AFTER(CREATED_TIME(), '{start_date_str}'), IS_BEFORE(CREATED_TIME(), '2026-02-11'))"
        
        for table in tables:
            try:
                # First try fetching a few to see available fields, Airtable doesn't explicitly type-query like PSQL
                formula_custom_dates = []
                
                # We can just fetch with formula based on CREATED_TIME() first
                records_created = table.all(formula=formula)
                
                # Check for other date fields in the table
                date_fields = set()
                sample = table.all(max_records=5)
                for rec in sample:
                    for k, v in rec['fields'].items():
                        if isinstance(v, str) and len(v) >= 10 and (v.startswith('20') or v.startswith('19')):
                            try:
                                datetime.fromisoformat(v.replace('Z', '+00:00'))
                                date_fields.add(k)
                            except ValueError:
                                pass
                
                all_records_for_table = {r['id']: r for r in records_created}
                
                # Also query custom date fields
                for f in date_fields:
                    f_formula = f"AND(IS_AFTER({{{f}}}, '{start_date_str}'), IS_BEFORE({{{f}}}, '2026-02-11'))"
                    records_f = table.all(formula=f_formula)
                    for r in records_f:
                        all_records_for_table[r['id']] = r
                        
                if all_records_for_table:
                    print(f"[{table.name}] Found {len(all_records_for_table)} records between {start_date_str} and {end_date_str}")
                    total_records_found += len(all_records_for_table)
            except Exception as e:
                print(f"Error reading table {table.name}: {e}")
                
        print(f"Total Airtable Records: {total_records_found}")
    except Exception as e:
        print(f"Error checking Airtable: {e}")

if __name__ == '__main__':
    check_postgres()
    check_airtable()
