import os
from flask import Flask, request, jsonify, send_file, redirect
from flask_cors import CORS
from pyairtable import Api
from pyairtable.formulas import match
from dotenv import load_dotenv
import mercadopago
import json
from weasyprint import HTML
import io
import resend
from datetime import datetime

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# --- Verificación de Variables de Entorno ---
print("--- Iniciando Verificación de Variables de Entorno ---")
AIRTABLE_PAT_FROM_ENV = os.getenv("AIRTABLE_PAT")
MERCADOPAGO_ACCESS_TOKEN_FROM_ENV = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
RESEND_API_KEY_FROM_ENV = os.getenv("RESEND_API_KEY")

if not AIRTABLE_PAT_FROM_ENV: print("FATAL: La variable de entorno AIRTABLE_PAT no está configurada.")
if not MERCADOPAGO_ACCESS_TOKEN_FROM_ENV: print("FATAL: La variable de entorno MERCADOPAGO_ACCESS_TOKEN no está configurada.")
if not RESEND_API_KEY_FROM_ENV: print("ADVERTENCIA: La variable de entorno RESEND_API_KEY no está configurada. El envío de emails no funcionará.")
print("--- Fin Verificación ---")
# ---------------------------------------------

# --- CONFIGURACION ---
BASE_ID = "appoJs8XY2j2kwlYf"
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0"
DEUDAS_TABLE_ID = "tblHuS8CdqVqTsA3t"
PATENTE_TABLE_ID = "tbl3CMMwccWeo8XSG"
HISTORIAL_TABLE_ID = "tbl5p19Hv4cMk9NUS"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5176")
BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:10000") # Render usa 10000 por defecto

app = Flask(__name__)
CORS(app)

# Inicializar las SDKs de forma segura
api = None
try:
    if AIRTABLE_PAT_FROM_ENV:
        api = Api(AIRTABLE_PAT_FROM_ENV)
        print("SDK de Airtable inicializada con éxito.")
    else:
        print("ADVERTENCIA: AIRTABLE_PAT no disponible, SDK de Airtable NO inicializada.")
except Exception as e:
    print(f"ERROR: Falló la inicialización de la SDK de Airtable: {e}")
    api = None

sdk = None
try:
    if MERCADOPAGO_ACCESS_TOKEN_FROM_ENV:
        sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN_FROM_ENV)
        print("SDK de Mercado Pago inicializada con éxito.")
    else:
        print("ADVERTENCIA: MERCADOPAGO_ACCESS_TOKEN no disponible, SDK de Mercado Pago NO inicializada.")
except Exception as e:
    print(f"ERROR: Falló la inicialización de la SDK de Mercado Pago: {e}")
    sdk = None

try:
    if RESEND_API_KEY_FROM_ENV:
        resend.api_key = RESEND_API_KEY_FROM_ENV
        print("API Key de Resend configurada.")
    else:
        print("ADVERTENCIA: RESEND_API_KEY no disponible, Resend NO configurado.")
except Exception as e:
    print(f"ERROR: Falló la configuración de Resend: {e}")


# --- Funciones Auxiliares de PDF y Email ---
def create_receipt_pdf(payment_details):
    try:
        with open('backend/comprobante_template.html', 'r', encoding='utf-8') as f:
            html_template = f.read()

        items_html = ""
        for item in payment_details["items"]:
            items_html += f"<tr><td>{item['description']}</td><td style='text-align: right;'>${item['amount']}</td></tr>"

        html_filled = html_template.replace("{{FECHA_PAGO}}", datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
        html_filled = html_filled.replace("{{ESTADO_PAGO}}", payment_details["status"])
        html_filled = html_filled.replace("{{ID_PAGO_MP}}", str(payment_details["mp_payment_id"]))
        html_filled = html_filled.replace("{{ITEMS_PAGADOS}}", items_html)
        html_filled = html_filled.replace("{{MONTO_TOTAL}}", str(payment_details["total_amount"]))
        
        pdf_file = io.BytesIO()
        HTML(string=html_filled).write_pdf(pdf_file)
        pdf_file.seek(0)
        return pdf_file
    except Exception as e:
        print(f"Error generando PDF: {e}")
        return None

def upload_pdf_to_airtable(record_id, pdf_file, filename):
    if not api: 
        print("ERROR: API de Airtable no inicializada para subir PDF.")
        return False
    try:
        # Aquí se debería usar la API HTTP de Airtable para subir el archivo.
        # Por simplicidad y limitaciones de pyairtable, solo actualizamos un campo de texto.
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        historial_table.update(record_id, {"Comprobante_Status": f"Generado: {filename}"})
        print(f"Marcado de comprobante en Airtable realizado para record {record_id} (simulado).")
        return True
    except Exception as e:
        print(f"ERROR: Falló la subida/marcado de PDF a Airtable: {e}")
        return False


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
        print(f"ERROR en search_patente: {e}")
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
        print(f"Búsqueda de contributivo para DNI {dni} exitosa. Encontrados {len(records)} registros.")
        return jsonify(records)
    except Exception as e:
        print(f"ERROR en search_contributivo: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search/deuda', methods=['GET'])
def search_deuda():
    print("Recibida petición en /api/search/deuda")
    if not api: return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    nombre = request.args.get('nombre')
    if not nombre: return jsonify({"error": "El parámetro 'nombre' es requerido"}), 400
    try:
        table = api.table(BASE_ID, DEUDAS_TABLE_ID)
        records = table.all(formula=f"SEARCH('{nombre.lower()}', LOWER({{nombre y apellido}}))")
        print(f"Búsqueda de deuda para {nombre} exitosa. Encontrados {len(records)} registros.")
        return jsonify(records)
    except Exception as e:
        print(f"ERROR en search_deuda: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/create_preference', methods=['POST'])
def create_preference():
    print("Recibida petición en /api/create_preference")
    if not sdk:
        print("Error en create_preference: La SDK de Mercado Pago no está inicializada.")
        return jsonify({"error": "La configuración del servidor para Mercado Pago es incorrecta."}), 500
    
    data = request.json
    title = data.get('title')
    unit_price = data.get('unit_price')
    items_to_pay = data.get('items_to_pay')

    if not all([title, unit_price, items_to_pay]):
        return jsonify({"error": "Faltan parámetros: se requiere title, unit_price e items_to_pay"}), 400

    try:
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
            "external_reference": external_reference
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
        print(f"ERROR en create_preference: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/payment_webhook', methods=['POST'])
def payment_webhook():
    print("--- Webhook Recibido ---")
    data = request.json
    print(f"Datos del Webhook: {data}")

    if data.get("topic") == "payment" or data.get("type") == "payment":
        payment_id = data.get("id") or data.get("data", {}).get("id") or data.get("resource")
        
        if not payment_id:
            print("ERROR: Webhook: No se pudo extraer el ID de pago de la notificación.")
            return jsonify({"error": "No payment ID found"}), 400
        
        print(f"Webhook de pago recibido para ID: {payment_id}")

        if not sdk:
            print("ERROR: SDK de Mercado Pago no inicializada en Webhook.")
            return jsonify({"error": "Servidor sin MP SDK"}), 500

        try:
            payment_info_response = sdk.payment().get(payment_id)
            print(f"Respuesta de sdk.payment().get({payment_id}): {payment_info_response}")

            if not payment_info_response or not payment_info_response.get("response"):
                print(f"ERROR: No se obtuvieron detalles del pago para {payment_id}")
                return jsonify({"error": "No se obtuvieron detalles del pago"}), 500
            
            payment_info = payment_info_response["response"]
            
            payment_status = payment_info["status"]
            external_reference_str = payment_info.get("external_reference")
            monto_pagado = payment_info["transaction_amount"]

            if not external_reference_str:
                print("ERROR: external_reference no encontrado en el pago.")
                log_payment_to_airtable("Fallido", monto_pagado, f"Error: external_reference no encontrado para pago {payment_id}.")
                return jsonify({"error": "external_reference no encontrado"}), 500

            items_context = json.loads(external_reference_str) 
            
            pago_estado = "Fallido"
            if payment_status == "approved":
                pago_estado = "Exitoso"
                print(f"Pago {payment_id} APROBADO. Procesando actualizaciones...")

                # Actualizar la tabla de origen (Contributivos, Patente o Deudas)
                record_id_to_update = items_context["record_id"]
                table_id_to_update = ""
                fields_to_update_origin = {}
                detalle_pago_historial = ""
                items_for_pdf = []

                if items_context["item_type"] == "lote":
                    table_id_to_update = CONTRIBUTIVOS_TABLE_ID
                    detalle_pago_historial = f"Contributivos DNI {items_context['dni']}, Lote {items_context['lote']}: "
                    if items_context["deuda"]:
                        fields_to_update_origin["deuda"] = '0'
                        items_for_pdf.append({"description": f"Deuda Lote {items_context['lote']}", "amount": items_context['deuda_monto']})
                    for mes_nombre, mes_seleccionado in items_context["meses"].items():
                        if mes_seleccionado:
                            fields_to_update_origin[mes_nombre.lower()] = '0'
                            items_for_pdf.append({"description": mes_nombre, "amount": items_context['meses_montos'][mes_nombre]})

                elif items_context["item_type"] == "vehiculo":
                    table_id_to_update = PATENTE_TABLE_ID
                    detalle_pago_historial = f"Patente DNI {items_context['dni']}, Patente {items_context['patente']}: "
                    if items_context["deuda"]:
                        fields_to_update_origin["Deuda patente"] = '0'
                        items_for_pdf.append({"description": f"Deuda Patente {items_context['patente']}", "amount": items_context['deuda_monto']})
                    for mes_nombre, mes_seleccionado in items_context["meses"].items():
                        if mes_seleccionado:
                            fields_to_update_origin[mes_nombre.lower()] = '0'
                            items_for_pdf.append({"description": mes_nombre, "amount": items_context['meses_montos'][mes_nombre]})
                
                if fields_to_update_origin and table_id_to_update and record_id_to_update:
                    print(f"Actualizando Airtable (Tabla: {table_id_to_update}, Record ID: {record_id_to_update}) con: {fields_to_update_origin}")
                    update_airtable_records(table_id_to_update, record_id_to_update, fields_to_update_origin)
                else:
                    print("ADVERTENCIA: No se pudo determinar qué actualizar en Airtable o no había campos para actualizar.")
                
            else: # Pago no aprobado
                print(f"Pago {payment_id} {payment_status}. No se realizan actualizaciones de origen.")
                detalle_pago_historial = f"Intento de pago fallido para {items_context.get('item_type', 'N/A')} DNI {items_context.get('dni', 'N/A')}. Estado: {payment_status}"
            
            # Registrar en el historial de pagos (siempre, exitoso o fallido)
            historial_record_data = {
                'Estado': pago_estado, 
                'Monto': monto_pagado, 
                'Detalle': detalle_pago_historial if detalle_pago_historial else f"Pago {payment_id} ({pago_estado})",
                'MP_Payment_ID': payment_id # Guardamos el ID de pago de MP
            }
            historial_record = api.table(BASE_ID, HISTORIAL_TABLE_ID).create(historial_record_data)
            print(f"Historial de pago registrado con ID: {historial_record['id']}")


            # Generar y subir PDF si el pago fue exitoso
            if payment_status == "approved" and historial_record and items_for_pdf:
                pdf_details = {
                    "FECHA_PAGO": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                    "ESTADO_PAGO": "Aprobado",
                    "ID_PAGO_MP": payment_id,
                    "items": items_for_pdf,
                    "MONTO_TOTAL": monto_pagado
                }
                pdf_file_content = create_receipt_pdf(pdf_details)
                if pdf_file_content:
                    filename = f"comprobante_{payment_id}.pdf"
                    # Ahora, para subir a Airtable (usando requests directamente)
                    # Esta parte no está implementada aquí.
                    # Por ahora, solo se marcará como "Generado"
                    update_airtable_records(historial_record['id'], {"Comprobante_Status": f"Generado: {filename}"})
                    print(f"Comprobante PDF generado y marcado en historial para {historial_record['id']}")
            
            # Devolver el historialRecordId para que el frontend lo use
            return jsonify({"status": "received", "historialRecordId": historial_record['id']}), 200

        except Exception as e:
            print(f"ERROR procesando webhook de pago {payment_id}: {e}")
            return jsonify({"error": str(e)}), 500

    else:
        print(f"Webhook recibido con topic desconocido: {data.get('topic') or data.get('type')}")

    return jsonify({"status": "received"}), 200


@app.route('/api/receipt/<historial_record_id>', methods=['GET'])
def get_receipt(historial_record_id):
    if not api: return "Error: API de Airtable no inicializada.", 500
    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        record = historial_table.get(historial_record_id)
        
        # Aquí deberíamos obtener el archivo PDF de Airtable o generarlo si no existe
        # Por ahora, como no subimos el PDF real a Airtable, lo generaremos on-demand
        # Requerirá el contexto del pago (items, montos) que deberíamos guardar en el historial
        
        # Para esta implementación, vamos a simular la generación al vuelo
        # Necesitamos el contexto del pago. Asumamos que está en el campo 'Detalle'
        # Esto es un placeholder, en una app real guardarías los detalles del PDF en Airtable
        payment_details_from_history = {
            "FECHA_PAGO": record['fields'].get('Timestamp', datetime.now().strftime("%d/%m/%Y %H:%M:%S")),
            "ESTADO_PAGO": record['fields'].get('Estado', 'Desconocido'),
            "ID_PAGO_MP": record['fields'].get('MP_Payment_ID', 'N/A'),
            "items": [{"description": "Detalle no disponible", "amount": record['fields'].get('Monto', 0)}], # Placeholder
            "MONTO_TOTAL": record['fields'].get('Monto', 0)
        }
        
        pdf_file = create_receipt_pdf(payment_details_from_history)
        if pdf_file:
            return send_file(pdf_file, mimetype='application/pdf', as_attachment=True, download_name=f"comprobante_{historial_record_id}.pdf")
        else:
            return "Error al generar el PDF.", 500

    except Exception as e:
        print(f"ERROR obteniendo/generando recibo para {historial_record_id}: {e}")
        return jsonify({"error": "No se pudo encontrar o generar el comprobante."}), 404


@app.route('/api/send_receipt', methods=['POST'])
def send_receipt():
    if not resend.api_key: return "Error: Servicio de email no configurado.", 500
    if not api: return "Error: API de Airtable no inicializada.", 500

    data = request.json
    historial_record_id = data.get('historial_record_id')
    email_to = data.get('email')

    if not all([historial_record_id, email_to]):
        return jsonify({"error": "Faltan parámetros"}), 400

    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        record = historial_table.get(historial_record_id)
        
        # Generar el PDF al vuelo (ya que no lo subimos a Airtable)
        payment_details_from_history = {
            "FECHA_PAGO": record['fields'].get('Timestamp', datetime.now().strftime("%d/%m/%Y %H:%M:%S")),
            "ESTADO_PAGO": record['fields'].get('Estado', 'Desconocido'),
            "ID_PAGO_MP": record['fields'].get('MP_Payment_ID', 'N/A'),
            "items": [{"description": "Detalle no disponible", "amount": record['fields'].get('Monto', 0)}], # Placeholder
            "MONTO_TOTAL": record['fields'].get('Monto', 0)
        }
        pdf_file = create_receipt_pdf(payment_details_from_history)
        
        if not pdf_file:
            raise Exception("No se pudo generar el PDF para enviar.")

        # Para Resend, los adjuntos deben ser un objeto con filename y content (base64)
        pdf_base64 = base64.b64encode(pdf_file.getvalue()).decode('utf-8')
        
        params = {
            "from": "onboarding@resend.dev",
            "to": email_to,
            "subject": f"Comprobante de Pago #{record.get('id')} - Municipalidad de Villa Traful",
            "html": f"<p>Hola, adjuntamos tu comprobante de pago con ID de operación MP: {payment_details_from_history['ID_PAGO_MP']}.</p><p>¡Gracias por tu pago!</p>",
            "attachments": [
                {
                    "filename": f"comprobante_{historial_record_id}.pdf",
                    "content": pdf_base64
                }
            ]
        }
        
        email_response = resend.Emails.send(params)
        print(f"Email enviado con Resend: {email_response}")
        return jsonify({"success": True, "email_id": email_response.get('id')})
    except Exception as e:
        print(f"ERROR enviando email: {e}")
        return jsonify({"error": "No se pudo enviar el email."}), 500


# Endpoint para la actualización de pagos (ya no se usa directamente desde el frontend para pagos con MP)
@app.route('/api/update/pago', methods=['POST'])
def update_pago():
    print("Recibida petición en /api/update/pago (este endpoint no debería usarse para pagos con MP).")
    return jsonify({"error": "Endpoint no diseñado para pagos con MP."}), 400


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port, debug=False)
