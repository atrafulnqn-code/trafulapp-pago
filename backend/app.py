import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyairtable import Api
from pyairtable.formulas import match
from dotenv import load_dotenv
import mercadopago

# --- DEPURACIÓN INICIAL ---
print("--- Iniciando aplicación Backend ---")
load_dotenv()
AIRTABLE_PAT_FROM_ENV = os.getenv("AIRTABLE_PAT")
print(f"AIRTABLE_PAT cargado desde el entorno: {'Sí' if AIRTABLE_PAT_FROM_ENV else 'No'}")
# --- FIN DEPURACIÓN ---


# --- CONFIGURACION ---
AIRTABLE_PAT = AIRTABLE_PAT_FROM_ENV
BASE_ID = "appoJs8XY2j2kwlYf"
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0"
DEUDAS_TABLE_ID = "tblHuS8CdqVqTsA3t"
PATENTE_TABLE_ID = "tbl3CMMwccWeo8XSG"
HISTORIAL_TABLE_ID = "tbl5p19Hv4cMk9NUS"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5176")
BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:5000")

MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
print(f"MERCADOPAGO_ACCESS_TOKEN cargado: {'Sí' if MERCADOPAGO_ACCESS_TOKEN else 'No'}")

sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
api = Api(AIRTABLE_PAT)
# --- FIN CONFIGURACION ---

app = Flask(__name__)
CORS(app)


# --- Endpoints ---
@app.route('/api/search/contributivo', methods=['GET'])
def search_contributivo():
    dni = request.args.get('dni')
    if not dni: return jsonify({"error": "El parámetro DNI es requerido"}), 400
    try:
        table = api.table(BASE_ID, CONTRIBUTIVOS_TABLE_ID)
        records = table.all(formula=match({"dni": dni}))
        return jsonify(records)
    except Exception as e:
        print(f"Error en search_contributivo: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search/patente', methods=['GET'])
def search_patente():
    dni = request.args.get('dni')
    if not dni: return jsonify({"error": "El parámetro DNI es requerido"}), 400
    try:
        table = api.table(BASE_ID, PATENTE_TABLE_ID)
        records = table.all(formula=match({"dni": dni}))
        return jsonify(records)
    except Exception as e:
        print(f"Error en search_patente: {e}")
        return jsonify({"error": str(e)}), 500

# ... (El resto del archivo sigue igual)
@app.route('/api/search/deuda', methods=['GET'])
def search_deuda():
    nombre = request.args.get('nombre')
    if not nombre: return jsonify({"error": "El parámetro 'nombre' es requerido"}), 400
    try:
        table = api.table(BASE_ID, DEUDAS_TABLE_ID)
        records = table.all(formula=f"SEARCH('{nombre.lower()}', LOWER({{nombre y apellido}}))")
        return jsonify(records)
    except Exception as e:
        print(f"Error en search_deuda: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/update/pago', methods=['POST'])
def update_pago():
    data = request.json
    record_id, table_id, fields = data.get('record_id'), data.get('table_id'), data.get('fields')
    if not all([record_id, table_id, fields]): return jsonify({"error": "Faltan parámetros"}), 400
    try:
        table = api.table(BASE_ID, table_id)
        updated_record = table.update(record_id, fields)
        return jsonify({"success": True, "updated_record": updated_record})
    except Exception as e:
        print(f"Error en update_pago: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/log/payment', methods=['POST'])
def log_payment():
    data = request.json
    estado, monto, detalle = data.get('estado'), data.get('monto'), data.get('detalle')
    if not all([estado, monto, detalle]): return jsonify({"error": "Faltan parámetros"}), 400
    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        fields_to_create = {'Estado': estado, 'Monto': float(monto), 'Detalle': detalle}
        historial_table.create(fields_to_create)
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error en log_payment: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/create_preference', methods=['POST'])
def create_preference():
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
            if "id" in preference:
                return jsonify({"preference_id": preference["id"]})
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
    app.run(debug=False, port=int(os.environ.get('PORT', 10000)))