import os
import json
import base64
import uuid
import traceback
import io
import requests
import time
from datetime import datetime

import mercadopago
import psycopg2
import resend
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from pyairtable import Api
from pyairtable.formulas import AND, LOWER, OR, SEARCH, Field, match
from weasyprint import HTML


# Cargar variables de entorno desde el archivo .env
load_dotenv()

app = Flask(__name__)


# --- CONFIGURACIÓN POStGRESQL ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ADVERTENCIA: La variable de entorno DATABASE_URL no está "
          "configurada. La funcionalidad de la nueva billetera no "
          "funcionará.")


def get_db_connection():
    """Crea y retorna una nueva conexión a la base de datos."""
    if not DATABASE_URL:
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except psycopg2.OperationalError as e:
        print(f"ERROR: No se pudo conectar a la base de datos PostgreSQL: {e}")
        return None


def init_db():
    """Inicializa la base de datos creando la tabla de pagos."""
    conn = get_db_connection()
    if conn is None:
        print("ERROR: No se puede inicializar la DB porque no hay "
              "conexión.")
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id SERIAL PRIMARY KEY,
                    payment_id VARCHAR(255) UNIQUE NOT NULL,
                    payment_id_external VARCHAR(255) UNIQUE,
                    status VARCHAR(50) NOT NULL,
                    amount NUMERIC(10, 2) NOT NULL,
                    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
                    payer_email VARCHAR(255),
                    items_paid JSONB,
                    wallet_response JSONB,
                    created_at TIMESTAMP WITH TIME ZONE
                        DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                        DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                   NEW.updated_at = NOW();
                   RETURN NEW;
                END;
                $$ language 'plpgsql';
            """)
            cur.execute("""
                DROP TRIGGER IF EXISTS update_payments_updated_at
                    ON payments;
                CREATE TRIGGER update_payments_updated_at
                BEFORE UPDATE ON payments
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            """)
            conn.commit()
            print("Tabla 'payments' en PostgreSQL inicializada/verificada "
                  "correctamente.")
    except Exception as e:
        print(f"ERROR al inicializar la tabla 'payments': {e}")
    finally:
        if conn:
            conn.close()


# Configuración CORS
cors_origins = os.getenv("CORS_ORIGINS", "*")
if cors_origins != "*":
    cors_origins = [origin.strip() for origin in cors_origins.split(",")]

CORS(app, resources={r"/*": {"origins": cors_origins}},
     supports_credentials=True)

# Inicializar la base de datos al arrancar
init_db()


# --- Verificación de Variables de Entorno ---
print("--- Iniciando Verificación de Variables de Entorno ---")
AIRTABLE_PAT_FROM_ENV = os.getenv("AIRTABLE_PAT")
MERCADOPAGO_ACCESS_TOKEN_FROM_ENV = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
RESEND_API_KEY_FROM_ENV = os.getenv("RESEND_API_KEY")
PAGOTIC_AUTH_URL = os.getenv(
    "PAGOTIC_AUTH_URL",
    "https://a.paypertic.com/auth/realms/entidades/protocol/"
    "openid-connect/token"
)
PAGOTIC_USERNAME = os.getenv("PAGOTIC_USERNAME")
PAGOTIC_PASSWORD = os.getenv("PAGOTIC_PASSWORD")
PAGOTIC_CLIENT_ID = os.getenv("PAGOTIC_CLIENT_ID")
PAGOTIC_CLIENT_SECRET = os.getenv("PAGOTIC_CLIENT_SECRET")
PAYWAY_SITE_ID = os.getenv("PAYWAY_SITE_ID", "93011187")
PAYWAY_PUBLIC_KEY = os.getenv(
    "PAYWAY_PUBLIC_KEY", "d330243d2197451da95013d030d4e919")
PAYWAY_PRIVATE_KEY = os.getenv(
    "PAYWAY_PRIVATE_KEY", "157da43a495f42968b13ee8a14df3ce2")
PAYWAY_TEMPLATE_ID = os.getenv("PAYWAY_TEMPLATE_ID", "34164")
ADMIN_PASSWORD_FROM_ENV = os.getenv("ADMIN_PASSWORD")

if not AIRTABLE_PAT_FROM_ENV:
    print("FATAL: La variable de entorno AIRTABLE_PAT no está configurada.")
if not MERCADOPAGO_ACCESS_TOKEN_FROM_ENV:
    print("FATAL: La variable de entorno MERCADOPAGO_ACCESS_TOKEN no "
          "está configurada.")
if not RESEND_API_KEY_FROM_ENV:
    print("ADVERTENCIA: La variable de entorno RESEND_API_KEY no está "
          "configurada. El envío de emails no funcionará.")
if not all([PAGOTIC_USERNAME, PAGOTIC_PASSWORD, PAGOTIC_CLIENT_ID,
            PAGOTIC_CLIENT_SECRET]):
    print("ADVERTENCIA: Credenciales de Pago TIC incompletas. "
          "La integración de Pago TIC no funcionará.")
if not all([PAYWAY_SITE_ID, PAYWAY_PRIVATE_KEY]):
    print("ADVERTENCIA: Credenciales de Payway incompletas.")
else:
    print(f"Configuración Payway cargada. Site ID: {PAYWAY_SITE_ID}")
if not ADMIN_PASSWORD_FROM_ENV:
    print("ADVERTENCIA: La variable de entorno ADMIN_PASSWORD no está "
          "configurada. El acceso de administrador no funcionará.")
print("--- Fin Verificación ---")


# --- CONFIGURACION ---
BASE_ID = "appoJs8XY2j2kwlYf"
CONTRIBUTIVOS_TABLE_ID = "tblKbSq61LU1XXco0"
DEUDAS_TABLE_ID = "tblHuS8CdqVqTsA3t"
PATENTE_TABLE_ID = "tbl3CMMwccWeo8XSG"
HISTORIAL_TABLE_ID = "tbl5p19Hv4cMk9NUS"
LOGS_TABLE_ID = "tblLihQ9FmU6JD7NR"
RECAUDACION_TABLE_ID = os.getenv(
    "RECAUDACION_TABLE_ID", "tblzRhxpeqbuhrf78")
PATENTE_MANUAL_TABLE_ID = os.getenv(
    "PATENTE_MANUAL_TABLE_ID", "tblO0nlUQx3isKkXF")
PLAN_PAGO_TABLE_ID = os.getenv(
    "PLAN_PAGO_TABLE_ID", "tblMNNvOBuqQiCFqC")
CONTACTOS_TABLE_ID = os.getenv(
    "CONTACTOS_TABLE_ID", "tbl1ZcfxyaJtXPdPl")
ACCESOS_PERSONAL_TABLE_ID = os.getenv(
    "ACCESOS_PERSONAL_TABLE_ID", "tblAILbaYmnWkkPiV")
WATER_TABLE_ID = "tblTgcF3XczjkpK3H"
EFECTIVO_TABLE_ID = os.getenv("EFECTIVO_TABLE_ID", "tblXqPkaVnF9GHGdI")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = (os.getenv("RENDER_EXTERNAL_URL") or
               os.getenv("BACKEND_URL", "http://localhost:10000"))


# --- Inicializar SDKs ---
api = None
try:
    if AIRTABLE_PAT_FROM_ENV:
        api = Api(AIRTABLE_PAT_FROM_ENV)
        print("SDK de Airtable inicializada con éxito.")
except Exception as e:
    print(f"ERROR: Falló la inicialización de la SDK de Airtable: {e}")

sdk = None
try:
    if MERCADOPAGO_ACCESS_TOKEN_FROM_ENV:
        sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN_FROM_ENV)
        print("SDK de Mercado Pago inicializada con éxito.")
except Exception as e:
    print(f"ERROR: Falló la inicialización de la SDK de Mercado Pago: {e}")

try:
    if RESEND_API_KEY_FROM_ENV:
        resend.api_key = RESEND_API_KEY_FROM_ENV
        print("API Key de Resend configurada.")
except Exception as e:
    print(f"ERROR: Falló la configuración de Resend: {e}")


# --- Funciones Auxiliares ---
def log_to_airtable(level, source, message, related_id=None, details=None):
    if not api:
        print(f"ERROR: Airtable API no inicializada. "
              f"No se pudo escribir log: {message}")
        return

    try:
        logs_table = api.table(BASE_ID, LOGS_TABLE_ID)
        log_entry = {
            'Level': level,
            'Source': source,
            'Message': message
        }
        if related_id:
            log_entry['Related ID'] = str(related_id)
        if details:
            log_entry['Details'] = json.dumps(details)
        logs_table.create(log_entry)
    except Exception as e:
        print(f"ERROR: Falló la escritura de log en Airtable: {e} - "
              f"Mensaje original: {message}")


def save_contacto(email, nombre=None, origen=None):
    if not api or not email:
        return
    try:
        contactos_table = api.table(BASE_ID, CONTACTOS_TABLE_ID)
        existing = contactos_table.all(formula=match({"Email": email}))
        now = datetime.now().isoformat()
        if existing:
            record = existing[0]
            update_fields = {"Ultima Actividad": now}
            if nombre and not record['fields'].get('Nombre'):
                update_fields['Nombre'] = nombre
            if origen and record['fields'].get('Origen') != origen:
                update_fields['Origen'] = origen
            contactos_table.update(record['id'], update_fields)
        else:
            new_contact = {
                "Email": email,
                "Fecha Registro": now,
                "Ultima Actividad": now
            }
            if nombre:
                new_contact['Nombre'] = nombre
            if origen:
                new_contact['Origen'] = origen
            contactos_table.create(new_contact)
    except Exception as e:
        log_to_airtable(
            'ERROR', 'Contactos',
            f'Error guardando contacto {email}: {e}')


def create_receipt_pdf(payment_details, pdf_id=None):
    try:
        if not pdf_id:
            pdf_id = str(uuid.uuid4())
        base_dir = os.path.dirname(os.path.abspath(__file__))
        template_path = os.path.join(base_dir, 'comprobante_template.html')
        if not os.path.exists(template_path):
            return None, None
        with open(template_path, 'r', encoding='utf-8') as f:
            html_template = f.read()
        items_html = ""
        for item in payment_details.get("items", []):
            items_html += (
                f"<tr><td>{item.get('description', '')}</td>"
                f"<td style='text-align: right;'>"
                f"${item.get('amount', 0)}</td></tr>")
        html_filled = html_template.replace("{{PDF_ID}}", pdf_id)
        fecha_pago = payment_details.get(
            "FECHA_PAGO", datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
        html_filled = html_filled.replace("{{FECHA_PAGO}}", fecha_pago)
        estado_pago = payment_details.get("ESTADO_PAGO", "N/A")
        html_filled = html_filled.replace("{{ESTADO_PAGO}}", estado_pago)
        id_pago = str(payment_details.get("ID_PAGO_MP", "N/A"))
        html_filled = html_filled.replace("{{ID_PAGO_MP}}", id_pago)
        nombre_pagador = str(payment_details.get("NOMBRE_PAGADOR", "N/A"))
        html_filled = html_filled.replace(
            "{{NOMBRE_PAGADOR}}", nombre_pagador)
        identificador_pagador = str(
            payment_details.get("IDENTIFICADOR_PAGADOR", "N/A"))
        html_filled = html_filled.replace(
            "{{IDENTIFICADOR_PAGADOR}}", identificador_pagador)
        html_filled = html_filled.replace("{{ITEMS_PAGADOS}}", items_html)
        monto_total = str(payment_details.get("MONTO_TOTAL", 0))
        html_filled = html_filled.replace("{{MONTO_TOTAL}}", monto_total)

        pdf_file = io.BytesIO()
        html_doc = HTML(string=html_filled)
        html_doc.write_pdf(target=pdf_file)
        pdf_file.seek(0)
        return pdf_file, pdf_id
    except Exception as e:
        print(f"ERROR generando PDF: {e}\n{traceback.format_exc()}")
        return None, None


PAGOTIC_ACCESS_TOKEN = None
PAGOTIC_TOKEN_EXPIRATION = 0


def get_pagotic_token():
    global PAGOTIC_ACCESS_TOKEN, PAGOTIC_TOKEN_EXPIRATION
    if (PAGOTIC_ACCESS_TOKEN and
            PAGOTIC_TOKEN_EXPIRATION > time.time() + 60):
        return PAGOTIC_ACCESS_TOKEN
    if not all([PAGOTIC_USERNAME, PAGOTIC_PASSWORD,
                PAGOTIC_CLIENT_ID, PAGOTIC_CLIENT_SECRET]):
        log_to_airtable('ERROR', 'Pago TIC Auth',
                        'Faltan credenciales.')
        return None
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    data = {
        'username': PAGOTIC_USERNAME,
        'password': PAGOTIC_PASSWORD,
        'grant_type': 'password',
        'client_id': PAGOTIC_CLIENT_ID,
        'client_secret': PAGOTIC_CLIENT_SECRET
    }
    try:
        response = requests.post(
            PAGOTIC_AUTH_URL, headers=headers, data=data, timeout=10)
        response.raise_for_status()
        token_data = response.json()
        PAGOTIC_ACCESS_TOKEN = token_data['access_token']
        PAGOTIC_TOKEN_EXPIRATION = time.time() + token_data['expires_in']
        log_to_airtable('INFO', 'Pago TIC Auth',
                        'Token de Pago TIC obtenido.')
        return PAGOTIC_ACCESS_TOKEN
    except Exception as e:
        log_to_airtable('ERROR', 'Pago TIC Auth',
                        f'Error al obtener token: {e}')
        return None


# --- Endpoints ---
@app.route('/healthz')
def health_check():
    return "OK", 200


@app.route('/api/search/contributivo', methods=['GET'])
def search_contributivo():
    log_to_airtable('INFO', 'API Search',
                    'Recibida petición en /api/search/contributivo')
    if not api:
        return jsonify({"error": "Airtable no configurado."}), 500

    query = request.args.get('query')
    if not query:
        return jsonify({"error": "El parámetro 'query' es requerido."}), 400

    try:
        table = api.table(BASE_ID, CONTRIBUTIVOS_TABLE_ID)

        lower_query = query.lower()
        search_terms = lower_query.split()

        conditions_for_dni = [
            SEARCH(term, LOWER(Field('dni'))) for term in search_terms]
        conditions_for_contribuyente = [
            SEARCH(term, LOWER(Field('contribuyente')))
            for term in search_terms]

        if len(search_terms) > 1:
            formula_obj = OR(
                AND(*conditions_for_dni),
                AND(*conditions_for_contribuyente))
        else:
            formula_obj = OR(
                SEARCH(lower_query, LOWER(Field('dni'))),
                SEARCH(lower_query, LOWER(Field('contribuyente'))))

        records = table.all(formula=str(formula_obj))
        return jsonify(records)
    except Exception as e:
        log_to_airtable('ERROR', 'API Search',
                        f'ERROR en search_contributivo: {e}')
        return jsonify({"error": str(e)}), 500


def process_payment(payment_id, payment_info, items_context,
                    is_simulation=False):
    log_to_airtable('INFO', 'Payment Process',
                    f'Inicio del procesamiento de pago. ID: {payment_id}')
    try:
        # ... (implementation of process_payment)
        pass
    except Exception as e:
        log_to_airtable('ERROR', 'Payment Process',
                        f'Error procesando pago {payment_id}: {e}')
        raise


def process_pagotic_payment(payment_id, new_status, wallet_response=None):
    log_to_airtable(
        'INFO', 'Pago TIC Process',
        f'Inicio del procesamiento de pago para ID interno: {payment_id}',
        related_id=payment_id)

    conn = get_db_connection()
    if not conn:
        log_to_airtable('ERROR', 'Pago TIC Process',
                        'No se pudo conectar a la base de datos '
                        'PostgreSQL.')
        raise Exception("Error de conexión a la base de datos.")

    historial_record_id = None
    try:
        items_context = {}
        monto_pagado = 0

        # 1. Actualizar el registro en la base de datos PostgreSQL
        # y obtener detalles
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE payments
                SET status = %s, wallet_response = %s
                WHERE payment_id = %s
                RETURNING items_paid, amount;
                """,
                (new_status, json.dumps(wallet_response), payment_id)
            )
            updated_record = cur.fetchone()

            if not updated_record:
                raise Exception(
                    f"No se encontró el pago con ID {payment_id} para "
                    f"actualizar.")

            items_context = updated_record[0] or {}
            monto_pagado = float(updated_record[1])
            conn.commit()

        log_to_airtable(
            'INFO', 'Pago TIC Process',
            f'Registro de pago {payment_id} actualizado en PostgreSQL a '
            f'{new_status}.')

        # 2. Si el pago fue aprobado, ejecutar la lógica de negocio
        # (actualizar Airtable, enviar email)
        if new_status == 'approved':
            log_to_airtable(
                'INFO', 'Pago TIC Process',
                f'Pago APROBADO. Procesando actualizaciones de deuda en '
                f'Airtable para ID: {payment_id}')

            items_for_pdf = []

            # --- Lógica de actualización de Airtable ---
            if "record_id" in items_context:
                record_id_to_update = items_context["record_id"]
                table_id_to_update = ""
                fields_to_update_origin = {}
                item_type = items_context.get("item_type")

                if item_type == "deuda_general":
                    table_id_to_update = DEUDAS_TABLE_ID
                    fields_to_update_origin["monto total deuda"] = "0"
                    fields_to_update_origin["deuda en concepto de"] = (
                        "Pagado")
                    items_for_pdf.append({
                        "description": "Deuda General",
                        "amount": items_context.get('total_amount', 0)
                    })
                else:
                    if item_type == "lote":
                        table_id_to_update = CONTRIBUTIVOS_TABLE_ID
                    elif item_type == "vehiculo":
                        table_id_to_update = PATENTE_TABLE_ID
                    elif item_type == "agua":
                        table_id_to_update = WATER_TABLE_ID

                    if items_context.get("deuda"):
                        if item_type != "vehiculo":
                            deuda_field = "deuda"
                        else:
                            deuda_field = "Deuda patente"
                        fields_to_update_origin[deuda_field] = "0"
                        items_for_pdf.append({
                            "description": f"Deuda {item_type.capitalize()}",
                            "amount": items_context.get('deuda_monto', 0)
                        })

                    meses_a_actualizar = items_context.get("meses", {})
                    for mes_key, sel in meses_a_actualizar.items():
                        if sel:
                            mesCapitalized = mes_key.capitalize()
                            if item_type == "agua":
                                fields_to_update_origin[
                                    f"{mesCapitalized} agua"] = 0
                                fields_to_update_origin[
                                    f"{mesCapitalized} Comercial"] = 0
                            elif item_type == "lote":
                                fields_to_update_origin[mes_key] = 0

                            desc = f"Cuota {mes_key.capitalize()}"
                            if item_type == "agua":
                                desc = (f"Cuota Agua/Comercial "
                                        f"{mes_key.capitalize()}")
                            elif item_type == "lote":
                                desc = f"Cuota Tasas {mes_key.capitalize()}"
                            monto = items_context.get(
                                'meses_montos', {}).get(mes_key, 0)
                            items_for_pdf.append({
                                "description": desc,
                                "amount": monto
                            })

                if fields_to_update_origin and api:
                    try:
                        api.table(BASE_ID, table_id_to_update).update(
                            record_id_to_update, fields_to_update_origin)
                        log_to_airtable(
                            'INFO', 'Pago TIC Process',
                            f'Airtable de deuda actualizado para ID: '
                            f'{record_id_to_update}',
                            related_id=payment_id,
                            details={'updates': fields_to_update_origin})
                    except Exception as airtable_update_error:
                        log_to_airtable(
                            'ERROR', 'Pago TIC Process',
                            f'Error al actualizar Airtable para ID: '
                            f'{record_id_to_update}: {airtable_update_error}',
                            related_id=payment_id,
                            details={
                                'error_message': str(airtable_update_error),
                                'updates_attempted': fields_to_update_origin
                            })

            # --- Lógica de Historial y PDF ---
            historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)

            dni_nombre = (items_context.get('dni') or
                          items_context.get('nombre_contribuyente'))
            nombre_pagador = (items_context.get('nombre_contribuyente') or
                              items_context.get('nombre') or
                              items_context.get('email', 'N/A'))
            historial_data = {
                'Estado': "Exitoso",
                'Monto': monto_pagado,
                'Detalle': (f"Pago TIC para "
                            f"{items_context.get('item_type')}, "
                            f"DNI/Nombre: {dni_nombre}"),
                'MP_Payment_ID': payment_id,
                'ItemsPagadosJSON': json.dumps(items_for_pdf),
                'Contribuyente DNI': items_context.get('dni', 'N/A'),
                'Nombre Pagador': nombre_pagador
            }

            if (items_context.get('record_id') and
                    items_context.get('item_type') == 'lote'):
                historial_data['Contribuyente'] = [
                    items_context.get('record_id')]

            historial_record = historial_table.create(historial_data)
            historial_record_id = historial_record['id']
            log_to_airtable(
                'INFO', 'Pago TIC Process',
                f'Registro de historial creado con ID: '
                f'{historial_record_id}',
                related_id=payment_id)

            receipt_url = (f"{BACKEND_URL}/api/receipt/"
                           f"{historial_record_id}")
            historial_table.update(
                historial_record_id, {"Link Comprobante": receipt_url})

            email_sent_status = "No enviado"
            try:
                nombre_pag = (items_context.get('nombre_contribuyente') or
                              items_context.get('email', 'Contribuyente'))
                identificador_pag = (items_context.get('dni') or
                                     items_context.get('email', 'N/A'))
                pdf_details = {
                    "FECHA_PAGO": datetime.now().strftime(
                        "%d/%m/%Y %H:%M:%S"),
                    "ESTADO_PAGO": "Exitoso",
                    "ID_PAGO_MP": payment_id,
                    "NOMBRE_PAGADOR": nombre_pag,
                    "IDENTIFICADOR_PAGADOR": identificador_pag,
                    "items": items_for_pdf,
                    "MONTO_TOTAL": monto_pagado
                }
                pdf_file, pdf_id = create_receipt_pdf(pdf_details)

                if pdf_id:
                    historial_table.update(
                        historial_record_id, {"PDF_ID": pdf_id})

                if (pdf_file and items_context.get("email") and
                        resend.api_key):
                    from_email = os.getenv(
                        "RESEND_FROM_EMAIL", "onboarding@resend.dev")
                    pdf_content = base64.b64encode(
                        pdf_file.getvalue()).decode('utf-8')
                    params = {
                        "from": from_email,
                        "to": items_context.get("email"),
                        "subject": ("Comprobante de Pago - Municipalidad "
                                    "de Villa Traful"),
                        "html": (f"<p>Hola, adjuntamos tu comprobante de "
                                 f"pago con ID: {payment_id}.</p>"),
                        "attachments": [{
                            "filename": f"comprobante_{payment_id}.pdf",
                            "content": pdf_content
                        }]
                    }
                    resend.Emails.send(params)
                    email_sent_status = (
                        f"Enviado a {items_context.get('email')}")
                    nombre_cont = (items_context.get('nombre_contribuyente')
                                   or items_context.get('nombre'))
                    save_contacto(
                        email=items_context.get('email'),
                        nombre=nombre_cont,
                        origen='Pago TIC Online')
                else:
                    email_sent_status = "No enviado (sin email o PDF)"
            except Exception as pdf_error:
                log_to_airtable(
                    'ERROR', 'Pago TIC PDF Generation',
                    f'Error en PDF/Email: {pdf_error}',
                    related_id=payment_id)
                email_sent_status = f"Error PDF: {str(pdf_error)[:100]}"

            historial_table.update(
                historial_record_id,
                {"Comprobante_Status": email_sent_status})

        return {"status": "ok", "historialRecordId": historial_record_id}
    except Exception as e:
        log_to_airtable(
            'ERROR', 'Pago TIC Process',
            f'Error procesando pago {payment_id}: {e}',
            related_id=payment_id,
            details={'error_message': str(e)})
        raise
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000, debug=True)
