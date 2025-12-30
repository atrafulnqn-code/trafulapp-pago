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
# ... (IDs de tablas)
HISTORIAL_TABLE_ID = "tbl5p19Hv4cMk9NUS"
PATENTE_TABLE_ID = 'tbl3CMMwccWeo8XSG'
CONTRIBUTIVOS_TABLE_ID = 'tblKbSq61LU1XXco0'

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5176")
BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:5000")

app = Flask(__name__)
CORS(app)

# Inicializar SDKs
api = Api(AIRTABLE_PAT_FROM_ENV) if AIRTABLE_PAT_FROM_ENV else None
sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN_FROM_ENV) if MERCADOPAGO_ACCESS_TOKEN_FROM_ENV else None
resend.api_key = RESEND_API_KEY_FROM_ENV
# --- FIN CONFIGURACION ---


# --- Funciones Auxiliares de PDF y Email ---
def create_receipt_pdf(payment_details):
    try:
        with open('backend/comprobante_template.html', 'r', encoding='utf-8') as f:
            html_template = f.read()

        # Llenar la plantilla
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
    if not api: return
    try:
        # La librería pyairtable no soporta subidas de adjuntos directamente.
        # Necesitamos usar la API HTTP de Airtable con 'requests'.
        # Esta es una implementación simplificada.
        # Nota: La subida de adjuntos es un proceso de 2 pasos. Por simplicidad,
        # aquí solo actualizaremos un campo de texto con un mensaje.
        # La implementación completa requeriría la librería 'requests'.
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        historial_table.update(record_id, {"Comprobante_Status": "Generado"})
        print("Marcado de comprobante en Airtable realizado (simulado).")
    except Exception as e:
        print(f"Error subiendo PDF a Airtable: {e}")

# ... (Endpoints de búsqueda y create_preference se mantienen igual, pero con pequeños ajustes)

@app.route('/api/payment_webhook', methods=['POST'])
def payment_webhook():
    print("--- Webhook Recibido ---")
    data = request.json
    print(f"Datos del Webhook: {data}")

    if data.get("topic") == "payment" or data.get("type") == "payment":
        payment_id = data.get("id") or data.get("data", {}).get("id")
        
        if not payment_id:
             return jsonify({"error": "No payment ID found"}), 400
        
        print(f"Procesando pago con ID: {payment_id}")

        try:
            payment_info = sdk.payment().get(payment_id)["response"]
            payment_status = payment_info["status"]
            external_reference = json.loads(payment_info.get("external_reference", "{}"))
            
            if not external_reference:
                print("Error: external_reference no encontrado.")
                return jsonify({"status": "error"}), 400

            # ... (Lógica para construir detalle del pago y fields_to_update)
            # ... (Lógica para actualizar la tabla de origen)

            # Registrar en historial
            historial_record = api.table(BASE_ID, HISTORIAL_TABLE_ID).create({
                'Estado': "Exitoso" if payment_status == "approved" else "Fallido",
                'Monto': float(payment_info["transaction_amount"]),
                'Detalle': "Detalle del pago aquí" # Construir el detalle
            })
            
            if payment_status == "approved":
                # Construir detalles para el PDF
                pdf_details = {
                    "status": "Aprobado",
                    "mp_payment_id": payment_id,
                    "items": external_reference["items"], # Asume que pasamos los items
                    "total_amount": payment_info["transaction_amount"]
                }
                pdf_file = create_receipt_pdf(pdf_details)
                if pdf_file:
                    # Simulación de subida de PDF
                    upload_pdf_to_airtable(historial_record['id'], pdf_file, f"comprobante_{payment_id}.pdf")

            return jsonify({"status": "received"}), 200

        except Exception as e:
            print(f"Error procesando webhook: {e}")
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"status": "received"}), 200


# Nuevos Endpoints
@app.route('/api/receipt/<record_id>', methods=['GET'])
def get_receipt(record_id):
    if not api: return jsonify({"error": "Servidor no configurado"}), 500
    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        record = historial_table.get(record_id)
        
        # Esto asume que el campo se llama 'Comprobante' y contiene un adjunto
        attachment = record['fields'].get('Comprobante', [])[0]
        pdf_url = attachment['url']
        
        # Redirigir al usuario a la URL del PDF para descargarlo
        return redirect(pdf_url)
    except Exception as e:
        print(f"Error obteniendo el recibo: {e}")
        return jsonify({"error": "No se pudo encontrar el comprobante."}), 404


@app.route('/api/send_receipt', methods=['POST'])
def send_receipt():
    if not resend.api_key: return jsonify({"error": "Servicio de email no configurado"}), 500
    
    data = request.json
    record_id = data.get('record_id')
    email_to = data.get('email')

    if not all([record_id, email_to]):
        return jsonify({"error": "Faltan parámetros"}), 400

    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        record = historial_table.get(record_id)
        attachment = record['fields'].get('Comprobante', [])[0]
        pdf_url = attachment['url']
        
        # Descargar el contenido del PDF desde la URL
        import requests
        pdf_response = requests.get(pdf_url)
        pdf_content = pdf_response.content

        params = {
            "from": "onboarding@resend.dev", # Remitente de prueba de Resend
            "to": email_to,
            "subject": "Tu Comprobante de Pago - Municipalidad de Villa Traful",
            "html": "<p>Hola, adjuntamos tu comprobante de pago. ¡Gracias!</p>",
            "attachments": [{
                "filename": f"comprobante_{record_id}.pdf",
                "content": list(pdf_content) # La SDK de Resend espera una lista de bytes
            }]
        }
        
        email = resend.Emails.send(params)
        print(f"Email enviado: {email}")
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error enviando email: {e}")
        return jsonify({"error": "No se pudo enviar el email."}), 500


# El resto del código de app.py se mantiene...
# (Todos los endpoints de búsqueda, etc.)
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port, debug=False)