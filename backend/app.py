import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyairtable import Api
from pyairtable.formulas import match
from dotenv import load_dotenv
import mercadopago

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACION ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
BASE_ID = "appoJs8XY2j2kwlYf"
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0"
DEUDAS_TABLE_ID = "tblHuS8CdqVqTsA3t"
PATENTE_TABLE_ID = "tbl3CMMwccWeo8XSG"
HISTORIAL_TABLE_ID = "tbl5p19Hv4cMk9NUS"

# Configuración de URLs para producción y desarrollo
# En Render, definirás FRONTEND_URL. Si no existe, usamos localhost.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5176")
# En Render, la URL del backend es automática. Para webhooks, necesitarás esta URL.
BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:5000")


# Configurar SDK de Mercado Pago
MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
# --- FIN CONFIGURACION ---

app = Flask(__name__)
CORS(app)

api = Api(AIRTABLE_PAT)

# --- Endpoints de Búsqueda ---
# ... (los endpoints de búsqueda no cambian)

# --- Endpoints de Mercado Pago ---
@app.route('/api/create_preference', methods=['POST'])
def create_preference():
    data = request.json
    title = data.get('title')
    unit_price = data.get('unit_price')

    if not all([title, unit_price]):
        return jsonify({"error": "Faltan parámetros"}), 400

    try:
        preference_data = {
            "items": [
                {
                    "title": title,
                    "quantity": 1,
                    "unit_price": float(unit_price)
                }
            ],
            "back_urls": {
                "success": FRONTEND_URL,
                "failure": FRONTEND_URL,
                "pending": FRONTEND_URL,
            },
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
                return jsonify({"error": error_message}), 500
        else:
            return jsonify({"error": "Respuesta inesperada de la SDK de MP."}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ... (El resto de endpoints no necesita cambios inmediatos)

# El resto del código de app.py sigue aquí...
# Por brevedad, no lo repito todo, pero la sobreescritura del archivo lo contendrá.
@app.route('/api/search/contributivo', methods=['GET'])
def search_contributivo():
    dni = request.args.get('dni')
    if not dni: return jsonify({"error": "El parámetro DNI es requerido"}), 400
    try:
        table = api.table(BASE_ID, CONTRIBUTIVOS_TABLE_ID)
        records = table.all(formula=match({"dni": dni}))
        return jsonify(records)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/search/patente', methods=['GET'])
def search_patente():
    dni = request.args.get('dni')
    if not dni: return jsonify({"error": "El parámetro DNI es requerido"}), 400
    try:
        table = api.table(BASE_ID, PATENTE_TABLE_ID)
        records = table.all(formula=match({"dni": dni}))
        return jsonify(records)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/search/deuda', methods=['GET'])
def search_deuda():
    nombre = request.args.get('nombre')
    if not nombre: return jsonify({"error": "El parámetro 'nombre' es requerido"}), 400
    try:
        table = api.table(BASE_ID, DEUDAS_TABLE_ID)
        records = table.all(formula=f"SEARCH('{nombre.lower()}', LOWER({{nombre y apellido}}))")
        return jsonify(records)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/update/pago', methods=['POST'])
def update_pago():
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
    data = request.json
    estado, monto, detalle = data.get('estado'), data.get('monto'), data.get('detalle')
    if not all([estado, monto, detalle]): return jsonify({"error": "Faltan parámetros"}), 400
    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        fields_to_create = {'Estado': estado, 'Monto': float(monto), 'Detalle': detalle}
        historial_table.create(fields_to_create)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/payment_webhook', methods=['POST'])
def payment_webhook():
    data = request.json
    print("--- Webhook Recibido ---", data) # Para depuración en Render
    # Aquí irá la lógica para actualizar Airtable basado en la notificación
    return jsonify({"status": "received"}), 200

if __name__ == '__main__':
    app.run(debug=False, port=int(os.environ.get('PORT', 5000)))

