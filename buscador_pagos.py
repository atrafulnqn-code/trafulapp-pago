import os
from pyairtable import Api
from pyairtable.formulas import match

import os
from pyairtable import Api
from pyairtable.formulas import match
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACION ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0"
DEUDAS_TABLE_ID = "tblHuS8CdqVqTsA3t"
PATENTE_TABLE_ID = "tbl3CMMwccWeo8XSG"
# --- FIN CONFIGURACION ---

def main():
    """
    Función principal para el buscador de pagos.
    """
    api = Api(AIRTABLE_PAT)
    
    print("Bienvenido al sistema de búsqueda de pagos.")
    
    # Bucle principal del menú
    while True:
        print("\nPor favor, elija una opción:")
        print("1. Pagar Contributivos (Retributivos)")
        print("2. Pagar Deudas")
        print("3. Pagar Patente")
        print("4. Salir")
        
        choice = input("Ingrese el número de su elección: ")
        
        if choice == '1':
            buscar_por_dni_contributivos(api)
        elif choice == '2':
            print("Funcionalidad para pagar deudas aún no implementada.")
        elif choice == '3':
            print("Funcionalidad para pagar patente aún no implementada.")
        elif choice == '4':
            print("Gracias por usar el sistema. ¡Hasta luego!")
            break
        else:
            print("Opción no válida. Por favor, intente de nuevo.")

def buscar_deuda_por_nombre(api, nombre):
    """
    Busca deudas en la tabla de Deudas por nombre.
    """
    print(f"Buscando deudas para: {nombre}...")
    try:
        deudas_table = api.table(BASE_ID, DEUDAS_TABLE_ID)
        # La búsqueda por nombre puede ser imprecisa. Usamos una fórmula que busca el nombre.
        # Airtable no soporta 'contains' o 'like' de forma nativa en la API de manera simple.
        # FIND() es sensible a mayúsculas. SEARCH() no lo es. Usaremos SEARCH().
        formula = f"SEARCH('{nombre.lower()}', LOWER({{nombre y apellido}}))"
        records = deudas_table.all(formula=formula)
        
        if records:
            print("--- Deuda Encontrada ---")
            for record in records:
                concepto = record['fields'].get('deuda en concepto de', 'N/A')
                monto = record['fields'].get('monto total deuda', '0.00')
                print(f"  Concepto: {concepto}, Monto: ${monto}")
            print("------------------------")
        else:
            print("No se encontraron deudas asociadas a este contribuyente.")

    except Exception as e:
        print(f"Ocurrió un error al buscar deudas: {e}")

def buscar_por_dni_contributivos(api):
    """
    Busca en la tabla de Contributivos por DNI y guía al usuario en el proceso de pago.
    """
    dni = input("\nIngrese el DNI del contribuyente a buscar: ").strip()
    if not dni:
        print("El DNI no puede estar vacío.")
        return

    print(f"Buscando lotes para el DNI: {dni}...")
    
    try:
        contributivos_table = api.table(BASE_ID, CONTRIBUTIVOS_TABLE_ID)
        formula = match({"dni": dni})
        records = contributivos_table.all(formula=formula)

        if not records:
            print(f"No se encontraron registros para el DNI {dni}.")
            return

        print(f"Se encontraron {len(records)} lote(s) para el DNI {dni}:")
        for i, record in enumerate(records):
            lote = record['fields'].get('lote', 'N/A')
            nomenclatura = record['fields'].get('nomenclatura catastral', 'N/A')
            print(f"  {i + 1}. Lote: {lote} (Nomenclatura: {nomenclatura})")
        
        # Seleccionar lote
        if len(records) > 1:
            lote_choice = int(input("Por favor, seleccione el número del lote que desea consultar: ")) - 1
            if not 0 <= lote_choice < len(records):
                print("Selección no válida.")
                return
            selected_record = records[lote_choice]
        else:
            selected_record = records[0]

        lote_seleccionado = selected_record['fields'].get('lote', 'N/A')
        nomenclatura_seleccionada = selected_record['fields'].get('nomenclatura catastral', 'N/A')
        contribuyente_nombre = selected_record['fields'].get('contribuyente', '').strip()
        
        print(f"\nHa seleccionado el Lote: {lote_seleccionado} con Nomenclatura: {nomenclatura_seleccionada}")

        # Buscar y mostrar deuda
        if contribuyente_nombre:
            buscar_deuda_por_nombre(api, contribuyente_nombre)

        # Simular selección de mes y pago
        print("\nPuede elegir pagar un mes específico o saldar una deuda existente.")
        mes = input("Ingrese el mes que desea pagar (e.g., 'Enero', 'Febrero') o escriba 'deuda' para pagar el total: ")
        
        if mes.lower() == 'deuda':
             print(f"\nSe procedería al pago de la deuda para el lote {lote_seleccionado}.")
        else:
            print(f"\nSe procedería al pago de '{mes}' para el lote {lote_seleccionado}.")
        
        print("--- PRÓXIMAMENTE: Integración con Mercado Pago ---")

    except Exception as e:
        print(f"Ocurrió un error al buscar en Airtable: {e}")


if __name__ == "__main__":
    main()
