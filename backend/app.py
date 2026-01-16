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

# Cargar variables de entorno desde el archivo .env
load_dotenv()

app = Flask(__name__)
# Configuración CORS global permisiva
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

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
# ID de la tabla de Recaudación real
RECAUDACION_TABLE_ID = os.getenv("RECAUDACION_TABLE_ID", "tblzRhxpeqbuhrf78")
# ID de la tabla de Patente Manual real
PATENTE_MANUAL_TABLE_ID = os.getenv("PATENTE_MANUAL_TABLE_ID", "tblO0nlUQx3isKkXF") 
# ID de la tabla de Comprobantes MP real
COMPROBANTES_MP_TABLE_ID = os.getenv("COMPROBANTES_MP_TABLE_ID", "tblpeoDBIEhsvqOKp")
ACCESOS_PERSONAL_TABLE_ID = os.getenv("ACCESOS_PERSONAL_TABLE_ID", "tblAILbaYmnWkkPiV")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL", "http://localhost:10000")

# ... (código existente) ...

@app.route('/api/send_payment_link', methods=['POST'])
@cross_origin()
def send_payment_link():
    data = request.json
    email = data.get('email')
    monto = data.get('monto')
    concepto = data.get('concepto', 'Tasa Municipal')
    link_mp = data.get('link')

    if not email or not link_mp:
        return jsonify({"error": "Faltan datos"}), 400

    try:
        # Link para subir comprobante
        upload_link = f"{FRONTEND_URL}/#/comprobante?email={email}&monto={monto}"
        from_email = os.getenv("RESEND_FROM_EMAIL", "trafulnet@geoarg.com")

        params = {
            "from": from_email,
            "to": email,
            "subject": "Link de Pago - Comuna de Villa Traful",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                <h2>Solicitud de Pago</h2>
                <p>Hola,</p>
                <p>Se ha generado una solicitud de pago por el concepto: <strong>{concepto}</strong></p>
                <p>Monto a pagar: <strong>${monto}</strong></p>
                <br>
                <a href="{link_mp}" style="background-color: #009ee3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Pagar con Mercado Pago</a>
                <br><br>
                <hr>
                <p>Una vez realizado el pago, por favor adjunte su comprobante aquí:</p>
                <a href="{upload_link}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Subir Comprobante de Pago</a>
            </div>
            """
        }
        print(f"DEBUG: Intentando enviar email a {email} desde {from_email}...")
        res_email = resend.Emails.send(params)
        print(f"DEBUG: Respuesta Resend: {res_email}")
        
        # Verificar si Resend devolvió un ID (éxito) o si lanzó excepción
        if not res_email.get('id'):
             print(f"ERROR: Resend no devolvió ID. Respuesta: {res_email}")
             return jsonify({"error": "No se pudo enviar el email (Error proveedor)"}), 500

        return jsonify({"success": True})
    except Exception as e:
        print(f"ERROR CRÍTICO en send_payment_link: {str(e)}") # Esto saldrá en los logs de Render
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@app.route('/api/upload_comprobante', methods=['POST'])
@cross_origin()
def upload_comprobante():
    try:
        email = request.form.get('email')
        monto = request.form.get('monto')
        archivo = request.files.get('archivo')

        if not archivo:
            return jsonify({"error": "No hay archivo"}), 400

        # Leer archivo en memoria
        archivo_bytes = archivo.read()
        archivo_b64 = base64.b64encode(archivo_bytes).decode('utf-8')

        # 1. Enviar Email a Administración con el adjunto
        # Usamos el mismo mail de origen como destino por defecto, o uno específico ADMIN_EMAIL
        admin_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
        
        params = {
            "from": "onboarding@resend.dev",
            "to": admin_email,
            "subject": f"Nuevo Comprobante MP - {email}",
            "html": f"<p>El usuario <strong>{email}</strong> ha subido un comprobante.</p><p>Monto declarado: ${monto}</p>",
            "attachments": [{"filename": archivo.filename, "content": archivo_b64}]
        }
        resend.Emails.send(params)

        # 2. Registrar en Airtable (Sin archivo, solo registro)
        if api:
            table = api.table(BASE_ID, COMPROBANTES_MP_TABLE_ID)
            table.create({
                "Fecha": datetime.now().strftime("%Y-%m-%d"),
                "Email": email,
                "Monto Declarado": float(monto) if monto else 0,
                "Concepto": "Pago subido por usuario",
                "Estado": "Pendiente"
            })

        return jsonify({"success": True})
    except Exception as e:
        print(f"Error subiendo comprobante: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/patente_manual', methods=['POST'])
@cross_origin()
def registrar_patente_manual():
    log_to_airtable('INFO', 'Patente Manual', 'Recibido nuevo pago de patente manual', details={'ip': request.remote_addr})
    
    if not api:
        return jsonify({"error": "Error de configuración: Airtable no conectado"}), 500

    try:
        data = request.json
        if not data:
            return jsonify({"error": "Sin datos"}), 400

        # 1. Generar PDF del recibo de Patente
        items_pdf = [
            {"description": f"Patente: {data.get('patente', '').upper()}", "amount": 0}, # Informativo
            {"description": f"Vehículo: {data.get('marca')} {data.get('modelo')} ({data.get('anio')})", "amount": 0}, # Informativo
            {"description": "Pago de Patente Automotor", "amount": float(data.get('monto') or 0)}
        ]
        
        # Agregar descuento si existe
        if data.get('descuento') and float(data.get('descuento')) > 0:
             items_pdf.append({"description": f"Descuento ({data.get('descuento')}%)", "amount": -1 * (float(data.get('monto')) - float(data.get('total_final')))})

        pdf_details = {
            "FECHA_PAGO": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "ESTADO_PAGO": "Aprobado (Manual)",
            "ID_PAGO_MP": f"PAT-{data.get('patente')}-{int(datetime.now().timestamp())}",
            "NOMBRE_PAGADOR": data.get('nombre'),
            "IDENTIFICADOR_PAGADOR": data.get('patente'),
            "items": items_pdf,
            "MONTO_TOTAL": data.get('total_final')
        }
        
        pdf_file = create_receipt_pdf(pdf_details)
        
        # 2. Guardar en Airtable
        try:
            patente_table = api.table(BASE_ID, PATENTE_MANUAL_TABLE_ID)
            patente_table.create({
                "Fecha": data.get('fecha'),
                "Contribuyente": data.get('nombre'),
                "Dominio": data.get('patente', '').upper(),
                "Vehículo": f"{data.get('marca')} {data.get('modelo')}",
                "Año": int(data.get('anio')) if data.get('anio') else None,
                "Email": data.get('email'),
                "Total": float(data.get('total_final')),
                "Operador": data.get('administrativo'),
                "Transferencia": data.get('transferencia')
            })
        except Exception as airtable_err:
            print(f"Advertencia: No se pudo guardar en tabla Patente Manual ({airtable_err}). Se ignora para no bloquear flujo.")
            log_to_airtable('WARNING', 'Patente Manual', f'Fallo al guardar en tabla: {airtable_err}')

        # 3. Enviar Email
        if pdf_file and data.get('email') and resend.api_key:
            from_email = os.getenv("RESEND_FROM_EMAIL", "trafulnet@geoarg.com")
            params = {
                "from": from_email,
                "to": data.get('email'),
                "subject": "Comprobante de Pago Patente - Comuna de Villa Traful",
                "html": f"<p>Estimado/a {data.get('nombre')},</p><p>Adjuntamos el comprobante de pago de patente para el dominio <strong>{data.get('patente', '').upper()}</strong>.</p><p>Gracias por su contribución.</p>",
                "attachments": [{"filename": f"patente_{data.get('patente')}.pdf", "content": base64.b64encode(pdf_file.getvalue()).decode('utf-8')}]
            }
            resend.Emails.send(params)
            log_to_airtable('INFO', 'Patente Manual', f'Email enviado a {data.get("email")}')

        return jsonify({
            "success": True, 
            "message": "Pago de Patente registrado correctamente",
            "pdf_base64": base64.b64encode(pdf_file.getvalue()).decode('utf-8') if pdf_file else None
        })

    except Exception as e:
        log_to_airtable('ERROR', 'Patente Manual', f'Error procesando patente manual: {e}')
        return jsonify({"error": str(e)}), 500

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL", "http://localhost:10000")

@app.route('/healthz')
def health_check():
    return "OK", 200

# ... (código existente) ...

@app.route('/api/recaudacion', methods=['POST'])
@cross_origin()
def registrar_recaudacion():
    log_to_airtable('INFO', 'Recaudacion', 'Recibida nueva recaudación manual', details={'ip': request.remote_addr})
    
    if not api:
        return jsonify({"error": "Error de configuración: Airtable no conectado"}), 500

    try:
        data = request.json
        if not data:
            return jsonify({"error": "Sin datos"}), 400

        # 1. Generar PDF del recibo
        # Reusamos la lógica de PDF pero con un template o datos adaptados
        items_pdf = []
        notas = data.get('notas', {})
        for key, val in data.get('importes', {}).items():
            monto = float(val)
            if monto > 0:
                # Buscar label (esto es simplificado, idealmente vendría del front o map)
                label = key.replace('_', ' ').capitalize()
                # Agregar nota si existe
                if notas.get(key):
                    label += f" ({notas.get(key)})"
                items_pdf.append({"description": label, "amount": monto})
        
        # Agregar descuento si existe
        if data.get('descuento') and float(data.get('descuento')) > 0:
             items_pdf.append({"description": f"Descuento ({data.get('descuento')}%)", "amount": -1 * (data.get('total') - data.get('total_final'))})

        pdf_details = {
            "FECHA_PAGO": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "ESTADO_PAGO": "Aprobado (Manual)",
            "ID_PAGO_MP": f"MAN-{int(datetime.now().timestamp())}",
            "NOMBRE_PAGADOR": data.get('nombre'),
            "IDENTIFICADOR_PAGADOR": data.get('email'),
            "items": items_pdf,
            "MONTO_TOTAL": data.get('total_final')
        }
        
        pdf_file = create_receipt_pdf(pdf_details)
        
        # 1.5 Generar Preferencia de Pago MP
        mp_link = None
        mp_id = None
        if sdk and data.get('total_final') > 0:
            try:
                preference_data = {
                    "items": [{"title": "Tasas y Derechos Municipales", "quantity": 1, "unit_price": float(data.get('total_final'))}],
                    "back_urls": {"success": f"{FRONTEND_URL}/exito", "failure": FRONTEND_URL, "pending": FRONTEND_URL},
                    "auto_return": "approved",
                    "notification_url": f"{BACKEND_URL}/api/payment_webhook",
                    "external_reference": json.dumps({"type": "recaudacion_manual", "email": data.get('email')}) 
                }
                preference_response = sdk.preference().create(preference_data)
                mp_link = preference_response["response"]["init_point"]
                mp_id = preference_response["response"]["id"]
            except Exception as mp_err:
                print(f"Error generando link MP: {mp_err}")

        # 2. Guardar en Airtable
        try:
            detalle_completo = {
                "importes": data.get('importes'),
                "notas": notas
            }
            recaudacion_table = api.table(BASE_ID, RECAUDACION_TABLE_ID)
            record = recaudacion_table.create({
                "Fecha": data.get('fecha'),
                "Contribuyente": data.get('nombre'),
                "Email": data.get('email'),
                "Total": data.get('total_final'),
                "Detalle JSON": json.dumps(detalle_completo),
                "Operador": data.get('administrativa'),
                "Estado Pago": "Pendiente", # Nuevo campo
                "MP Preference ID": mp_id # Nuevo campo para vincular
            })
            
            # Actualizar external_reference con el ID de airtable para el webhook
            if mp_id:
                 # Nota: No podemos editar la preferencia ya creada fácilmente sin crear otra, 
                 # pero confiamos en el ID de preferencia guardado en Airtable para el cruce, 
                 # o usamos el ID de airtable en el external_reference si lo creamos antes (huevo y gallina).
                 # Estrategia simple: El webhook buscará por ID de preferencia si no halla external_ref exacto.
                 pass

        except Exception as airtable_err:
            print(f"Advertencia: No se pudo guardar en tabla Recaudacion ({airtable_err}). Se ignora para no bloquear flujo.")
            log_to_airtable('WARNING', 'Recaudacion', f'Fallo al guardar en tabla Recaudacion: {airtable_err}')

        # 3. Enviar Email
        if pdf_file and data.get('email') and resend.api_key:
            from_email = os.getenv("RESEND_FROM_EMAIL", "trafulnet@geoarg.com")
            
            html_content = f"<p>Estimado/a {data.get('nombre')},</p><p>Adjuntamos el detalle de tasas y derechos generados el {data.get('fecha')}.</p>"
            
            if mp_link:
                html_content += f"""
                <br>
                <p><strong>Total a Pagar: ${data.get('total_final')}</strong></p>
                <a href="{mp_link}" style="background-color: #009ee3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Pagar Ahora con Mercado Pago</a>
                <br><br>
                """
            
            html_content += "<p>Gracias por su contribución.</p>"

            params = {
                "from": from_email,
                "to": data.get('email'),
                "subject": "Solicitud de Pago - Comuna de Villa Traful",
                "html": html_content,
                "attachments": [{"filename": "detalle_tasas.pdf", "content": base64.b64encode(pdf_file.getvalue()).decode('utf-8')}]
            }
            resend.Emails.send(params)
            log_to_airtable('INFO', 'Recaudacion', f'Email enviado a {data.get("email")}')

        return jsonify({
            "success": True, 
            "message": "Recaudación registrada y link enviado",
            "pdf_base64": base64.b64encode(pdf_file.getvalue()).decode('utf-8') if pdf_file else None
        })

    except Exception as e:
        log_to_airtable('ERROR', 'Recaudacion', f'Error procesando recaudación: {e}')
        return jsonify({"error": str(e)}), 500

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

try:
    MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "APP_USR-4503490593720184-011614-66692f938236762e3d1709ccc0c94f66-2533057250")
    if MERCADOPAGO_ACCESS_TOKEN:
        sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
        print("SDK de Mercado Pago inicializada con éxito (Producción).")
    else:
        print("ADVERTENCIA: MERCADOPAGO_ACCESS_TOKEN no disponible.")
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
        # Usar ruta absoluta para encontrar el template
        base_dir = os.path.dirname(os.path.abspath(__file__))
        template_path = os.path.join(base_dir, 'comprobante_template.html')
        
        with open(template_path, 'r', encoding='utf-8') as f:
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
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
        return response, 200

    def add_cors_headers(resp):
        resp.headers.add('Access-Control-Allow-Origin', '*')
        return resp

    # Validar configuración
    if not PAYWAY_SITE_ID or not PAYWAY_PRIVATE_KEY:
         return add_cors_headers(jsonify({"error": "Credenciales de Payway no configuradas."})), 500

    # Obtener datos (Soporte para GET y POST)
    total_amount = None
    payer_email = 'email@test.com'
    if request.method == 'POST':
        data = request.json
        total_amount = data.get('unit_price')
        payer_email = data.get('items_to_pay', {}).get('email', payer_email)
    else:
        total_amount = request.args.get('amount')
        payer_email = request.args.get('email', payer_email)

    if not total_amount:
        return add_cors_headers(jsonify({"error": "Falta el monto."})), 400

    try:
        # --- PASO 1: SOLICITAR HASH A PAYWAY ---
        # El monto debe ser entero en centavos para la API REST
        amount_cents = int(float(total_amount) * 100)
        operation_id = f"TR-{int(datetime.now().timestamp())}"
        
        payload = {
            "site": {
                "site_id": PAYWAY_SITE_ID,
                "transaction_id": operation_id,
                "template": { "id": 34164 } # Forzamos el ID de producción correcto
            },
            "customer": {
                "id": payer_email.split('@')[0], # ID de usuario simple
                "email": payer_email,
                "ip_address": request.remote_addr # IP del cliente
            },
            "fraud_detection": {
                "send_to_cs": True,
                "channel": "Web",
                "dispatch_method": "digital",
                "bill_to": {
                    "city": "Villa Traful",
                    "country": "AR",
                    "customer_id": payer_email.split('@')[0],
                    "email": payer_email,
                    "first_name": "Contribuyente", # Genérico si no tenemos nombre
                    "last_name": "Traful",
                    "phone_number": "11111111", # Teléfono genérico requerido
                    "postal_code": "8403", # CP Villa Traful
                    "state": "NQ",
                    "street1": "Municipalidad"
                },
                "purchase_totals": {
                    "currency": "ARS",
                    "amount": int(float(total_amount) * 100)
                }
            },
            "payment": {
                "amount": amount_cents,
                "currency": "ARS", # La API moderna prefiere ARS
                "payment_method_id": 1, # Visa por defecto
                "installments": 1,
                "payment_type": "single",
                "sub_payments": []
            },
            "public_apikey": PAYWAY_PUBLIC_KEY,
            "success_url": f"{BACKEND_URL}/api/payway/callback", # Callback al backend para procesar resultado
            "cancel_url": FRONTEND_URL
        }

        headers = {
            "apikey": PAYWAY_PRIVATE_KEY,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
        }

        # URL de la API de Formularios (Producción)
        api_url = "https://api.decidir.com/web/forms"
        
        print(f"DEBUG: Solicitando Hash a Payway para op {operation_id}...")
        response = requests.post(api_url, json=payload, headers=headers, timeout=15)
        
        if response.status_code not in [200, 201]:
            print(f"ERROR API PAYWAY: {response.status_code} - {response.text}")
            return add_cors_headers(jsonify({"error": f"Payway API Error: {response.text}"})), response.status_code

        res_data = response.json()
        form_hash = res_data.get('hash')
        
        if not form_hash:
            return add_cors_headers(jsonify({"error": "No se recibió el hash de pago."})), 500

        # --- PASO 2: CONSTRUIR URL DE REDIRECCIÓN FINAL ---
        # Esta es la URL a la que el usuario debe ir para ver su formulario
        final_redirect_url = f"https://live.decidir.com/web/forms/{form_hash}?apikey={PAYWAY_PUBLIC_KEY}"

        log_to_airtable('INFO', 'Payway', f'Hash de pago generado: {form_hash}', related_id=operation_id)
        
        return add_cors_headers(jsonify({
            "payment_id": operation_id,
            "init_point": final_redirect_url, 
            "message": "Redirigiendo a Payway..."
        }))

    except Exception as e:
        log_to_airtable('ERROR', 'Payway', f'Excepción en create_payway_payment: {e}')
        return add_cors_headers(jsonify({"error": str(e)})), 500

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
            "moneda": "032" # Pesos ARS
        }
        signature = generar_firma_sps(params_firma, PAYWAY_PRIVATE_KEY)
        
        # HTML con Botón Manual y campos duplicados para compatibilidad
        html_form = f"""
        <html>
        <head>
            <title>Confirmar Pago</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8f9fa; }}
                .card {{ background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 450px; width: 95%; }}
                .btn {{ background-color: #007bff; color: white; padding: 14px 28px; border: none; border-radius: 8px; font-size: 1.2rem; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 1.5rem; font-weight: bold; width: 100%; }}
                .btn:hover {{ background-color: #0056b3; transform: translateY(-1px); }}
                .monto {{ font-size: 2rem; color: #28a745; margin: 10px 0; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Confirmar Pago</h2>
                <p>Estás por pagar de forma segura con Payway.</p>
                <div class="monto">${amount}</div>
                
                <form name="payway_form" action="https://live.decidir.com/sps-service/v1/payment-requests" method="POST">
                    <!-- Campos Estándar -->
                    <input type="hidden" name="id_site" value="{PAYWAY_SITE_ID}">
                    <input type="hidden" name="idSite" value="{PAYWAY_SITE_ID}">
                    <input type="hidden" name="nro_operacion" value="{op_id}">
                    <input type="hidden" name="monto" value="{amount}">
                    <input type="hidden" name="moneda" value="032">
                    <input type="hidden" name="id_template" value="{PAYWAY_TEMPLATE_ID}">
                    <input type="hidden" name="template_id" value="{PAYWAY_TEMPLATE_ID}">
                    <input type="hidden" name="email_comprador" value="{email}">
                    
                    <!-- Campos de Seguridad -->
                    <input type="hidden" name="signature" value="{signature}">
                    <input type="hidden" name="hash" value="{signature}">
                    
                    <button type="submit" class="btn">Pagar con Tarjeta &rarr;</button>
                </form>
                <p style="margin-top: 1rem; font-size: 0.8rem; color: #6c757d;">Serás redirigido a la plataforma segura de pagos.</p>
            </div>
        </body>
        </html>
        """
        return html_form

    except Exception as e:
         return f"Error generando formulario de pago: {str(e)}", 500

@app.route('/api/payway/callback', methods=['POST', 'GET'])
def payway_callback():
    log_to_airtable('INFO', 'Payway Callback', 'Recibido callback de Payway', details={'method': request.method, 'args': request.args, 'form': request.form})
    
    # Payway suele enviar datos por POST en el success_url
    data = request.form if request.method == 'POST' else request.args
    
    # Extraer ID de operación y Estado
    operation_id = data.get('nro_operacion') or data.get('site_transaction_id')
    status = data.get('status') or data.get('sitio_organismo_id') # A veces Payway varía los campos
    
    # Si no hay ID, redirigir a home
    if not operation_id:
        return redirect(f"{FRONTEND_URL}/")

    # Intentar registrar en Airtable si fue aprobado
    # Nota: Payway envía muchos campos, lo ideal es validar 'status' == 'approved' o similar.
    # En SPS, a veces el éxito se asume si llegas a esta URL.
    
    try:
        # Registrar en Historial (Airtable)
        historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
        historial_record = historial_table.create({
            'Estado': 'Payway - Procesado', 
            'Monto': 0, # Deberíamos extraerlo del ID o buscarlo
            'Detalle': f"Pago Payway ID: {operation_id}",
            'MP_Payment_ID': f"PW-{operation_id}",
            'ItemsPagadosJSON': json.dumps(dict(data)) # Guardamos todo lo que mandó Payway para debug
        })
        log_to_airtable('INFO', 'Payway Callback', f'Pago registrado en historial con ID: {historial_record["id"]}')
        
        # Redirigir al usuario a la pantalla de éxito del frontend con el ID de pago
        return redirect(f"{FRONTEND_URL}/#/exito?payment_id={operation_id}")
        
    except Exception as e:
        log_to_airtable('ERROR', 'Payway Callback', f'Error procesando callback: {e}')
        return redirect(f"{FRONTEND_URL}/#/exito?error=procesamiento")

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
            
            # Caso Especial: Recaudación Manual
            if items_context.get('type') == 'recaudacion_manual':
                # Buscar en tabla Recaudacion por Preference ID (que es el external_reference o linked)
                # Como el external reference del webhook es lo que mandamos, pero el ID de preferencia esta en el payment info
                pref_id = payment_info.get('order', {}).get('id') or payment_info.get('authorization_code') # MP a veces varia estructura
                # Mejor estrategia: Buscar por Email y Monto o intentar matchear Preference ID si lo guardamos.
                
                # Búsqueda en Airtable
                recaudacion_table = api.table(BASE_ID, RECAUDACION_TABLE_ID)
                # Buscamos registros pendientes con ese email (simplificación)
                records = recaudacion_table.all(formula=match({"Email": items_context.get('email'), "Estado Pago": "Pendiente"}))
                
                for r in records:
                    # Verificar monto aproximado (float safe)
                    if abs(float(r['fields'].get('Total', 0)) - float(monto_pagado)) < 1.0:
                        recaudacion_table.update(r['id'], {"Estado Pago": "Pagado", "MP Payment ID": str(payment_id)})
                        items_for_pdf.append({"description": "Pago Recaudación Manual", "amount": monto_pagado})
                        log_to_airtable('INFO', 'Payment Process', f'Actualizado registro recaudación {r["id"]}')
                        break
            
            # Caso Estándar (Deudas previas)
            elif "record_id" in items_context:
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

# --- NUEVOS ENDPOINTS ADMINISTRATIVOS ---

@app.route('/api/staff/register_access', methods=['POST'])
def register_staff_access():
    data = request.json
    username = data.get('username')
    if not username or not api:
        return jsonify({"error": "Datos incompletos"}), 400
    
    try:
        table = api.table(BASE_ID, ACCESOS_PERSONAL_TABLE_ID)
        now = datetime.now()
        table.create({
            "Fecha": now.strftime("%Y-%m-%d"),
            "Hora": now.strftime("%H:%M:%S"),
            "Usuario": username,
            "IP": request.remote_addr
        })
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/recaudacion', methods=['GET'])
def admin_get_recaudacion():
    if not api: return jsonify({"error": "Airtable no inicializada"}), 500
    try:
        page = int(request.args.get('page', 1))
        per_page = 10
        table = api.table(BASE_ID, RECAUDACION_TABLE_ID)
        all_records = table.all(sort=['-Fecha'])
        
        start = (page - 1) * per_page
        end = start + per_page
        paginated = all_records[start:end]
        
        records = []
        for r in paginated:
            f = r['fields']
            records.append({
                "id": r['id'],
                "fecha": f.get('Fecha'),
                "contribuyente": f.get('Contribuyente'),
                "email": f.get('Email'),
                "total": f.get('Total'),
                "subtotal": f.get('Total') / (1 - (float(f.get('Descuento', 0))/100)) if f.get('Descuento') else f.get('Total'), # Estimado si no se guardó
                "descuento": f.get('Descuento', 0), # Asumiendo que agregamos este campo a Airtable o lo sacamos del JSON
                "operador": f.get('Operador'),
                "transferencia": f.get('Transferencia'),
                "detalle": f.get('Detalle JSON')
            })
            
        return jsonify({"records": records, "total_records": len(all_records), "per_page": per_page})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/patentes_manuales', methods=['GET'])
def admin_get_patentes():
    if not api: return jsonify({"error": "Airtable no inicializada"}), 500
    try:
        page = int(request.args.get('page', 1))
        per_page = 10
        table = api.table(BASE_ID, PATENTE_MANUAL_TABLE_ID)
        all_records = table.all(sort=['-Fecha'])
        
        start = (page - 1) * per_page
        end = start + per_page
        paginated = all_records[start:end]
        
        records = []
        for r in paginated:
            f = r['fields']
            records.append({
                "id": r['id'],
                "fecha": f.get('Fecha'),
                "dominio": f.get('Dominio'),
                "vehiculo": f.get('Vehículo'),
                "anio": f.get('Año'),
                "contribuyente": f.get('Contribuyente'),
                "operador": f.get('Operador'),
                "total": f.get('Total'),
                "transferencia": f.get('Transferencia')
            })
            
        return jsonify({"records": records, "total_records": len(all_records), "per_page": per_page})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/access_logs', methods=['GET'])
def admin_get_access_logs():
    if not api: return jsonify({"error": "Airtable no inicializada"}), 500
    try:
        page = int(request.args.get('page', 1))
        per_page = 10
        table = api.table(BASE_ID, ACCESOS_PERSONAL_TABLE_ID)
        all_records = table.all(sort=['-Fecha', '-Hora'])
        
        start = (page - 1) * per_page
        end = start + per_page
        paginated = all_records[start:end]
        
        logs = []
        for r in paginated:
            f = r['fields']
            logs.append({
                "id": r['id'],
                "fecha": f.get('Fecha'),
                "hora": f.get('Hora'),
                "usuario": f.get('Usuario'),
                "ip": f.get('IP')
            })
            
        return jsonify({"logs": logs, "total_records": len(all_records), "per_page": per_page})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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