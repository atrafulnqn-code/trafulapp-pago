import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyairtable import Api
from pyairtable.formulas import match
from dotenv import load_dotenv
import mercadopago
import json

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


# --- Funciones Auxiliares ---
def log_payment_to_airtable(estado, monto, detalle):
    if not api: return {"error": "API de Airtable no inicializada."}, 500
    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        fields_to_create = {'Estado': estado, 'Monto': float(monto), 'Detalle': detalle}
        historial_table.create(fields_to_create)
        return {"success": True}
    except Exception as e:
        print(f"Error al registrar pago en historial: {e}")
        return {"error": str(e)}, 500

def update_airtable_records(table_id, record_id, fields_to_update):
    if not api: return {"error": "API de Airtable no inicializada."}, 500
    try:
        table = api.table(BASE_ID, table_id)
        updated_record = table.update(record_id, fields_to_update)
        return {"success": True, "updated_record": updated_record}
    except Exception as e:
        print(f"Error al actualizar Airtable: {e}")
        return {"error": str(e)}, 500


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

@app.route('/api/create_preference', methods=['POST'])
def create_preference():
    print("Recibida petición en /api/create_preference")
    if not sdk:
        print("Error en create_preference: La SDK de Mercado Pago no está inicializada.")
        return jsonify({"error": "La configuración del servidor para Mercado Pago es incorrecta."}), 500
    
    data = request.json
    title = data.get('title')
    unit_price = data.get('unit_price')
    items_to_pay = data.get('items_to_pay') # Información que el frontend envía sobre qué se va a pagar

    if not all([title, unit_price, items_to_pay]):
        return jsonify({"error": "Faltan parámetros: se requiere title, unit_price e items_to_pay"}), 400

    try:
        # El external_reference guarda el contexto del pago para usarlo en el webhook
        external_reference = json.dumps(items_to_pay)

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
            "external_reference": external_reference # Pasamos el contexto aquí
        }
        
        preference_response = sdk.preference().create(preference_data)
        
        if preference_response and preference_response.get("response"):
            preference = preference_response["response"]
            if "id" in preference:
                print(f"Preferencia creada con ID: {preference['id']}")
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
    print("--- Webhook Recibido ---")
    data = request.json
    print(f"Datos del Webhook: {data}")

    # Solo procesamos notificaciones de tipo 'payment'
    if data.get("topic") == "payment" or data.get("type") == "payment":
        payment_id = data.get("id") or data.get("data", {}).get("id") or data.get("resource")
        
        if not payment_id:
            print("Webhook: No se pudo extraer el ID de pago de la notificación.")
            return jsonify({"error": "No payment ID found"}), 400
        
        print(f"Webhook de pago recibido para ID: {payment_id}")

        if not sdk:
            print("Error: SDK de Mercado Pago no inicializada en Webhook.")
            return jsonify({"error": "Servidor sin MP SDK"}), 500

        try:
            payment_info_response = sdk.payment().get(payment_id)
            print(f"Respuesta de sdk.payment().get({payment_id}): {payment_info_response}")

            if not payment_info_response or not payment_info_response.get("response"):
                print(f"Error: No se obtuvieron detalles del pago para {payment_id}")
                return jsonify({"error": "No se obtuvieron detalles del pago"}), 500
            
            payment_info = payment_info_response["response"]
            
            payment_status = payment_info["status"]
            external_reference_str = payment_info.get("external_reference")
            monto_pagado = payment_info["transaction_amount"]

            if not external_reference_str:
                print("Error: external_reference no encontrado en el pago.")
                log_payment_to_airtable("Fallido", monto_pagado, f"Error: external_reference no encontrado para pago {payment_id}.")
                return jsonify({"error": "external_reference no encontrado"}), 500

            items_context = json.loads(external_reference_str) # Recuperamos el contexto del pago
            
            pago_estado = "Fallido"
            if payment_status == "approved":
                pago_estado = "Exitoso"
                print(f"Pago {payment_id} APROBADO. Procesando actualizaciones...")

                # Actualizar la tabla de origen (Contributivos, Patente o Deudas)
                record_id_to_update = items_context["record_id"]
                table_id_to_update = ""
                fields_to_update_origin = {}
                detalle_pago_historial = ""

                # --- Lógica de Contributivos ---
                if items_context["item_type"] == "lote":
                    table_id_to_update = CONTRIBUTIVOS_TABLE_ID
                    detalle_pago_historial = f"Contributivos DNI {items_context['dni']}, Lote {items_context['lote']}: "
                    if items_context["deuda"]:
                        fields_to_update_origin["deuda"] = '0'
                        detalle_pago_historial += f"Deuda (${items_context['deuda_monto']}), "
                    for mes_nombre, mes_seleccionado in items_context["meses"].items():
                        if mes_seleccionado:
                            fields_to_update_origin[mes_nombre.lower()] = '0'
                            detalle_pago_historial += f"{mes_nombre} (${items_context['meses_montos'][mes_nombre]}), "

                # --- Lógica de Patente ---
                elif items_context["item_type"] == "vehiculo":
                    table_id_to_update = PATENTE_TABLE_ID
                    detalle_pago_historial = f"Patente DNI {items_context['dni']}, Patente {items_context['patente']}: "
                    if items_context["deuda"]:
                        fields_to_update_origin["Deuda patente"] = '0' # Ojo con el nombre del campo!
                        detalle_pago_historial += f"Deuda Patente (${items_context['deuda_monto']}), "
                    for mes_nombre, mes_seleccionado in items_context["meses"].items():
                        if mes_seleccionado:
                            fields_to_update_origin[mes_nombre.lower()] = '0'
                            detalle_pago_historial += f"{mes_nombre} (${items_context['meses_montos'][mes_nombre]}), "
                
                # --- Lógica de Deudas (si se implementa en el futuro) ---
                elif items_context["item_type"] == "deuda_general":
                    table_id_to_update = DEUDAS_TABLE_ID
                    detalle_pago_historial = f"Deuda General DNI {items_context['dni']}, Nombre {items_context['nombre_contribuyente']}: "
                    fields_to_update_origin["deuda en concepto de"] = "Pagado"
                    detalle_pago_historial += f"Monto (${items_context['monto_total']}), "


                # Eliminar la coma final si existe
                if detalle_pago_historial.endswith(", "):
                    detalle_pago_historial = detalle_pago_historial[:-2]


                if fields_to_update_origin and table_id_to_update and record_id_to_update:
                    print(f"Actualizando Airtable (Tabla: {table_id_to_update}, Record ID: {record_id_to_update}) con: {fields_to_update_origin}")
                    update_airtable_records(table_id_to_update, record_id_to_update, fields_to_update_origin)
                else:
                    print("Error: No se pudo determinar qué actualizar en Airtable.")
                
            else: # Pago no aprobado
                print(f"Pago {payment_id} {payment_status}. No se realizan actualizaciones de origen.")
                detalle_pago_historial = f"Intento de pago fallido para {items_context.get('item_type', 'N/A')} DNI {items_context.get('dni', 'N/A')}. Estado: {payment_status}"
            
            # Registrar en el historial de pagos (siempre, exitoso o fallido)
            print(f"Registrando en historial: {pago_estado}, Monto: {monto_pagado}, Detalle: {detalle_pago_historial}")
            log_payment_to_airtable(pago_estado, monto_pagado, detalle_pago_historial)

        except Exception as e:
            print(f"Error procesando webhook de pago {payment_id}: {e}")
            # Considerar registrar este error en el historial como un pago fallido con un detalle de error técnico
            # Aquí podríamos intentar loggear el error también en Airtable o algún servicio de monitoreo
            return jsonify({"error": str(e)}), 500

    # Esto es para otros topics de webhook que Mercado Pago pueda enviar
    else:
        print(f"Webhook recibido con topic desconocido: {data.get('topic')}")

    return jsonify({"status": "received"}), 200

# Endpoint para la actualización de pagos (ya no se usa directamente desde el frontend para pagos con MP)
@app.route('/api/update/pago', methods=['POST'])
def update_pago():
    print("Recibida petición en /api/update/pago (este endpoint no debería usarse para pagos con MP).")
    return jsonify({"error": "Endpoint no diseñado para pagos con MP."}), 400


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port, debug=False)
