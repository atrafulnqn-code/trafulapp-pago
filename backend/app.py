import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyairtable import Api
from pyairtable.formulas import match
from dotenv import load_dotenv
import mercadopago

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- Verificación de Variables de Entorno ---
print("--- Iniciando Verificación de Variables de Entorno ---")
AIRTABLE_PAT_FROM_ENV = os.getenv("AIRTABLE_PAT")
MERCADOPAGO_ACCESS_TOKEN_FROM_ENV = os.getenv("MERCADOPAGO_ACCESS_TOKEN")

if not AIRTABLE_PAT_FROM_ENV:
    print("FATAL: La variable de entorno AIRTABLE_PAT no está configurada.")
if not MERCADOPAGO_ACCESS_TOKEN_FROM_ENV:
    print("FATAL: La variable de entorno MERCADOPAGO_ACCESS_TOKEN no está configurada.")
print("--- Fin Verificación ---")
# ---------------------------------------------


# --- CONFIGURACION ---
BASE_ID = "appoJs8XY2j2kwlYf"
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0"
DEUDAS_TABLE_ID = "tblHuS8CdqVqTsA3t"
PATENTE_TABLE_ID = "tbl3CMMwccWeo8XSG"
HISTORIAL_TABLE_ID = "tbl5p19Hv4cMk9NUS"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5176")
BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:5000")

app = Flask(__name__)
CORS(app)

# Inicializar las SDKs solo si las claves existen
api = None
if AIRTABLE_PAT_FROM_ENV:
    api = Api(AIRTABLE_PAT_FROM_ENV)
    print("SDK de Airtable inicializada.")

sdk = None
if MERCADOPAGO_ACCESS_TOKEN_FROM_ENV:
    sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN_FROM_ENV)
    print("SDK de Mercado Pago inicializada.")
# --- FIN CONFIGURACION ---


# --- Endpoints ---
@app.route('/api/search/patente', methods=['GET'])
def search_patente():
    print("Recibida petición en /api/search/patente")
    if not api:
        print("Error en search_patente: La API de Airtable no está inicializada.")
        return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
        
    dni = request.args.get('dni')
    if not dni: return jsonify({"error": "El parámetro DNI es requerido"}), 400
    try:
        table = api.table(BASE_ID, PATENTE_TABLE_ID)
        records = table.all(formula=match({"dni": dni}))
        print(f"Búsqueda de patente para DNI {dni} exitosa. Encontrados {len(records)} registros.")
        return jsonify(records)
    except Exception as e:
        print(f"Error en search_patente: {e}")
        return jsonify({"error": str(e)}), 500

# El resto de endpoints...
@app.route('/api/search/contributivo', methods=['GET'])
def search_contributivo():
    print("Recibida petición en /api/search/contributivo")
    if not api: return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    dni = request.args.get('dni')
    if not dni: return jsonify({"error": "El parámetro DNI es requerido"}), 400
    try:
        table = api.table(BASE_ID, CONTRIBUTIVOS_TABLE_ID)
        records = table.all(formula=match({"dni": dni}))
        return jsonify(records)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/search/deuda', methods=['GET'])
def search_deuda():
    print("Recibida petición en /api/search/deuda")
    if not api: return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    nombre = request.args.get('nombre')
    if not nombre: return jsonify({"error": "El parámetro 'nombre' es requerido"}), 400
    try:
        table = api.table(BASE_ID, DEUDAS_TABLE_ID)
        records = table.all(formula=f"SEARCH('{nombre.lower()}', LOWER({{nombre y apellido}}))")
        return jsonify(records)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/update/pago', methods=['POST'])
def update_pago():
    print("Recibida petición en /api/update/pago")
    if not api: return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    data = request.json
    record_id, table_id, fields = data.get('record_id'), data.get('table_id'), data.get('fields')
    if not all([record_id, table_id, fields]): return jsonify({"error": "Faltan parámetros"}), 400
    try:
        table = api.table(BASE_ID, table_id)
        updated_record = table.update(record_id, fields)
        return jsonify({"success": True, "updated_record": updated_record})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/log/payment', methods=['POST'])
def log_payment():
    print("Recibida petición en /api/log/payment")
    if not api: return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    data = request.json
    estado, monto, detalle = data.get('estado'), data.get('monto'), data.get('detalle')
    if not all([estado, monto, detalle]): return jsonify({"error": "Faltan parámetros"}), 400
    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        fields_to_create = {'Estado': estado, 'Monto': float(monto), 'Detalle': detalle}
        historial_table.create(fields_to_create)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/create_preference', methods=['POST'])
def create_preference():
    print("Recibida petición en /api/create_preference")
    if not sdk:
        print("Error en create_preference: La SDK de Mercado Pago no está inicializada.")
        return jsonify({"error": "La configuración del servidor para Mercado Pago es incorrecta."}), 500
    data = request.json
    title, unit_price = data.get('title'), data.get('unit_price')
    if not all([title, unit_price]): return jsonify({"error": "Faltan parámetros"}), 400
    try:
        preference_data = {
            "items": [{"title": title, "quantity": 1, "unit_price": float(unit_price)}],
            "back_urls": {"success": FRONTEND_URL, "failure": FRONTEND_URL, "pending": FRONTEND_URL},
            "auto_return": "approved",
            "notification_url": f"{BACKEND_URL}/api/payment_webhook",
        }
        preference_response = sdk.preference().create(preference_data)
        if preference_response and preference_response.get("response"):
            preference = preference_response["response"]
            if "id" in preference: return jsonify({"preference_id": preference["id"]})
            else:
                error_message = preference.get('message', 'Error desconocido de MP.')
                print(f"Error de MP al crear preferencia: {error_message}")
                return jsonify({"error": error_message}), 500
        else:
            print(f"Respuesta inesperada de SDK de MP: {preference_response}")
            return jsonify({"error": "Respuesta inesperada de la SDK de MP."}), 500
    except Exception as e:
        print(f"Error en create_preference: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/payment_webhook', methods=['POST'])
def payment_webhook():
    data = request.json
    print("--- Webhook Recibido ---", data)
    return jsonify({"status": "received"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port, debug=False)
