import os
from flask import Flask, request, jsonify, send_file, redirect
from flask_cors import CORS, cross_origin
from pyairtable import Api
from pyairtable.formulas import match
from dotenv import load_dotenv
import mercadopago
import json
from weasyprint import HTML
import io
import resend
from datetime import datetime
import base64
import hashlib
import urllib.parse

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

# --- CONFIGURACIÓN PAYWAY PRODUCCIÓN ---
PAYWAY_SITE_ID = os.getenv("PAYWAY_SITE_ID", "93011187")
PAYWAY_PUBLIC_KEY = os.getenv("PAYWAY_PUBLIC_KEY", "d330243d2197451da95013d030d4e919")
PAYWAY_PRIVATE_KEY = os.getenv("PAYWAY_PRIVATE_KEY", "157da43a495f42968b13ee8a14df3ce2")
PAYWAY_TEMPLATE_ID = os.getenv("PAYWAY_TEMPLATE_ID", "34164")

if not PAYWAY_SITE_ID or not PAYWAY_PRIVATE_KEY: 
    print("ADVERTENCIA: Credenciales de Payway incompletas.")
else:
    print(f"Configuración Payway cargada. Site ID: {PAYWAY_SITE_ID}")

# Función auxiliar para generar firma SPS
def generar_firma_sps(params, private_key):
    try:
        # Estándar común SPS Decidir 2.0:
        # Cadena a firmar: site_id + operacion_id + monto + moneda + private_key
        # Importante: El monto suele requerir separador decimal '.' sin separador de miles si es float,
        # o ',' si es formato legacy. En V2 JSON suele ser string limpio.
        # Probaremos la concatenación más estándar.
        
        raw_string = f"{params['site_id']}{params['operacion_id']}{params['monto']}{params['moneda']}{private_key}"
        return hashlib.sha256(raw_string.encode('utf-8')).hexdigest()
    except Exception as e:
        print(f"Error generando firma: {e}")
        return ""

ADMIN_PASSWORD_FROM_ENV = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD_FROM_ENV: print("ADVERTENCIA: La variable de entorno ADMIN_PASSWORD no está configurada. El acceso de administrador no funcionará.")
print("--- Fin Verificación ---")
# ---------------------------------------------

# --- CONFIGURACION ---
BASE_ID = "appoJs8XY2j2kwlYf"
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0"
DEUDAS_TABLE_ID = "tblHuS8CdqVqTsA3t"
PATENTE_TABLE_ID = "tbl3CMMwccWeo8XSG"
HISTORIAL_TABLE_ID = "tbl5p19Hv4cMk9NUS"
LOGS_TABLE_ID = "tblLihQ9FmU6JD7NR"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL", "http://localhost:10000")

app = Flask(__name__)
# Configuración CORS global permisiva
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.route('/healthz')
def health_check():
    return "OK", 200

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
        with open('comprobante_template.html', 'r', encoding='utf-8') as f:
            html_template = f.read()

        items_html = ""
        for item in payment_details.get("items", []):
            items_html += f"<tr><td>{item.get('description', '')}</td><td style='text-align: right;'>${item.get('amount', 0)}</td></tr>"

        html_filled = html_template.replace("{{FECHA_PAGO}}", payment_details.get("FECHA_PAGO", datetime.now().strftime("%d/%m/%Y %H:%M:%S")))
        html_filled = html_filled.replace("{{ESTADO_PAGO}}", payment_details.get("ESTADO_PAGO", "N/A"))
        html_filled = html_filled.replace("{{ID_PAGO_MP}}", str(payment_details.get("ID_PAGO_MP", "N/A")))
        html_filled = html_filled.replace("{{NOMBRE_PAGADOR}}", str(payment_details.get("NOMBRE_PAGADOR", "N/A")))
        html_filled = html_filled.replace("{{IDENTIFICADOR_PAGADOR}}", str(payment_details.get("IDENTIFICADOR_PAGADOR", "N/A")))
        html_filled = html_filled.replace("{{ITEMS_PAGADOS}}", items_html)
        html_filled = html_filled.replace("{{MONTO_TOTAL}}", str(payment_details.get("MONTO_TOTAL", 0)))
        
        pdf_file = io.BytesIO()
        HTML(string=html_filled, base_url=".").write_pdf(pdf_file)
        pdf_file.seek(0)
        return pdf_file
    except Exception as e:
        print(f"ERROR generando PDF: {e}")
        return None

def log_to_airtable(level, source, message, related_id=None, details=None):
    if not api:
        print(f"ERROR: Airtable API no inicializada. No se pudo escribir log: {message}")
        return

    try:
        logs_table = api.table(BASE_ID, LOGS_TABLE_ID)
        log_entry = {
            'Level': level,
            'Source': source,
            'Message': message,
        }
        if related_id:
            log_entry['Related ID'] = str(related_id) # Ensure it's a string
        if details:
            log_entry['Details'] = json.dumps(details) # Store details as JSON string

        logs_table.create(log_entry)
        # print(f"Log exitoso en Airtable: [{level}] {source}: {message}")
    except Exception as e:
        print(f"ERROR: Falló la escritura de log en Airtable: {e} - Mensaje original: {message}")

# --- Endpoints ---
@app.route('/api/search/patente', methods=['GET'])
def search_patente():
    log_to_airtable('INFO', 'API Search', 'Recibida petición en /api/search/patente', details={'ip_address': request.remote_addr, 'dni_param': request.args.get('dni')})
    if not api:
        log_to_airtable('ERROR', 'API Search', 'Airtable API no inicializada al buscar patente.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    dni = request.args.get('dni')
    if not dni: 
        log_to_airtable('WARNING', 'API Search', 'Parámetro DNI requerido para búsqueda de patente.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "El parámetro DNI es requerido"}), 400
    try:
        table = api.table(BASE_ID, PATENTE_TABLE_ID)
        records = table.all(formula=match({"dni": dni}))
        log_to_airtable('INFO', 'API Search', f'Búsqueda de patente exitosa para DNI {dni}. Encontrados {len(records)} registros.', related_id=dni, details={'records_found': len(records)})
        return jsonify(records)
    except Exception as e:
        log_to_airtable('ERROR', 'API Search', f'ERROR en search_patente: {e}', related_id=dni, details={'error_message': str(e)})
        return jsonify({"error": str(e)}), 500

@app.route('/api/search/contributivo', methods=['GET'])
def search_contributivo():
    log_to_airtable('INFO', 'API Search', 'Recibida petición en /api/search/contributivo', details={'ip_address': request.remote_addr, 'dni_param': request.args.get('dni')})
    if not api: 
        log_to_airtable('ERROR', 'API Search', 'Airtable API no inicializada al buscar contributivo.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    dni = request.args.get('dni')
    if not dni: 
        log_to_airtable('WARNING', 'API Search', 'Parámetro DNI requerido para búsqueda de contributivo.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "El parámetro DNI es requerido"}), 400
    try:
        table = api.table(BASE_ID, CONTRIBUTIVOS_TABLE_ID)
        records = table.all(formula=match({"dni": dni}))
        log_to_airtable('INFO', 'API Search', f'Búsqueda de contributivo exitosa para DNI {dni}. Encontrados {len(records)} registros.', related_id=dni, details={'records_found': len(records)})
        return jsonify(records)
    except Exception as e:
        log_to_airtable('ERROR', 'API Search', f'ERROR en search_contributivo: {e}', related_id=dni, details={'error_message': str(e)})
        return jsonify({"error": str(e)}), 500

@app.route('/api/search/deuda', methods=['GET'])
def search_deuda():
    log_to_airtable('INFO', 'API Search', 'Recibida petición en /api/search/deuda', details={'ip_address': request.remote_addr, 'nombre_param': request.args.get('nombre')})
    if not api: return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    nombre = request.args.get('nombre')
    if not nombre: 
        log_to_airtable('WARNING', 'API Search', 'Parámetro nombre requerido para búsqueda de deuda.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "El parámetro 'nombre' es requerido"}), 400
    try:
        table = api.table(BASE_ID, DEUDAS_TABLE_ID)
        records = table.all(formula=f"SEARCH('{nombre.lower()}', LOWER({{nombre y apellido}}))")
        log_to_airtable('INFO', 'API Search', f'Búsqueda de deuda exitosa para {nombre}. Encontrados {len(records)} registros.', related_id=nombre, details={'records_found': len(records)})
        return jsonify(records)
    except Exception as e:
        log_to_airtable('ERROR', 'API Search', f'ERROR en search_deuda: {e}', related_id=nombre, details={'error_message': str(e)})
        return jsonify({"error": str(e)}), 500

@app.route('/api/search/deuda_suggestions', methods=['GET'])
def search_deuda_suggestions():
    log_to_airtable('INFO', 'API Search', 'Recibida petición en /api/search/deuda_suggestions', details={'ip_address': request.remote_addr, 'query_param': request.args.get('query')})
    if not api: return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500
    query = request.args.get('query')
    if not query: 
        log_to_airtable('INFO', 'API Search', 'Sin query para sugerencias de deuda.', details={'ip_address': request.remote_addr})
        return jsonify([]) # Return empty list if no query
    try:
        table = api.table(BASE_ID, DEUDAS_TABLE_ID)
        records = table.all(formula=f"SEARCH('{query.lower()}', LOWER({{nombre y apellido}}))")
        suggestions = []
        for record in records:
            suggestions.append({
                'id': record['id'],
                'nombre_completo': record['fields'].get('nombre y apellido'),
                'monto_total_deuda': record['fields'].get('monto total deuda')
            })
        log_to_airtable('INFO', 'API Search', f'Búsqueda de sugerencias de deuda para "{query}" exitosa. Encontradas {len(suggestions)} sugerencias.', related_id=query, details={'suggestions_found': len(suggestions)})
        return jsonify(suggestions)
    except Exception as e:
        log_to_airtable('ERROR', 'API Search', f'ERROR en search_deuda_suggestions: {e}', related_id=query, details={'error_message': str(e)})
        return jsonify({"error": str(e)}), 500

@app.route('/api/create_preference', methods=['POST'])
def create_preference():
    print("--- DENTRO DE CREATE_PREFERENCE ---") # <-- AÑADIDO PARA DEBUG
    log_to_airtable('INFO', 'Mercado Pago', 'Recibida petición en /api/create_preference', details={'ip_address': request.remote_addr, 'payload': request.json})
    if not sdk:
        log_to_airtable('ERROR', 'Mercado Pago', 'SDK de Mercado Pago no inicializada al crear preferencia.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "La configuración del servidor para Mercado Pago es incorrecta."}), 500
    data = request.json
    title = data.get('title')
    unit_price = data.get('unit_price')
    items_to_pay = data.get('items_to_pay')
    if not all([title, unit_price, items_to_pay]):
        log_to_airtable('WARNING', 'Mercado Pago', 'Faltan parámetros para crear preferencia.', details={'ip_address': request.remote_addr, 'payload': data})
        return jsonify({"error": "Faltan parámetros"}), 400
    try:
        external_reference = json.dumps(items_to_pay)
        preference_data = {
            "items": [{"title": title, "quantity": 1, "unit_price": float(unit_price)}],
            "back_urls": {"success": FRONTEND_URL, "failure": FRONTEND_URL, "pending": FRONTEND_URL},
            "auto_return": "approved",
            "notification_url": f"{BACKEND_URL}/api/payment_webhook",
            "external_reference": external_reference
        }
        preference_response = sdk.preference().create(preference_data)
        preference = preference_response["response"]
        log_to_airtable('INFO', 'Mercado Pago', 'Preferencia de pago creada con éxito.', related_id=preference["id"], details={'preference_id': preference["id"], 'init_point': preference.get("init_point"), 'sandbox_init_point': preference.get("sandbox_init_point"), 'items_to_pay': items_to_pay})
        return jsonify({
            "preference_id": preference["id"],
            "init_point": preference.get("init_point"),
            "sandbox_init_point": preference.get("sandbox_init_point")
        })
    except Exception as e:
        print(f"ERROR CAPTURADO EN CREATE_PREFERENCE: {e}") # <-- AÑADIDO PARA DEBUG
        log_to_airtable('ERROR', 'Mercado Pago', f'ERROR en create_preference: {e}', details={'error_message': str(e), 'payload': data})
        return jsonify({"error": str(e)}), 500

@app.route('/api/create_payway_payment', methods=['POST', 'GET', 'OPTIONS'])
def create_payway_payment():
    print(f"DEBUG: Petición {request.method} recibida en /api/create_payway_payment") # DEBUG LOG

    # Manejo explícito de CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
        return response, 200

    # Agregar headers CORS también a la respuesta POST/GET exitosa
    def add_cors_headers(resp):
        resp.headers.add('Access-Control-Allow-Origin', '*')
        return resp

    log_to_airtable('INFO', 'Payway', f'Recibida petición {request.method} en /api/create_payway_payment', details={'ip_address': request.remote_addr})
    
    # Validar configuración
    if not PAYWAY_SITE_ID or not PAYWAY_PRIVATE_KEY:
         return add_cors_headers(jsonify({"error": "El servidor no tiene configuradas las credenciales de Payway."})), 500

    # Obtener datos según el método
    items_to_pay = {}
    total_amount = None
    payer_email = 'email@test.com'

    if request.method == 'POST':
        data = request.json
        if not data:
            return add_cors_headers(jsonify({"error": "No se recibieron datos JSON."})), 400
        items_to_pay = data.get('items_to_pay')
        total_amount = data.get('unit_price')
        if items_to_pay:
            payer_email = items_to_pay.get('email', payer_email)
            
    elif request.method == 'GET':
        # Soporte para GET (Bypass CORS Preflight issues)
        total_amount = request.args.get('amount')
        payer_email = request.args.get('email', payer_email)
        # En GET no pasamos items complejos, asumimos pago simple
        items_to_pay = {'email': payer_email}

    if not total_amount:
         return add_cors_headers(jsonify({"error": "Falta el monto (unit_price o amount)."})), 400

    try:
        # --- INTEGRACIÓN PAYWAY (SPS - Formulario) ---
        
        # 1. Preparar datos básicos
        operation_id = str(int(datetime.now().timestamp())) # ID numérico único
        amount_str = f"{float(total_amount):.2f}".replace('.', ',') # Payway suele usar coma decimal en SPS legacy, o punto. Probamos formato estandar.
        # Ajuste: La mayoría de SPS espera monto con punto como decimal, pero sin separador de miles. Ej: "100.50"
        amount_sps = f"{float(total_amount):.2f}" 
        currency = "ARS" # Moneda
        
        # 2. Parámetros para firma
        params_firma = {
            "site_id": PAYWAY_SITE_ID,
            "operacion_id": operation_id,
            "monto": amount_sps,
            "moneda": currency
        }
        
        # 3. Generar Firma
        # NOTA CRÍTICA: Algunos SPS usan la API KEY como 'secret', otros una llave específica de encripción. Usamos Private Key.
        signature = generar_firma_sps(params_firma, PAYWAY_PRIVATE_KEY)
        
        # 4. Construir URL de Redirección (GET)
        # URL Base Producción: https://live.decidir.com/sps-service/v1/payment-requests
        # Se pasan los parámetros por Query String si es GET, o se retorna para hacer un Form POST oculto.
        # Para simplificar integración, intentaremos pasar params en la URL (GET) si el template lo soporta.
        
        # URL Construida
        base_url = "https://live.decidir.com/sps-service/v1/payment-requests/"
        query_params = f"?nro_operacion={operation_id}&monto={amount_sps}&mediodepago=1&moneda={currency}&id_site={PAYWAY_SITE_ID}&email_comprador={payer_email}"
        # NOTA: No pasamos la firma en URL abierta por seguridad si no es requerida explicitamente asi, pero SPS suele requerir un POST.
        
        # CORRECCIÓN ESTRATEGIA: SPS requiere POST de un formulario HTML.
        # Como nuestro frontend espera una URL para redirigir (window.location.href),
        # lo mejor es crear una ruta intermedia en nuestro backend que renderice ese formulario oculto y haga submit automático.
        
        # Nueva Estrategia: Devolver una URL de nuestro propio backend que renderice el formulario.
        # URL: /api/payway/form_submit/<operation_id>
        
        # Guardamos datos en memoria temporal o simplemente los reconstruimos (stateless). 
        # Para hacerlo stateless, codificamos todo en un token o lo pasamos como query params a nuestro endpoint intermedio.
        
        # Simplificación para prueba rápida: Retornamos los datos para que el Frontend haga el POST si fuera posible,
        # PERO como el frontend espera URL, haremos que el frontend navegue a un endpoint nuestro que devuelve el HTML del form.
        
        email_encoded = urllib.parse.quote(payer_email)
        redirect_url_backend = f"{BACKEND_URL}/api/payway/redirect?id={operation_id}&amount={amount_sps}&email={email_encoded}"

        log_to_airtable('INFO', 'Payway', f'Operación Payway {operation_id} iniciada.', related_id=operation_id)
        
        return add_cors_headers(jsonify({
            "payment_id": operation_id,
            "init_point": redirect_url_backend, 
            "message": "Redirigiendo a Payway..."
        }))

    except Exception as e:
        log_to_airtable('ERROR', 'Payway', f'ERROR en create_payway_payment: {e}', details={'error_message': str(e)})
        return jsonify({"error": str(e)}), 500

@app.route('/api/payway/redirect', methods=['GET'])
def payway_redirect():
    # Endpoint auxiliar para generar el formulario POST hacia Payway
    try:
        op_id = request.args.get('id')
        amount = request.args.get('amount')
        email = request.args.get('email')
        
        if not op_id or not amount: return "Datos inválidos", 400
        
        params_firma = {
            "site_id": PAYWAY_SITE_ID,
            "operacion_id": op_id,
            "monto": amount,
            "moneda": "ARS"
        }
        signature = generar_firma_sps(params_firma, PAYWAY_PRIVATE_KEY) # Usamos private key como 'secret'
        
        # HTML con Botón Manual (para evitar bloqueos de navegador/antivirus)
        html_form = f"""
        <html>
        <head>
            <title>Confirmar Pago</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8f9fa; }}
                .card {{ background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }}
                .btn {{ background-color: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 5px; font-size: 1.1rem; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 1rem; }}
                .btn:hover {{ background-color: #0056b3; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Casi listo...</h2>
                <p>Estás a un paso de realizar tu pago seguro.</p>
                <p><strong>Monto: ${amount}</strong></p>
                
                <form name="payway_form" action="https://live.decidir.com/sps-service/v1/payment-requests/" method="POST">
                    <input type="hidden" name="nro_operacion" value="{op_id}">
                    <input type="hidden" name="monto" value="{amount}">
                    <input type="hidden" name="moneda" value="ARS">
                    <input type="hidden" name="id_site" value="{PAYWAY_SITE_ID}">
                    <input type="hidden" name="email_comprador" value="{email}">
                    <input type="hidden" name="mediodepago" value="1">
                    <input type="hidden" name="signature" value="{signature}">
                    <input type="hidden" name="hash" value="{signature}">
                    
                    <button type="submit" class="btn">Continuar a Payway &rarr;</button>
                </form>
            </div>
        </body>
        </html>
        """
        return html_form

    except Exception as e:
         return f"Error generando formulario de pago: {str(e)}", 500

def process_payment(payment_id, payment_info, items_context, is_simulation=False):
    log_to_airtable('INFO', 'Payment Process', f'Inicio del procesamiento de pago. ID: {payment_id}', related_id=payment_id, details={'payment_info': payment_info, 'items_context': items_context})
    try:
        payment_status = payment_info["status"]
        monto_pagado = payment_info["transaction_amount"]
        
        pago_estado = "Fallido"
        items_for_pdf = []

        detalle_pago_historial = f"Pago para {items_context.get('item_type')}, DNI/Nombre: {items_context.get('dni') or items_context.get('nombre_contribuyente')}"
        
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        historial_record = historial_table.create({
            'Estado': pago_estado, 
            'Monto': monto_pagado,
            'Detalle': detalle_pago_historial,
            'MP_Payment_ID': payment_id,
            'ItemsPagadosJSON': json.dumps([])
        })
        log_to_airtable('INFO', 'Payment Process', f'Registro de historial creado con ID: {historial_record["id"]}', related_id=historial_record['id'], details={'mp_payment_id': payment_id})

        if payment_status == "approved":
            pago_estado = "Exitoso"
            log_to_airtable('INFO', 'Payment Process', f'Pago APROBADO. Procesando actualizaciones de deuda. ID MP: {payment_id}', related_id=payment_id)
            
            record_id_to_update = items_context["record_id"]
            table_id_to_update = ""
            fields_to_update_origin = {}
            item_type = items_context.get("item_type")

            if item_type == "deuda_general":
                table_id_to_update = DEUDAS_TABLE_ID
                fields_to_update_origin["monto total deuda"] = "0"
                fields_to_update_origin["deuda en concepto de"] = "Pagado"
                items_for_pdf.append({"description": "Deuda General", "amount": items_context.get('total_amount', 0)})
            else:
                if item_type == "lote":
                    table_id_to_update = CONTRIBUTIVOS_TABLE_ID
                elif item_type == "vehiculo":
                    table_id_to_update = PATENTE_TABLE_ID
                if items_context.get("deuda"):
                    if item_type == "lote":
                        fields_to_update_origin["deuda"] = "0"
                    elif item_type == "vehiculo":
                        fields_to_update_origin["Deuda patente"] = "0"
                    
                    items_for_pdf.append({"description": f"Deuda {item_type.capitalize()}", "amount": items_context.get('deuda_monto', 0)})
                for mes, sel in items_context.get("meses", {}).items():
                    if sel:
                        fields_to_update_origin[mes.lower()] = "0"
                        items_for_pdf.append({"description": mes, "amount": items_context.get('meses_montos', {}).get(mes, 0)})

            if fields_to_update_origin:
                api.table(BASE_ID, table_id_to_update).update(record_id_to_update, fields_to_update_origin)
                log_to_airtable('INFO', 'Payment Process', f'Airtable de deuda actualizado para ID: {record_id_to_update}', related_id=payment_id, details={'updates': fields_to_update_origin})
            
            historial_table.update(historial_record['id'], {
                'Estado': pago_estado,
                'ItemsPagadosJSON': json.dumps(items_for_pdf)
            })
            log_to_airtable('INFO', 'Payment Process', f'Historial de pago actualizado a "Exitoso" y con ítems. ID: {historial_record["id"]}', related_id=payment_id)

        else: # Si el pago no fue aprobado
            historial_table.update(historial_record['id'], {'Estado': pago_estado})
            log_to_airtable('WARNING', 'Payment Process', f'Pago NO APROBADO. Estado final: {payment_status}.', related_id=payment_id, details={'payment_info': payment_info})
        
        receipt_url = f"{BACKEND_URL}/api/receipt/{historial_record['id']}"
        historial_table.update(historial_record['id'], {"Link Comprobante": receipt_url})
        log_to_airtable('INFO', 'Payment Process', f'Link de comprobante guardado para historial ID: {historial_record["id"]}', related_id=payment_id)

        pdf_details = {
            "FECHA_PAGO": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "ESTADO_PAGO": pago_estado,
            "ID_PAGO_MP": payment_id,
            "items": items_for_pdf,
            "MONTO_TOTAL": monto_pagado
        }
        pdf_file = create_receipt_pdf(pdf_details)
        if pdf_file and items_context.get("email"):
            params = {
                "from": os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev"), "to": items_context.get("email"),
                "subject": "Comprobante de Pago - Municipalidad de Villa Traful",
                "html": f"<p>Hola, adjuntamos tu comprobante de pago con ID: {payment_id}.</p>",
                "attachments": [{"filename": f"comprobante_{payment_id}.pdf", "content": base64.b64encode(pdf_file.getvalue()).decode('utf-8')}]
            }
            resend.Emails.send(params)
            log_to_airtable('INFO', 'Email Service', f'Email de comprobante enviado a {items_context.get("email")}.', related_id=payment_id, details={'to_email': items_context.get("email")})
            historial_table.update(historial_record['id'], {"Comprobante_Status": f"Enviado a {items_context.get('email')}"})
        elif not items_context.get("email"):
            log_to_airtable('WARNING', 'Email Service', f'No se envió email de comprobante porque no se proporcionó dirección de correo.', related_id=payment_id)
        else: # pdf_file is None
            log_to_airtable('ERROR', 'Email Service', f'No se pudo generar el PDF para el email del comprobante.', related_id=payment_id)

        return {"status": "ok", "historialRecordId": historial_record['id']}
    except Exception as e:
        log_to_airtable('ERROR', 'Payment Process', f'Error procesando pago {payment_id}: {e}', related_id=payment_id, details={'error_message': str(e)})
        raise

@app.route('/api/payment_webhook', methods=['POST'])
def payment_webhook():
    print("--- Webhook Recibido ---")
    data = request.json
    if data.get("type") == "payment":
        payment_id = data.get("data", {}).get("id")
        if not payment_id: return jsonify({"error": "No payment ID"}), 400
        try:
            payment_info = sdk.payment().get(payment_id)["response"]
            items_context = json.loads(payment_info.get("external_reference", "{}"))
            result = process_payment(payment_id, payment_info, items_context)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"status": "not a payment"}), 200

@app.route('/api/debug/simulate_payment', methods=['POST'])
def simulate_payment():
    print("--- Simulación de Pago Recibida ---")
    data = request.json
    items_context = data.get('items_to_pay')
    if not items_context: return jsonify({"error": "Falta items_to_pay"}), 400
    payment_id = "SIM_" + str(datetime.now().timestamp()).replace(".", "")
    payment_info = {
        "status": "approved", "transaction_amount": items_context.get('total_amount', 0),
        "external_reference": json.dumps(items_context)
    }
    try:
        result = process_payment(payment_id, payment_info, items_context, is_simulation=True)
        result['mp_payment_id'] = payment_id  # Add the simulated payment ID to the response
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/get_history_by_payment_id/<mp_payment_id>', methods=['GET'])
def get_history_by_payment_id(mp_payment_id):
    if not api: return jsonify({"error": "Airtable no configurado"}), 500
    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        records = historial_table.all(formula=match({"MP_Payment_ID": mp_payment_id}))
        return jsonify(records[0] if records else None)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/receipt/<historial_record_id>', methods=['GET'])
def get_receipt(historial_record_id):
    if not api: return "Error: Airtable no inicializado.", 500
    try:
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        record = historial_table.get(historial_record_id)
        items_for_pdf = json.loads(record['fields'].get('ItemsPagadosJSON', '[]'))
        payment_details = {
            "FECHA_PAGO": record['fields'].get('Timestamp', datetime.now().strftime("%d/%m/%Y %H:%M:%S")),
            "ESTADO_PAGO": record['fields'].get('Estado', 'Desconocido'),
            "ID_PAGO_MP": record['fields'].get('MP_Payment_ID', 'N/A'),
            "items": items_for_pdf, "MONTO_TOTAL": record['fields'].get('Monto', 0)
        }
        pdf_file = create_receipt_pdf(payment_details)
        if pdf_file:
            return send_file(pdf_file, mimetype='application/pdf', as_attachment=True, download_name=f"comprobante_{historial_record_id}.pdf")
        return "Error al generar el PDF.", 500
    except Exception as e:
        return jsonify({"error": "No se pudo encontrar o generar el comprobante."}), 404


@app.route('/api/send_receipt', methods=['OPTIONS'])
def handle_send_receipt_options():
    response = jsonify(success=True)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'POST')
    return response

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
        
        items_for_pdf_str = record['fields'].get('ItemsPagadosJSON', '[]')
        items_for_pdf = json.loads(items_for_pdf_str)

        payment_details_from_history = {
            "FECHA_PAGO": record['fields'].get('Timestamp', datetime.now().strftime("%d/%m/%Y %H:%M:%S")),
            "ESTADO_PAGO": record['fields'].get('Estado', 'Desconocido'),
            "ID_PAGO_MP": record['fields'].get('MP_Payment_ID', 'N/A'),
            "items": items_for_pdf,
            "MONTO_TOTAL": record['fields'].get('Monto', 0)
        }
        pdf_file = create_receipt_pdf(payment_details_from_history)
        
        if not pdf_file:
            raise Exception("No se pudo generar el PDF para enviar.")

        pdf_base64 = base64.b64encode(pdf_file.getvalue()).decode('utf-8')
        
        params = {
            "from": "onboarding@resend.dev",
            "to": email_to,
            "subject": f"Comprobante de Pago #{historial_record_id} - Municipalidad de Villa Traful",
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

    except Exception as e:
        print(f"ERROR enviando email: {e}")
        return jsonify({"error": "No se pudo enviar el email."}), 500

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    print("Recibida petición en /api/admin/login")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD") # Get from env for each request to allow dynamic updates
    if not ADMIN_PASSWORD:
        return jsonify({"error": "La clave de administrador no está configurada en el servidor."}), 500

    data = request.json
    password_attempt = data.get('password')

    if password_attempt == ADMIN_PASSWORD:
        log_to_airtable('INFO', 'Admin Login', 'Intento de inicio de sesión de administrador exitoso.', details={'ip_address': request.remote_addr})
        return jsonify({"success": True, "message": "Inicio de sesión de administrador exitoso."}), 200
    else:
        log_to_airtable('WARNING', 'Admin Login', 'Intento de inicio de sesión de administrador fallido (clave incorrecta).', details={'ip_address': request.remote_addr})
        return jsonify({"success": False, "message": "Clave incorrecta."}), 401

@app.route('/api/admin/payments', methods=['GET'])
def admin_get_payments():
    log_to_airtable('INFO', 'Admin API', 'Recibida petición en /api/admin/payments', details={'ip_address': request.remote_addr, 'query_params': request.args})
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
    if not ADMIN_PASSWORD:
        log_to_airtable('ERROR', 'Admin API', 'ADMIN_PASSWORD no configurada en el servidor para /api/admin/payments.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "La clave de administrador no está configurada en el servidor."}), 500
    
    # El dashboard debe enviar la clave en un header 'X-API-Key'
    # client_api_key = request.headers.get('X-API-Key')
    # if client_api_key != os.getenv("DASHBOARD_API_KEY"):
    #     log_to_airtable('WARNING', 'Admin API', 'Acceso no autorizado a /api/admin/payments (API Key inválida).', details={'ip_address': request.remote_addr})
    #     return jsonify({"error": "Acceso no autorizado. API Key inválida."}), 401

    if not api:
        log_to_airtable('ERROR', 'Admin API', 'Airtable API no inicializada al acceder a /api/admin/payments.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500

    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        # Obtener todos los registros y ordenarlos
        all_records = historial_table.all(sort=['-Fecha de Transacción']) 
        total_records = len(all_records)

        # Implementar paginación manual
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_records = all_records[start_index:end_index]
        
        formatted_payments = []
        for record in paginated_records:
            fields = record.get('fields', {})
            
            item_type_raw = 'N/A'
            detalle_text = fields.get('Detalle', '')
            if 'vehiculo' in detalle_text or 'Patente' in detalle_text:
                item_type_raw = 'vehiculo'
            elif 'lote' in detalle_text:
                item_type_raw = 'lote'
            elif 'deuda_general' in detalle_text:
                item_type_raw = 'deuda_general'

            payment_type_display = 'Desconocido'
            if item_type_raw == 'vehiculo':
                payment_type_display = 'Patente'
            elif item_type_raw == 'lote':
                payment_type_display = 'Contributivo'
            elif item_type_raw == 'deuda_general':
                payment_type_display = 'Plan de Pago'

            formatted_payments.append({
                'id': record.get('id'),
                'estado': fields.get('Estado', 'N/A'),
                'monto': fields.get('Monto', 0),
                'detalle': fields.get('Detalle', 'N/A'),
                'mp_payment_id': fields.get('MP_Payment_ID', 'N/A'),
                'timestamp': fields.get('Fecha de Transacción', None),
                'items_pagados_json': fields.get('ItemsPagadosJSON', '[]'),
                'payment_type': payment_type_display
            })
        
        log_to_airtable('INFO', 'Admin API', f'Recuperados {len(formatted_payments)} registros de pagos (pág {page}/{per_page}) para administrador.', details={'total_records': total_records, 'current_page': page, 'per_page': per_page})
        return jsonify({
            'payments': formatted_payments,
            'total_records': total_records,
            'current_page': page,
            'per_page': per_page
        }), 200
    except Exception as e:
        log_to_airtable('ERROR', 'Admin API', f'ERROR en admin_get_payments: {e}', details={'error_message': str(e), 'query_params': request.args})
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/logs', methods=['GET'])
def admin_get_logs():
    log_to_airtable('INFO', 'Admin API', 'Recibida petición en /api/admin/logs', details={'ip_address': request.remote_addr, 'query_params': request.args})
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
    if not ADMIN_PASSWORD:
        log_to_airtable('ERROR', 'Admin API', 'ADMIN_PASSWORD no configurada en el servidor para /api/admin/logs.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "La clave de administrador no está configurada en el servidor."}), 500
    
    # DASHBOARD_API_KEY verification can be added here if needed
    # client_api_key = request.headers.get('X-API-Key')
    # if client_api_key != os.getenv("DASHBOARD_API_KEY"):
    #     log_to_airtable('WARNING', 'Admin API', 'Acceso no autorizado a /api/admin/logs (API Key inválida).', details={'ip_address': request.remote_addr})
    #     return jsonify({"error": "Acceso no autorizado. API Key inválida."}), 401

    if not api:
        log_to_airtable('ERROR', 'Admin API', 'Airtable API no inicializada al acceder a /api/admin/logs.', details={'ip_address': request.remote_addr})
        return jsonify({"error": "La configuración del servidor para Airtable es incorrecta."}), 500

    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))

        logs_table = api.table(BASE_ID, LOGS_TABLE_ID)
        all_records = logs_table.all(sort=['-Timestamp']) # Obtener todos los registros, ordenados por Timestamp descendente
        total_records = len(all_records)

        # Implementar paginación manual
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_records = all_records[start_index:end_index]
        
        formatted_logs = []
        for record in paginated_records:
            fields = record.get('fields', {})
            formatted_logs.append({
                'id': record.get('id'),
                'timestamp': fields.get('Timestamp', None),
                'level': fields.get('Level', 'N/A'),
                'source': fields.get('Source', 'N/A'),
                'message': fields.get('Message', 'N/A'),
                'related_id': fields.get('Related ID', None),
                'details': fields.get('Details', None)
            })
        log_to_airtable('INFO', 'Admin API', f'Recuperados {len(formatted_logs)} registros de logs (pág {page}/{per_page}) para administrador.', details={'total_records': total_records, 'current_page': page, 'per_page': per_page})
        return jsonify({
            'logs': formatted_logs,
            'total_records': total_records,
            'current_page': page,
            'per_page': per_page
        }), 200
    except Exception as e:
        log_to_airtable('ERROR', 'Admin API', f'ERROR en admin_get_logs: {e}', details={'error_message': str(e), 'query_params': request.args})
        return jsonify({"error": str(e)}), 500

@app.route('/api/test_cors', methods=['GET', 'POST', 'OPTIONS'])
def test_cors():
    return jsonify({"message": "CORS OK", "method": request.method}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port, debug=False)