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


# --- CONFIGURACI├ôN POStGRESQL ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ADVERTENCIA: La variable de entorno DATABASE_URL no est├í "
          "configurada. La funcionalidad de la nueva billetera no "
          "funcionar├í.")


def get_db_connection():
    """Crea y retorna una nueva conexi├│n a la base de datos."""
    if not DATABASE_URL:
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except psycopg2.OperationalError as e:
        print(f"ERROR: No se pudo conectar a la base de datos PostgreSQL: {e}")
        return None


def validate_admin_auth():
    """
    Valida la autenticaci├│n del administrador desde el header Authorization.
    Retorna (is_valid, error_response) donde error_response es None si es v├ílido.
    """
    auth_header = request.headers.get('Authorization')

    if not auth_header:
        print("[DEBUG] No auth header provided")
        return False, (jsonify({"error": "No autorizado - No se proporcion├│ token"}), 401)

    if not ADMIN_PASSWORD_FROM_ENV:
        print("[ERROR] ADMIN_PASSWORD environment variable not set!")
        return False, (jsonify({"error": "Error de configuraci├│n del servidor"}), 500)

    if ADMIN_PASSWORD_FROM_ENV not in auth_header:
        print(f"[DEBUG] Password mismatch - Auth header: {auth_header[:20]}...")
        return False, (jsonify({"error": "No autorizado - Credenciales inv├ílidas"}), 401)

    return True, None


def init_db():
    """Inicializa la base de datos creando todas las tablas necesarias."""
    conn = get_db_connection()
    if conn is None:
        print("ERROR: No se puede inicializar la DB porque no hay "
              "conexi├│n.")
        return
    try:
        with conn.cursor() as cur:
            # Tabla payments (existente)
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

            # Tabla payment_history - Historial detallado de pagos
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payment_history (
                    id SERIAL PRIMARY KEY,
                    payment_id VARCHAR(255) NOT NULL,
                    comprobante_numero VARCHAR(255),
                    nombre_apellido VARCHAR(255) NOT NULL,
                    dni VARCHAR(50) NOT NULL,
                    email VARCHAR(255),
                    monto NUMERIC(10, 2) NOT NULL,
                    estado VARCHAR(50) NOT NULL,
                    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    items_pagados JSONB,
                    detalles TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id ON payment_history(payment_id);
                CREATE INDEX IF NOT EXISTS idx_payment_history_dni ON payment_history(dni);
                CREATE INDEX IF NOT EXISTS idx_payment_history_fecha_hora ON payment_history(fecha_hora);
                CREATE INDEX IF NOT EXISTS idx_payment_history_estado ON payment_history(estado);
            """)

            # Tabla error_logs - Registro de errores y logs
            cur.execute("""
                CREATE TABLE IF NOT EXISTS error_logs (
                    id SERIAL PRIMARY KEY,
                    nivel VARCHAR(20) NOT NULL,
                    tipo VARCHAR(100) NOT NULL,
                    mensaje TEXT NOT NULL,
                    payment_id VARCHAR(255),
                    related_id VARCHAR(255),
                    detalles JSONB,
                    stack_trace TEXT,
                    ip_address VARCHAR(50),
                    user_agent TEXT,
                    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_error_logs_nivel ON error_logs(nivel);
                CREATE INDEX IF NOT EXISTS idx_error_logs_tipo ON error_logs(tipo);
                CREATE INDEX IF NOT EXISTS idx_error_logs_payment_id ON error_logs(payment_id);
                CREATE INDEX IF NOT EXISTS idx_error_logs_fecha_hora ON error_logs(fecha_hora);
            """)

            # Tabla contacts - Registro de contactos
            cur.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    dni VARCHAR(50),
                    nombre_apellido VARCHAR(255),
                    celular VARCHAR(50),
                    origen VARCHAR(100),
                    notas TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
                CREATE INDEX IF NOT EXISTS idx_contacts_dni ON contacts(dni);
                CREATE INDEX IF NOT EXISTS idx_contacts_origen ON contacts(origen);
            """)

            # Tabla cash_payments - Registro de pagos en efectivo
            cur.execute("""
                CREATE TABLE IF NOT EXISTS cash_payments (
                    id SERIAL PRIMARY KEY,
                    comprobante_id VARCHAR(255) UNIQUE NOT NULL,
                    tipo_pago VARCHAR(50) NOT NULL,
                    fecha_pago DATE NOT NULL,
                    nombre VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    monto_original NUMERIC(10, 2),
                    descuento NUMERIC(5, 2) DEFAULT 0,
                    monto_total NUMERIC(10, 2) NOT NULL,
                    administrativo VARCHAR(255),
                    detalle TEXT,
                    items_json JSONB,
                    patente VARCHAR(20),
                    marca VARCHAR(100),
                    modelo VARCHAR(100),
                    anio VARCHAR(10),
                    comentarios TEXT,
                    transferencia VARCHAR(255),
                    pdf_enviado BOOLEAN DEFAULT FALSE,
                    email_status VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_cash_payments_comprobante ON cash_payments(comprobante_id);
                CREATE INDEX IF NOT EXISTS idx_cash_payments_tipo ON cash_payments(tipo_pago);
                CREATE INDEX IF NOT EXISTS idx_cash_payments_fecha ON cash_payments(fecha_pago);
                CREATE INDEX IF NOT EXISTS idx_cash_payments_email ON cash_payments(email);
                CREATE INDEX IF NOT EXISTS idx_cash_payments_patente ON cash_payments(patente);
                CREATE INDEX IF NOT EXISTS idx_cash_payments_created ON cash_payments(created_at);
            """)

            # Funci├│n para actualizar updated_at
            cur.execute("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                   NEW.updated_at = NOW();
                   RETURN NEW;
                END;
                $$ language 'plpgsql';
            """)

            # Triggers para updated_at
            cur.execute("""
                DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
                CREATE TRIGGER update_payments_updated_at
                BEFORE UPDATE ON payments
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            """)

            cur.execute("""
                DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
                CREATE TRIGGER update_contacts_updated_at
                BEFORE UPDATE ON contacts
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            """)

            # Trigger para cash_payments
            cur.execute("""
                DROP TRIGGER IF EXISTS update_cash_payments_updated_at ON cash_payments;
                CREATE TRIGGER update_cash_payments_updated_at
                BEFORE UPDATE ON cash_payments
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            """)

            conn.commit()
            print("Ô£à Tablas en PostgreSQL inicializadas correctamente:")
            print("   - payments")
            print("   - payment_history")
            print("   - error_logs")
            print("   - contacts")
            print("   - cash_payments")
    except Exception as e:
        print(f"ERROR al inicializar las tablas: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()


# --- Helper Functions para PostgreSQL ---

def save_payment_history(payment_id, comprobante_numero, nombre_apellido, dni,
                         email, monto, estado, items_pagados=None, detalles=None):
    """Guarda un registro en payment_history."""
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO payment_history
                (payment_id, comprobante_numero, nombre_apellido, dni, email,
                 monto, estado, items_pagados, detalles)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (payment_id, comprobante_numero, nombre_apellido, dni, email,
                  monto, estado, json.dumps(items_pagados) if items_pagados else None,
                  detalles))
            conn.commit()
            print(f"Ô£à Payment history guardado: {payment_id} - {estado}")
    except Exception as e:
        print(f"ERROR al guardar payment_history: {e}")
        conn.rollback()
    finally:
        conn.close()


def save_error_log(nivel, tipo, mensaje, payment_id=None, related_id=None,
                   detalles=None, stack_trace=None):
    """Guarda un registro en error_logs."""
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO error_logs
                (nivel, tipo, mensaje, payment_id, related_id, detalles, stack_trace)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (nivel, tipo, mensaje, payment_id, related_id,
                  json.dumps(detalles) if detalles else None, stack_trace))
            conn.commit()
    except Exception as e:
        print(f"ERROR al guardar error_log: {e}")
        conn.rollback()
    finally:
        conn.close()


def save_contact_db(email, dni=None, nombre_apellido=None, celular=None,
                    origen=None):
    """Guarda o actualiza un contacto en la tabla contacts."""
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO contacts (email, dni, nombre_apellido, celular, origen)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    dni = COALESCE(EXCLUDED.dni, contacts.dni),
                    nombre_apellido = COALESCE(EXCLUDED.nombre_apellido, contacts.nombre_apellido),
                    celular = COALESCE(EXCLUDED.celular, contacts.celular),
                    origen = EXCLUDED.origen,
                    updated_at = CURRENT_TIMESTAMP
            """, (email, dni, nombre_apellido, celular, origen))
            conn.commit()
            print(f"Ô£à Contacto guardado: {email}")
    except Exception as e:
        print(f"ERROR al guardar contacto: {e}")
        conn.rollback()
    finally:
        conn.close()


def save_cash_payment(comprobante_id, tipo_pago, fecha_pago, nombre, email,
                      monto_total, monto_original=None, descuento=0,
                      administrativo=None, detalle=None, items_json=None,
                      patente=None, marca=None, modelo=None, anio=None,
                      comentarios=None, transferencia=None, pdf_enviado=False,
                      email_status=None):
    """Guarda un pago en efectivo en la tabla cash_payments."""
    conn = get_db_connection()
    if not conn:
        print("ADVERTENCIA: No hay conexi├│n DB. Pago en efectivo no guardado en PostgreSQL.")
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cash_payments
                (comprobante_id, tipo_pago, fecha_pago, nombre, email,
                 monto_original, descuento, monto_total, administrativo,
                 detalle, items_json, patente, marca, modelo, anio,
                 comentarios, transferencia, pdf_enviado, email_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (comprobante_id, tipo_pago, fecha_pago, nombre, email,
                  monto_original, descuento, monto_total, administrativo,
                  detalle, json.dumps(items_json) if items_json else None,
                  patente, marca, modelo, anio, comentarios, transferencia,
                  pdf_enviado, email_status))
            conn.commit()
            print(f"Ô£à Pago en efectivo guardado en PostgreSQL: {comprobante_id} - {tipo_pago} - ${monto_total}")
    except Exception as e:
        print(f"ERROR al guardar pago en efectivo: {e}")
        conn.rollback()
    finally:
        conn.close()


# Configuraci├│n CORS
cors_origins = os.getenv("CORS_ORIGINS", "*")
if cors_origins != "*":
    cors_origins = [origin.strip() for origin in cors_origins.split(",")]

CORS(app, resources={r"/*": {"origins": cors_origins}},
     supports_credentials=True)

# Inicializar la base de datos al arrancar
init_db()


# --- Verificaci├│n de Variables de Entorno ---
print("--- Iniciando Verificaci├│n de Variables de Entorno ---")
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
    print("FATAL: La variable de entorno AIRTABLE_PAT no est├í configurada.")
if not MERCADOPAGO_ACCESS_TOKEN_FROM_ENV:
    print("FATAL: La variable de entorno MERCADOPAGO_ACCESS_TOKEN no "
          "est├í configurada.")
if not ADMIN_PASSWORD_FROM_ENV:
    print("FATAL: La variable de entorno ADMIN_PASSWORD no est├í configurada. "
          "El panel de administraci├│n no funcionar├í correctamente.")
if not RESEND_API_KEY_FROM_ENV:
    print("ADVERTENCIA: La variable de entorno RESEND_API_KEY no est├í "
          "configurada. El env├¡o de emails no funcionar├í.")
if not all([PAGOTIC_USERNAME, PAGOTIC_PASSWORD, PAGOTIC_CLIENT_ID,
            PAGOTIC_CLIENT_SECRET]):
    print("ADVERTENCIA: Credenciales de Pago TIC incompletas. "
          "La integraci├│n de Pago TIC no funcionar├í.")
if not all([PAYWAY_SITE_ID, PAYWAY_PRIVATE_KEY]):
    print("ADVERTENCIA: Credenciales de Payway incompletas.")
else:
    print(f"Configuraci├│n Payway cargada. Site ID: {PAYWAY_SITE_ID}")
if not ADMIN_PASSWORD_FROM_ENV:
    print("ADVERTENCIA: La variable de entorno ADMIN_PASSWORD no est├í "
          "configurada. El acceso de administrador no funcionar├í.")
print("--- Fin Verificaci├│n ---")


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
        print("SDK de Airtable inicializada con ├®xito.")
except Exception as e:
    print(f"ERROR: Fall├│ la inicializaci├│n de la SDK de Airtable: {e}")

sdk = None
try:
    if MERCADOPAGO_ACCESS_TOKEN_FROM_ENV:
        sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN_FROM_ENV)
        print("SDK de Mercado Pago inicializada con ├®xito.")
except Exception as e:
    print(f"ERROR: Fall├│ la inicializaci├│n de la SDK de Mercado Pago: {e}")

try:
    if RESEND_API_KEY_FROM_ENV:
        resend.api_key = RESEND_API_KEY_FROM_ENV
        print("API Key de Resend configurada.")
except Exception as e:
    print(f"ERROR: Fall├│ la configuraci├│n de Resend: {e}")


# --- Funciones Auxiliares ---
def log_to_airtable(level, source, message, related_id=None, details=None):
    # Guardar en PostgreSQL
    save_error_log(
        nivel=level,
        tipo=source,
        mensaje=message,
        payment_id=related_id if related_id and 'PAY-' in str(related_id) else None,
        related_id=str(related_id) if related_id else None,
        detalles=details
    )

    # Guardar en Airtable (legacy)
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
        print(f"ERROR: Fall├│ la escritura de log en Airtable: {e} - "
              f"Mensaje original: {message}")


def save_contacto(email, nombre=None, origen=None, dni=None, celular=None):
    if not email:
        return

    # Guardar en PostgreSQL
    save_contact_db(
        email=email,
        dni=dni,
        nombre_apellido=nombre,
        celular=celular,
        origen=origen
    )

    # Guardar en Airtable (legacy)
    if not api:
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
        error_str = str(e)
        # Si el error es por opciones de select inv├ílidas, intentar guardar
        # sin el campo origen
        if 'INVALID_MULTIPLE_CHOICE_OPTIONS' in error_str:
            try:
                log_to_airtable(
                    'WARNING', 'Contactos',
                    f'Valor de origen "{origen}" no v├ílido para {email}. '
                    f'Guardando sin origen.')
                if existing:
                    update_fields_no_origen = {"Ultima Actividad": now}
                    if nombre and not record['fields'].get('Nombre'):
                        update_fields_no_origen['Nombre'] = nombre
                    contactos_table.update(record['id'],
                                           update_fields_no_origen)
                else:
                    new_contact_no_origen = {
                        "Email": email,
                        "Fecha Registro": now,
                        "Ultima Actividad": now
                    }
                    if nombre:
                        new_contact_no_origen['Nombre'] = nombre
                    contactos_table.create(new_contact_no_origen)
            except Exception as retry_error:
                log_to_airtable(
                    'ERROR', 'Contactos',
                    f'Error en reintento guardando contacto {email}: '
                    f'{retry_error}')
        else:
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
                    'Recibida petici├│n en /api/search/contributivo')
    if not api:
        return jsonify({"error": "Airtable no configurado."}), 500

    query = request.args.get('query')
    if not query:
        return jsonify({"error": "El par├ímetro 'query' es requerido."}), 400

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


@app.route('/api/search/agua', methods=['GET'])
def search_agua():
    log_to_airtable('INFO', 'API Search',
                    'Recibida petici├│n en /api/search/agua')
    if not api:
        return jsonify({"error": "Airtable no configurado."}), 500

    query = request.args.get('query')
    if not query:
        return jsonify({"error": "El par├ímetro 'query' es requerido."}), 400

    try:
        table = api.table(BASE_ID, WATER_TABLE_ID)

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
                        f'ERROR en search_agua: {e}')
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

    historial_record_id = None
    items_context = {}
    monto_pagado = 0

    # Intentar obtener datos de PostgreSQL si est├í disponible
    conn = get_db_connection()
    if conn:
        try:
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

                if updated_record:
                    items_context = updated_record[0] or {}
                    monto_pagado = float(updated_record[1])
                    conn.commit()

                    log_to_airtable(
                        'INFO', 'Pago TIC Process',
                        f'Registro de pago {payment_id} actualizado en PostgreSQL a '
                        f'{new_status}.')
        except Exception as db_error:
            log_to_airtable(
                'ERROR', 'Pago TIC Process',
                f'Error actualizando PostgreSQL: {db_error}')
            conn.rollback()
        finally:
            conn.close()
    else:
        log_to_airtable(
            'WARNING', 'Pago TIC Process',
            'PostgreSQL no disponible, continuando sin DB')

        # Si no hay PostgreSQL, intentar obtener datos del metadata del webhook
        if wallet_response and isinstance(wallet_response, dict):
            items_context = wallet_response.get('metadata', {})
            # Intentar obtener el monto del webhook
            if 'final_amount' in wallet_response:
                monto_pagado = float(wallet_response.get('final_amount', 0))
            elif 'amount' in wallet_response:
                monto_pagado = float(wallet_response.get('amount', 0))

            log_to_airtable(
                'INFO', 'Pago TIC Process',
                f'Datos recuperados del metadata del webhook',
                details={'items_context': items_context, 'monto': monto_pagado})

    try:
        # 2. Si el pago fue aprobado, ejecutar la l├│gica de negocio
        # (actualizar Airtable, enviar email)
        if new_status == 'approved':
            log_to_airtable(
                'INFO', 'Pago TIC Process',
                f'Pago APROBADO. Procesando actualizaciones de deuda en '
                f'Airtable para ID: {payment_id}')

            items_for_pdf = []

            # --- L├│gica de actualizaci├│n de Airtable ---
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

            # --- L├│gica de Historial y PDF ---
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

            # Guardar en payment_history de PostgreSQL
            save_payment_history(
                payment_id=payment_id,
                comprobante_numero=historial_record_id,
                nombre_apellido=nombre_pagador or items_context.get('nombre_contribuyente', 'N/A'),
                dni=items_context.get('dni', 'N/A'),
                email=items_context.get('email'),
                monto=monto_pagado,
                estado='exitoso',
                items_pagados=items_for_pdf,
                detalles=f"Pago TIC para {items_context.get('item_type')}"
            )

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
                        dni=items_context.get('dni'),
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

        elif new_status == 'rejected':
            # Guardar pago rechazado en payment_history
            log_to_airtable(
                'WARNING', 'Pago TIC Process',
                f'Pago RECHAZADO para ID: {payment_id}')

            save_payment_history(
                payment_id=payment_id,
                comprobante_numero=None,
                nombre_apellido=items_context.get('nombre_contribuyente', 'N/A'),
                dni=items_context.get('dni', 'N/A'),
                email=items_context.get('email'),
                monto=monto_pagado,
                estado='fallido',
                items_pagados=items_context,
                detalles=wallet_response.get('status_detail') if wallet_response else 'Pago rechazado'
            )

        return {"status": "ok", "historialRecordId": historial_record_id}
    except Exception as e:
        log_to_airtable(
            'ERROR', 'Pago TIC Process',
            f'Error procesando pago {payment_id}: {e}',
            related_id=payment_id,
            details={'error_message': str(e)})
        raise


@app.route('/api/create_pagotic_payment', methods=['POST', 'OPTIONS'])
def create_pagotic_payment():
    """Crea un pago usando la API directa de Pago TIC"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()
        items_to_pay = data.get('items_to_pay', {})
        title = data.get('title', 'Pago Municipal')
        unit_price = data.get('unit_price', 0)

        log_to_airtable(
            'INFO', 'Pago TIC Create',
            f'Creando pago: {title} - Monto: ${unit_price}',
            details={'items': items_to_pay})

        # Generar ID ├║nico para el pago
        payment_id = f"PAY-{int(time.time())}-{uuid.uuid4().hex[:8]}"

        # Guardar en PostgreSQL si est├í disponible
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO payments
                        (payment_id, status, amount, currency,
                         payer_email, items_paid)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (payment_id, 'pending', unit_price, 'ARS',
                         items_to_pay.get('email'), json.dumps(items_to_pay))
                    )
                    conn.commit()
                log_to_airtable(
                    'INFO', 'Pago TIC Create',
                    f'Pago {payment_id} guardado en PostgreSQL')
            except Exception as db_error:
                log_to_airtable(
                    'ERROR', 'Pago TIC Create',
                    f'Error guardando en PostgreSQL: {db_error}')
                conn.rollback()
            finally:
                conn.close()

        # Crear pago con API directa de Pago TIC
        token = get_pagotic_token()
        if not token:
            return jsonify({
                "error": "No se pudo obtener token de autenticaci├│n de Pago TIC"
            }), 500

        # Construir el body para la API de Pago TIC
        from datetime import datetime, timedelta

        # Fechas de vencimiento en formato RFC 822 (requerido por Pago TIC)
        # Formato: yyyy-MM-dd'T'HH:mm:ssZ (ejemplo: "2020-12-10T00:00:00-0300")
        due_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%S-0300')
        last_due_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%S-0300')

        # URL del webhook para recibir notificaciones
        webhook_url = f"{BACKEND_URL}/api/pagotic_webhook"

        # Obtener datos del contribuyente desde Airtable
        record_id = items_to_pay.get('record_id')
        item_type = items_to_pay.get('item_type')
        contribuyente_nombre = items_to_pay.get('nombre_contribuyente', 'Sin nombre')
        contribuyente_dni = items_to_pay.get('dni', '00000000')

        # Consultar Airtable para obtener nombre y DNI completos
        if record_id and item_type and api:
            try:
                # Determinar la tabla seg├║n el tipo de item
                table_id = None
                if item_type == 'lote':
                    table_id = CONTRIBUTIVOS_TABLE_ID
                elif item_type == 'agua':
                    table_id = WATER_TABLE_ID
                elif item_type == 'vehiculo':
                    table_id = PATENTE_TABLE_ID

                if table_id:
                    # Consultar el registro en Airtable
                    record = api.table(BASE_ID, table_id).get(record_id)
                    fields = record.get('fields', {})

                    # Obtener contribuyente y DNI de Airtable
                    if 'contribuyente' in fields:
                        contribuyente_nombre = fields['contribuyente']
                    if 'dni' in fields:
                        contribuyente_dni = fields['dni']

                    log_to_airtable(
                        'INFO', 'Pago TIC Create',
                        f'Datos obtenidos de Airtable: {contribuyente_nombre}, DNI: {contribuyente_dni}',
                        details={'record_id': record_id, 'table': item_type})
            except Exception as airtable_error:
                log_to_airtable(
                    'WARNING', 'Pago TIC Create',
                    f'No se pudieron obtener datos de Airtable: {airtable_error}',
                    details={'record_id': record_id})

        # Construir detalles del pago
        # Por ahora creamos un ├║nico detalle con el monto total
        payment_details = [{
            "external_reference": payment_id,
            "concept_id": "pago_municipal",
            "concept_description": title,
            "amount": unit_price
        }]

        # Datos del pagador (con datos de Airtable)
        payer_data = {
            "external_reference": contribuyente_dni,
            "name": contribuyente_nombre,
            "email": items_to_pay.get('email', ''),
            "identification": {
                "type": "DNI_ARG",
                "number": contribuyente_dni,
                "country": "ARG"
            }
        }

        # Body del request a Pago TIC
        pagotic_request = {
            "currency_id": "ARS",
            "external_transaction_id": payment_id,
            "due_date": due_date,
            "last_due_date": last_due_date,
            "notification_url": webhook_url,
            "details": payment_details,
            "payer": payer_data,
            "metadata": items_to_pay  # Guardar items_to_pay para recuperar en webhook
        }

        # Hacer el POST a la API de Pago TIC
        headers = {
            'Authorization': f'Bearer {token}',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json'
        }

        try:
            response = requests.post(
                'https://api.paypertic.com/pagos',
                headers=headers,
                json=pagotic_request,
                timeout=30
            )
            response.raise_for_status()
            pagotic_response = response.json()

            log_to_airtable(
                'INFO', 'Pago TIC Create',
                f'Pago creado exitosamente: {payment_id}',
                related_id=payment_id,
                details={'pagotic_response': pagotic_response})

            return jsonify({
                "payment_id": payment_id,
                "init_point": pagotic_response.get('form_url'),
                "status": "pending",
                "pagotic_id": pagotic_response.get('id')
            })

        except requests.exceptions.RequestException as api_error:
            error_msg = f'Error llamando a API de Pago TIC: {api_error}'
            if hasattr(api_error, 'response') and api_error.response is not None:
                try:
                    error_details = api_error.response.json()
                    error_msg += f' - Details: {error_details}'
                except:
                    error_msg += f' - Response: {api_error.response.text}'

            log_to_airtable(
                'ERROR', 'Pago TIC Create',
                error_msg,
                related_id=payment_id)

            return jsonify({
                "error": "Error al crear el pago en Pago TIC",
                "details": str(api_error)
            }), 500

    except Exception as e:
        log_to_airtable(
            'ERROR', 'Pago TIC Create',
            f'Error creando pago: {e}',
            details={'error': str(e), 'traceback': traceback.format_exc()})
        return jsonify({"error": str(e)}), 500


@app.route('/api/pagotic_webhook', methods=['POST', 'OPTIONS'])
def pagotic_webhook():
    """Webhook para recibir notificaciones de Pago TIC"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        webhook_data = request.get_json()

        log_to_airtable(
            'INFO', 'Pago TIC Webhook',
            'Webhook recibido de Pago TIC',
            details={'webhook_data': webhook_data})

        # Extraer informaci├│n del webhook
        payment_id = webhook_data.get('external_transaction_id')
        status = webhook_data.get('status')
        pagotic_id = webhook_data.get('id')

        if not payment_id:
            log_to_airtable(
                'ERROR', 'Pago TIC Webhook',
                'Webhook sin external_transaction_id',
                details={'webhook_data': webhook_data})
            return jsonify({"error": "Missing external_transaction_id"}), 400

        # Determinar el nuevo estado del pago
        # Mapeo seg├║n documentaci├│n oficial de Pago TIC
        status_map = {
            'PENDING': 'pending',
            'ISSUED': 'issued',
            'IN_PROCESS': 'in_process',
            'APPROVED': 'approved',
            'REJECTED': 'rejected',
            'CANCELLED': 'cancelled',
            'REFUNDED': 'refunded',
            'DEFERRED': 'deferred',
            'OBJECTED': 'objected',
            'REVIEW': 'review',
            'VALIDATE': 'validate',
            'OVERDUE': 'overdue'
        }

        new_status = status_map.get(status.upper() if status else '', status)

        log_to_airtable(
            'INFO', 'Pago TIC Webhook',
            f'Procesando pago {payment_id} con estado {new_status}',
            related_id=payment_id,
            details={'pagotic_id': pagotic_id, 'status': status})

        # Procesar el pago usando la funci├│n existente
        process_pagotic_payment(payment_id, new_status, webhook_data)

        return jsonify({"status": "ok"}), 200

    except Exception as e:
        log_to_airtable(
            'ERROR', 'Pago TIC Webhook',
            f'Error procesando webhook: {e}',
            details={'error': str(e), 'traceback': traceback.format_exc()})
        return jsonify({"error": str(e)}), 500


# --- Admin Endpoints ---

@app.route('/api/admin/stats-login', methods=['POST', 'OPTIONS'])
def admin_stats_login():
    """Login de administrador y obtenci├│n de estad├¡sticas"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()
        username = data.get('username', '')
        password = data.get('password', '')

        # Validar credenciales
        if password != ADMIN_PASSWORD_FROM_ENV:
            return jsonify({"error": "Credenciales inv├ílidas"}), 401

        # Obtener estad├¡sticas desde PostgreSQL
        conn = get_db_connection()
        stats = {
            "authenticated": True,
            "username": username,
            "total_payments": 0,
            "total_approved": 0,
            "total_rejected": 0,
            "total_amount": 0,
            "total_logs": 0,
            "total_contacts": 0
        }

        if conn:
            try:
                with conn.cursor() as cur:
                    # Total de pagos
                    cur.execute("SELECT COUNT(*) FROM payments")
                    stats["total_payments"] = cur.fetchone()[0] or 0

                    # Pagos aprobados
                    cur.execute("SELECT COUNT(*) FROM payments WHERE status = 'approved'")
                    stats["total_approved"] = cur.fetchone()[0] or 0

                    # Pagos rechazados
                    cur.execute("SELECT COUNT(*) FROM payments WHERE status = 'rejected'")
                    stats["total_rejected"] = cur.fetchone()[0] or 0

                    # Monto total
                    cur.execute("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'approved'")
                    stats["total_amount"] = float(cur.fetchone()[0] or 0)

                    # Total de logs
                    cur.execute("SELECT COUNT(*) FROM error_logs")
                    stats["total_logs"] = cur.fetchone()[0] or 0

                    # Total de contactos
                    cur.execute("SELECT COUNT(*) FROM contacts")
                    stats["total_contacts"] = cur.fetchone()[0] or 0

            except Exception as db_error:
                print(f"Error obteniendo stats: {db_error}")
            finally:
                conn.close()

        return jsonify(stats), 200

    except Exception as e:
        log_to_airtable('ERROR', 'Admin Login',
                        f'Error en admin login: {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/payments', methods=['GET', 'OPTIONS'])
def admin_get_payments():
    """Obtener lista de pagos (requiere autenticaci├│n)"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Verificar autenticaci├│n
        is_valid, error_response = validate_admin_auth()
        if not is_valid:
            return error_response

        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database not available"}), 500

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT payment_id, status, amount, currency, payer_email,
                           created_at, updated_at
                    FROM payments
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))

                columns = [desc[0] for desc in cur.description]
                payments = [dict(zip(columns, row)) for row in cur.fetchall()]

                # Convertir datetime a string
                for payment in payments:
                    if payment.get('created_at'):
                        payment['created_at'] = payment['created_at'].isoformat()
                    if payment.get('updated_at'):
                        payment['updated_at'] = payment['updated_at'].isoformat()

                return jsonify({"payments": payments, "total": len(payments)}), 200

        finally:
            conn.close()

    except Exception as e:
        log_to_airtable('ERROR', 'Admin Payments',
                        f'Error obteniendo pagos: {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/db/payments', methods=['GET', 'OPTIONS'])
def admin_db_payments():
    """Obtener tabla payments con b├║squeda y paginaci├│n"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Verificar autenticaci├│n
        is_valid, error_response = validate_admin_auth()
        if not is_valid:
            return error_response

        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '', type=str)
        offset = (page - 1) * limit

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database not available"}), 500

        try:
            with conn.cursor() as cur:
                # Construir query con b├║squeda
                search_query = ""
                params = []
                if search:
                    search_query = """
                        WHERE payment_id ILIKE %s
                        OR payment_id_external ILIKE %s
                        OR payer_email ILIKE %s
                        OR status ILIKE %s
                    """
                    search_param = f"%{search}%"
                    params = [search_param, search_param, search_param, search_param]

                # Contar total
                count_query = f"SELECT COUNT(*) FROM payments {search_query}"
                cur.execute(count_query, params)
                total = cur.fetchone()[0]

                # Obtener datos paginados
                data_query = f"""
                    SELECT id, payment_id, payment_id_external, status, amount,
                           currency, payer_email, created_at, updated_at
                    FROM payments
                    {search_query}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """
                cur.execute(data_query, params + [limit, offset])

                columns = [desc[0] for desc in cur.description]
                records = [dict(zip(columns, row)) for row in cur.fetchall()]

                # Convertir datetime a string
                for record in records:
                    if record.get('created_at'):
                        record['created_at'] = record['created_at'].isoformat()
                    if record.get('updated_at'):
                        record['updated_at'] = record['updated_at'].isoformat()
                    if record.get('amount'):
                        record['amount'] = float(record['amount'])

                return jsonify({
                    "data": records,
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit
                }), 200

        finally:
            conn.close()

    except Exception as e:
        log_to_airtable('ERROR', 'Admin DB Payments',
                        f'Error obteniendo payments: {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/db/payment-history', methods=['GET', 'OPTIONS'])
def admin_db_payment_history():
    """Obtener tabla payment_history con b├║squeda y paginaci├│n"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Verificar autenticaci├│n
        is_valid, error_response = validate_admin_auth()
        if not is_valid:
            return error_response

        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '', type=str)
        offset = (page - 1) * limit

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database not available"}), 500

        try:
            with conn.cursor() as cur:
                # Construir query con b├║squeda
                search_query = ""
                params = []
                if search:
                    search_query = """
                        WHERE payment_id ILIKE %s
                        OR comprobante_numero ILIKE %s
                        OR nombre_apellido ILIKE %s
                        OR dni ILIKE %s
                        OR email ILIKE %s
                        OR estado ILIKE %s
                    """
                    search_param = f"%{search}%"
                    params = [search_param] * 6

                # Contar total
                count_query = f"SELECT COUNT(*) FROM payment_history {search_query}"
                cur.execute(count_query, params)
                total = cur.fetchone()[0]

                # Obtener datos paginados
                data_query = f"""
                    SELECT id, payment_id, comprobante_numero, nombre_apellido, dni,
                           email, monto, estado, fecha_hora, created_at
                    FROM payment_history
                    {search_query}
                    ORDER BY fecha_hora DESC
                    LIMIT %s OFFSET %s
                """
                cur.execute(data_query, params + [limit, offset])

                columns = [desc[0] for desc in cur.description]
                records = [dict(zip(columns, row)) for row in cur.fetchall()]

                # Convertir datetime a string
                for record in records:
                    if record.get('fecha_hora'):
                        record['fecha_hora'] = record['fecha_hora'].isoformat()
                    if record.get('created_at'):
                        record['created_at'] = record['created_at'].isoformat()
                    # Asegurar que monto siempre sea un n├║mero (incluso si es 0 o NULL)
                    record['monto'] = float(record.get('monto', 0) or 0)

                return jsonify({
                    "data": records,
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit
                }), 200

        finally:
            conn.close()

    except Exception as e:
        log_to_airtable('ERROR', 'Admin DB Payment History',
                        f'Error obteniendo payment_history: {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/db/error-logs', methods=['GET', 'OPTIONS'])
def admin_db_error_logs():
    """Obtener tabla error_logs con b├║squeda y paginaci├│n"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Verificar autenticaci├│n
        is_valid, error_response = validate_admin_auth()
        if not is_valid:
            return error_response

        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '', type=str)
        offset = (page - 1) * limit

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database not available"}), 500

        try:
            with conn.cursor() as cur:
                # Construir query con b├║squeda
                search_query = ""
                params = []
                if search:
                    search_query = """
                        WHERE nivel ILIKE %s
                        OR tipo ILIKE %s
                        OR mensaje ILIKE %s
                        OR payment_id ILIKE %s
                        OR related_id ILIKE %s
                    """
                    search_param = f"%{search}%"
                    params = [search_param] * 5

                # Contar total
                count_query = f"SELECT COUNT(*) FROM error_logs {search_query}"
                cur.execute(count_query, params)
                total = cur.fetchone()[0]

                # Obtener datos paginados
                data_query = f"""
                    SELECT id, nivel, tipo, mensaje, payment_id, related_id,
                           fecha_hora
                    FROM error_logs
                    {search_query}
                    ORDER BY fecha_hora DESC
                    LIMIT %s OFFSET %s
                """
                cur.execute(data_query, params + [limit, offset])

                columns = [desc[0] for desc in cur.description]
                records = [dict(zip(columns, row)) for row in cur.fetchall()]

                # Convertir datetime a string
                for record in records:
                    if record.get('fecha_hora'):
                        record['fecha_hora'] = record['fecha_hora'].isoformat()

                return jsonify({
                    "data": records,
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit
                }), 200

        finally:
            conn.close()

    except Exception as e:
        log_to_airtable('ERROR', 'Admin DB Error Logs',
                        f'Error obteniendo error_logs: {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/db/contacts', methods=['GET', 'OPTIONS'])
def admin_db_contacts():
    """Obtener tabla contacts con b├║squeda y paginaci├│n"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Verificar autenticaci├│n
        is_valid, error_response = validate_admin_auth()
        if not is_valid:
            return error_response

        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '', type=str)
        offset = (page - 1) * limit

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database not available"}), 500

        try:
            with conn.cursor() as cur:
                # Construir query con b├║squeda
                search_query = ""
                params = []
                if search:
                    search_query = """
                        WHERE email ILIKE %s
                        OR dni ILIKE %s
                        OR nombre_apellido ILIKE %s
                        OR celular ILIKE %s
                        OR origen ILIKE %s
                    """
                    search_param = f"%{search}%"
                    params = [search_param] * 5

                # Contar total
                count_query = f"SELECT COUNT(*) FROM contacts {search_query}"
                cur.execute(count_query, params)
                total = cur.fetchone()[0]

                # Obtener datos paginados
                data_query = f"""
                    SELECT id, email, dni, nombre_apellido, celular, origen,
                           created_at, updated_at
                    FROM contacts
                    {search_query}
                    ORDER BY updated_at DESC
                    LIMIT %s OFFSET %s
                """
                cur.execute(data_query, params + [limit, offset])

                columns = [desc[0] for desc in cur.description]
                records = [dict(zip(columns, row)) for row in cur.fetchall()]

                # Convertir datetime a string
                for record in records:
                    if record.get('created_at'):
                        record['created_at'] = record['created_at'].isoformat()
                    if record.get('updated_at'):
                        record['updated_at'] = record['updated_at'].isoformat()

                return jsonify({
                    "data": records,
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit
                }), 200

        finally:
            conn.close()

    except Exception as e:
        log_to_airtable('ERROR', 'Admin DB Contacts',
                        f'Error obteniendo contacts: {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/stats-postgres', methods=['GET', 'OPTIONS'])
def admin_stats_postgres():
    """Obtener estad├¡sticas agregadas de payments (online/efectivo) desde PostgreSQL"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Verificar autenticaci├│n
        is_valid, error_response = validate_admin_auth()
        if not is_valid:
            return error_response

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "No hay conexi├│n a base de datos"}), 500

        try:
            with conn.cursor() as cur:
                # ---------------------------------------------------------
                # 1. Obtener TODOS los pagos exitosos de 2026 en adelante
                # ---------------------------------------------------------
                # Filtramos por fecha >= 2026-01-01.
                # Estado: 'approved' (online) o 'exitoso' (efectivo/historial).
                query = """
                    SELECT 
                        id, 
                        monto, 
                        fecha_hora, 
                        detalles, 
                        items_pagados,
                        payment_id
                    FROM payment_history
                    WHERE fecha_hora >= '2026-01-01'
                      AND (LOWER(estado) = 'approved' OR LOWER(estado) = 'exitoso')
                    ORDER BY fecha_hora ASC
                """
                cur.execute(query)
                rows = cur.fetchall()

                # Estructuras de acumulaci├│n
                stats = {
                    "resumen_anual": {
                        "total_general": {"monto": 0.0, "cantidad": 0},
                        "online": {"monto": 0.0, "cantidad": 0},
                        "efectivo": {"monto": 0.0, "cantidad": 0}
                    },
                    "por_categoria": {
                        "tasas": {"monto": 0.0, "cantidad": 0, "online": 0, "efectivo": 0},
                        "agua": {"monto": 0.0, "cantidad": 0, "online": 0, "efectivo": 0},
                        "patentes": {"monto": 0.0, "cantidad": 0, "online": 0, "efectivo": 0},
                        "planes": {"monto": 0.0, "cantidad": 0, "online": 0, "efectivo": 0},
                        "otros": {"monto": 0.0, "cantidad": 0, "online": 0, "efectivo": 0}
                    },
                    "graficos": {
                        "diario_online": {},   # date_str -> amount
                        "diario_efectivo": {}, # date_str -> amount
                        "mensual_online": {},  # month_int -> amount
                        "mensual_efectivo": {} # month_int -> amount
                    }
                }

                for row in rows:
                    p_id = row[0]
                    monto = float(row[1]) if row[1] else 0.0
                    fecha = row[2]
                    detalles = str(row[3]).lower() if row[3] else ""
                    items_json = row[4]
                    payment_id_ext = str(row[5]) if row[5] else ""
                    
                    # -------------------------------------------------
                    # A. Determinar ORIGEN (Online vs Efectivo)
                    # -------------------------------------------------
                    # Criterio: 
                    #  - Si payment_id empieza con 'pay-' o 'tr-' (pagotic/payway) -> Online
                    #  - Si detalles contiene 'pago tic' -> Online
                    #  - Si items_json tiene estructura de online -> Online
                    #  - Si detalles contiene 'efectivo' o 'caja' -> Efectivo
                    #  - Por defecto: Si viene de 'cash_payments' (que guarda en history), es Efectivo.
                    #    Pero aqu├¡ solo leemos history. Asumimos Online salvo evidencia de Efectivo.
                    
                    is_online = True
                    
                    # Indicadores fuertes de Efectivo
                    if "efectivo" in detalles or "caja" in detalles or "mostrador" in detalles:
                        is_online = False
                    # Indicadores fuertes de Online
                    elif "pago tic" in detalles or "payway" in detalles or "mercadopago" in detalles:
                        is_online = True
                    else:
                        # Fallback por ID
                        if payment_id_ext.startswith("PAY-") or payment_id_ext.startswith("TR-"):
                             is_online = True
                        # Si el ID parece un UUID o correlativo simple (ej. cobro manual)
                        elif len(payment_id_ext) < 15 and payment_id_ext.isdigit():
                             is_online = False
                        else:
                             # Default a Online si no estamos seguros (o ajustar seg├║n preferencia)
                             is_online = True

                    # -------------------------------------------------
                    # B. Determinar CATEGOR├ìA (Tasas, Agua, Patente, Plan)
                    # -------------------------------------------------
                    categoria = "otros"
                    
                    # Buscar en detalles primero
                    if "agua" in detalles or "comercial" in detalles:
                        categoria = "agua"
                    elif "tasa" in detalles or "lote" in detalles or "retributiv" in detalles:
                        categoria = "tasas"
                    elif "patente" in detalles or "vehiculo" in detalles or "rodado" in detalles:
                        categoria = "patentes"
                    elif "plan" in detalles or "deuda" in detalles:
                        categoria = "planes"
                    
                    # Si sigue en otros, buscar en items_json
                    if categoria == "otros" and items_json:
                        try:
                            # items_json puede ser lista o dict
                            items_str = json.dumps(items_json).lower()
                            if "agua" in items_str or "comercial" in items_str:
                                categoria = "agua"
                            elif "tasa" in items_str or "lote" in items_str or "retributiv" in items_str:
                                categoria = "tasas"
                            elif "patente" in items_str or "vehiculo" in items_str:
                                categoria = "patentes"
                            elif "plan" in items_str or "deuda" in items_str:
                                categoria = "planes"
                        except:
                            pass

                    # -------------------------------------------------
                    # C. Acumular Totales
                    # -------------------------------------------------
                    # Global
                    stats["resumen_anual"]["total_general"]["monto"] += monto
                    stats["resumen_anual"]["total_general"]["cantidad"] += 1
                    
                    # Por Origen
                    origen_key = "online" if is_online else "efectivo"
                    stats["resumen_anual"][origen_key]["monto"] += monto
                    stats["resumen_anual"][origen_key]["cantidad"] += 1
                    
                    # Por Categor├¡a
                    stats["por_categoria"][categoria]["monto"] += monto
                    stats["por_categoria"][categoria]["cantidad"] += 1
                    stats["por_categoria"][categoria][origen_key] += 1
                    
                    # -------------------------------------------------
                    # D. Acumular Gr├íficos (Series Temporales)
                    # -------------------------------------------------
                    if fecha:
                        # Diario (YYYY-MM-DD)
                        date_str = fecha.strftime('%Y-%m-%d')
                        if date_str not in stats["graficos"][f"diario_{origen_key}"]:
                            stats["graficos"][f"diario_{origen_key}"][date_str] = 0.0
                        stats["graficos"][f"diario_{origen_key}"][date_str] += monto
                        
                        # Mensual (1-12)
                        month_int = fecha.month
                        if month_int not in stats["graficos"][f"mensual_{origen_key}"]:
                            stats["graficos"][f"mensual_{origen_key}"][month_int] = 0.0
                        stats["graficos"][f"mensual_{origen_key}"][month_int] += monto

                # -------------------------------------------------
                # E. Formatear Gr├íficos para el Frontend
                # -------------------------------------------------
                # Convertir dicts a listas ordenadas
                
                def format_chart_data(data_dict, is_monthly=False):
                    chart_list = []
                    for key, val in data_dict.items():
                        item = {"total": round(val, 2)}
                        if is_monthly:
                            meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
                            item["month"] = meses[key - 1] if 1 <= key <= 12 else str(key)
                            item["month_index"] = key
                        else:
                            item["date"] = key
                            # Formato DD/MM para mostrar
                            try:
                                dt = datetime.strptime(key, '%Y-%m-%d')
                                item["display_date"] = dt.strftime('%d/%m')
                            except:
                                item["display_date"] = key
                        chart_list.append(item)
                    
                    # Ordenar
                    if is_monthly:
                        chart_list.sort(key=lambda x: x["month_index"])
                    else:
                        chart_list.sort(key=lambda x: x["date"])
                    return chart_list

                final_response = {
                    "resumen_anual": stats["resumen_anual"],
                    "por_categoria": stats["por_categoria"],
                    "graficos": {
                        "diario_online": format_chart_data(stats["graficos"]["diario_online"]),
                        "diario_efectivo": format_chart_data(stats["graficos"]["diario_efectivo"]),
                        "mensual_online": format_chart_data(stats["graficos"]["mensual_online"], is_monthly=True),
                        "mensual_efectivo": format_chart_data(stats["graficos"]["mensual_efectivo"], is_monthly=True)
                    }
                }
                
                return jsonify(final_response)

        finally:
            conn.close()

    except Exception as e:
        log_to_airtable('ERROR', 'Admin Stats Postgres', f'Error: {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/db/cash-payments', methods=['GET', 'OPTIONS'])
def admin_db_cash_payments():
    """Obtener tabla cash_payments con b├║squeda y paginaci├│n"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Verificar autenticaci├│n
        is_valid, error_response = validate_admin_auth()
        if not is_valid:
            return error_response

        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '', type=str)
        tipo_filter = request.args.get('tipo', '', type=str)
        offset = (page - 1) * limit

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database not available"}), 500

        try:
            with conn.cursor() as cur:
                # Construir query con b├║squeda y filtros
                where_clauses = []
                params = []

                if search:
                    where_clauses.append("""(
                        comprobante_id ILIKE %s
                        OR nombre ILIKE %s
                        OR email ILIKE %s
                        OR patente ILIKE %s
                        OR administrativo ILIKE %s
                    )""")
                    search_param = f"%{search}%"
                    params.extend([search_param] * 5)

                if tipo_filter:
                    where_clauses.append("tipo_pago = %s")
                    params.append(tipo_filter)

                where_query = ""
                if where_clauses:
                    where_query = "WHERE " + " AND ".join(where_clauses)

                # Contar total
                count_query = f"SELECT COUNT(*) FROM cash_payments {where_query}"
                cur.execute(count_query, params)
                total = cur.fetchone()[0]

                # Obtener datos paginados
                data_query = f"""
                    SELECT id, comprobante_id, tipo_pago, fecha_pago, nombre, email,
                           monto_original, descuento, monto_total, administrativo,
                           patente, marca, modelo, anio, pdf_enviado, email_status,
                           created_at
                    FROM cash_payments
                    {where_query}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """
                cur.execute(data_query, params + [limit, offset])

                columns = [desc[0] for desc in cur.description]
                records = [dict(zip(columns, row)) for row in cur.fetchall()]

                # Convertir tipos de datos
                for record in records:
                    if record.get('fecha_pago'):
                        record['fecha_pago'] = record['fecha_pago'].isoformat()
                    if record.get('created_at'):
                        record['created_at'] = record['created_at'].isoformat()
                    if record.get('monto_original'):
                        record['monto_original'] = float(record['monto_original'])
                    if record.get('descuento'):
                        record['descuento'] = float(record['descuento'])
                    if record.get('monto_total'):
                        record['monto_total'] = float(record['monto_total'])

                # Obtener estad├¡sticas
                stats_query = f"""
                    SELECT
                        COUNT(*) as total_registros,
                        COALESCE(SUM(monto_total), 0) as monto_total,
                        COALESCE(SUM(CASE WHEN tipo_pago = 'recaudacion' THEN monto_total ELSE 0 END), 0) as monto_recaudacion,
                        COALESCE(SUM(CASE WHEN tipo_pago = 'patente' THEN monto_total ELSE 0 END), 0) as monto_patente,
                        COALESCE(SUM(CASE WHEN pdf_enviado = TRUE THEN 1 ELSE 0 END), 0) as emails_enviados
                    FROM cash_payments
                    {where_query}
                """
                cur.execute(stats_query, params)
                stats = cur.fetchone()

                return jsonify({
                    "data": records,
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit,
                    "stats": {
                        "total_registros": stats[0],
                        "monto_total": float(stats[1]),
                        "monto_recaudacion": float(stats[2]),
                        "monto_patente": float(stats[3]),
                        "emails_enviados": stats[4]
                    }
                }), 200

        finally:
            conn.close()

    except Exception as e:
        log_to_airtable('ERROR', 'Admin DB Cash Payments',
                        f'Error obteniendo cash_payments: {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/staff/register_access', methods=['POST', 'OPTIONS'])
def staff_register_access():
    """Registrar acceso del personal a la plataforma"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()
        username = data.get('username', 'Desconocido')

        # Guardar en Airtable
        if api:
            try:
                accesos_table = api.table(BASE_ID, ACCESOS_PERSONAL_TABLE_ID)
                accesos_table.create({
                    'Nombre': username,
                    'Fecha': datetime.now().isoformat(),
                    'Tipo': 'Login'
                })
                log_to_airtable('INFO', 'Staff Access',
                                f'Acceso registrado para {username}')
            except Exception as e:
                # No fallar si no se puede registrar el acceso
                log_to_airtable('WARNING', 'Staff Access',
                                f'No se pudo registrar acceso: {e}')

        return jsonify({"status": "ok"}), 200

    except Exception as e:
        log_to_airtable('ERROR', 'Staff Access',
                        f'Error registrando acceso: {e}')
        # No fallar la autenticaci├│n por esto
        return jsonify({"status": "ok"}), 200


@app.route('/api/recaudacion_efectivo', methods=['POST', 'OPTIONS'])
def recaudacion_efectivo():
    """Registrar pago en efectivo de tasas municipales"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()

        # Extraer datos del request
        fecha = data.get('fecha', datetime.now().strftime('%Y-%m-%d'))
        nombre = data.get('nombre', '')
        email = data.get('email', '')
        administrativa = data.get('administrativa', '')
        importes = data.get('importes', {})
        notas = data.get('notas', {})
        total = data.get('total', 0)
        total_final = data.get('total_final', 0)
        descuento = data.get('descuento', 0)

        if not nombre or not email:
            return jsonify({"error": "Nombre y email son requeridos"}), 400

        # Generar ID ├║nico para el comprobante
        comprobante_id = f"REC-{int(time.time())}-{uuid.uuid4().hex[:8]}"

        # Construir detalle de items pagados para el PDF y Airtable
        items_for_pdf = []
        detalle_texto = []
        for concepto_id, monto in importes.items():
            if float(monto) > 0:
                # Buscar el label del concepto
                concepto_label = concepto_id  # default
                nota = notas.get(concepto_id, '')

                items_for_pdf.append({
                    "description": f"{concepto_label}{(' - ' + nota) if nota else ''}",
                    "amount": float(monto)
                })

                detalle_linea = f"{concepto_label}: ${monto}"
                if nota:
                    detalle_linea += f" ({nota})"
                detalle_texto.append(detalle_linea)

        detalle_completo = "\n".join(detalle_texto)
        if descuento and float(descuento) > 0:
            detalle_completo += f"\n\nDescuento aplicado: {descuento}%"
        detalle_completo += f"\n\nRecibido por: {administrativa}"

        # Guardar en PostgreSQL - Tabla espec├¡fica de pagos en efectivo
        save_cash_payment(
            comprobante_id=comprobante_id,
            tipo_pago='recaudacion',
            fecha_pago=fecha,
            nombre=nombre,
            email=email,
            monto_original=total,
            descuento=descuento,
            monto_total=total_final,
            administrativo=administrativa,
            detalle=detalle_completo,
            items_json=items_for_pdf,
            transferencia=data.get('transferencia', ''),
            pdf_enviado=False,  # Se actualizar├í despu├®s
            email_status='Pendiente'
        )

        # Tambi├®n guardar en payment_history para consistencia
        save_payment_history(
            payment_id=comprobante_id,
            comprobante_numero=comprobante_id,
            nombre_apellido=nombre,
            dni='',
            email=email,
            monto=total_final,
            estado='exitoso',
            items_pagados=items_for_pdf,
            detalles=f"Recaudaci├│n efectivo - {detalle_completo}"
        )

        # Guardar en Airtable
        if api:
            try:
                recaudacion_table = api.table(BASE_ID, RECAUDACION_TABLE_ID)
                airtable_record = recaudacion_table.create({
                    'Comprobante ID': comprobante_id,
                    'Fecha': fecha,
                    'Nombre': nombre,
                    'Email': email,
                    'Monto Total': total_final,
                    'Descuento': float(descuento) if descuento else 0,
                    'Detalle': detalle_completo,
                    'Administrativa': administrativa,
                    'Items JSON': json.dumps(items_for_pdf)
                })
                log_to_airtable('INFO', 'Recaudacion Efectivo',
                                f'Registro creado: {comprobante_id} - ${total_final}')
            except Exception as airtable_error:
                log_to_airtable('ERROR', 'Recaudacion Efectivo',
                                f'Error guardando en Airtable: {airtable_error}')
                # No fallar si Airtable falla, ya est├í en PostgreSQL

        # Generar PDF
        pdf_details = {
            "FECHA_PAGO": datetime.strptime(fecha, '%Y-%m-%d').strftime("%d/%m/%Y"),
            "ESTADO_PAGO": "Pagado en Efectivo",
            "ID_PAGO_MP": comprobante_id,
            "NOMBRE_PAGADOR": nombre,
            "IDENTIFICADOR_PAGADOR": email,
            "items": items_for_pdf,
            "MONTO_TOTAL": total_final
        }

        pdf_file, pdf_id = create_receipt_pdf(pdf_details, pdf_id=comprobante_id)

        if not pdf_file:
            return jsonify({"error": "Error generando PDF"}), 500

        # Convertir PDF a base64 para enviarlo en la respuesta
        pdf_content = base64.b64encode(pdf_file.getvalue()).decode('utf-8')

        # Enviar email con el PDF
        email_status = "No enviado"
        if email and resend.api_key:
            try:
                from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
                params = {
                    "from": from_email,
                    "to": email,
                    "subject": "Comprobante de Pago - Municipalidad de Villa Traful",
                    "html": f"""
                    <h2>Comprobante de Pago en Efectivo</h2>
                    <p>Estimado/a {nombre},</p>
                    <p>Adjuntamos el comprobante de su pago recibido en efectivo.</p>
                    <p><strong>N├║mero de comprobante:</strong> {comprobante_id}</p>
                    <p><strong>Fecha:</strong> {datetime.strptime(fecha, '%Y-%m-%d').strftime("%d/%m/%Y")}</p>
                    <p><strong>Monto total:</strong> ${total_final}</p>
                    <p>Gracias por su pago.</p>
                    <p>Municipalidad de Villa Traful</p>
                    """,
                    "attachments": [{
                        "filename": f"comprobante_{comprobante_id}.pdf",
                        "content": pdf_content
                    }]
                }
                resend.Emails.send(params)
                email_status = f"Enviado a {email}"

                # Guardar contacto
                save_contacto(
                    email=email,
                    nombre=nombre,
                    origen='Recaudaci├│n Efectivo'
                )

                log_to_airtable('INFO', 'Recaudacion Efectivo',
                                f'Email enviado a {email} con comprobante {comprobante_id}')

                # Actualizar estado del email en PostgreSQL
                conn = get_db_connection()
                if conn:
                    try:
                        with conn.cursor() as cur:
                            cur.execute("""
                                UPDATE cash_payments
                                SET pdf_enviado = TRUE, email_status = %s
                                WHERE comprobante_id = %s
                            """, (email_status, comprobante_id))
                            conn.commit()
                    except Exception as update_error:
                        print(f"Error actualizando estado email: {update_error}")
                    finally:
                        conn.close()

            except Exception as email_error:
                log_to_airtable('ERROR', 'Recaudacion Efectivo',
                                f'Error enviando email: {email_error}')
                email_status = f"Error: {str(email_error)[:100]}"

                # Actualizar estado del error en PostgreSQL
                conn = get_db_connection()
                if conn:
                    try:
                        with conn.cursor() as cur:
                            cur.execute("""
                                UPDATE cash_payments
                                SET pdf_enviado = FALSE, email_status = %s
                                WHERE comprobante_id = %s
                            """, (email_status, comprobante_id))
                            conn.commit()
                    except Exception as update_error:
                        print(f"Error actualizando estado email: {update_error}")
                    finally:
                        conn.close()

        return jsonify({
            "message": f"Pago registrado exitosamente. Comprobante: {comprobante_id}. {email_status}",
            "comprobante_id": comprobante_id,
            "pdf_base64": pdf_content,
            "email_status": email_status
        }), 200

    except Exception as e:
        log_to_airtable('ERROR', 'Recaudacion Efectivo',
                        f'Error procesando pago en efectivo: {e}',
                        details={'error': str(e), 'traceback': traceback.format_exc()})
        return jsonify({"error": str(e)}), 500


@app.route('/api/patente_efectivo', methods=['POST', 'OPTIONS'])
def patente_efectivo():
    """Registrar pago en efectivo de patente automotor"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()

        # Extraer datos del request
        fecha = data.get('fecha', datetime.now().strftime('%Y-%m-%d'))
        nombre = data.get('nombre', '')
        email = data.get('email', '')
        administrativo = data.get('administrativo', '')
        patente = data.get('patente', '').upper()
        marca = data.get('marca', '')
        modelo = data.get('modelo', '')
        anio = data.get('anio', '')
        comentarios = data.get('comentarios', '')
        monto = float(data.get('monto', 0))
        descuento = float(data.get('descuento', 0))
        total_final = data.get('total_final', monto)
        transferencia = data.get('transferencia', '')

        if not nombre or not email or not patente:
            return jsonify({"error": "Nombre, email y patente son requeridos"}), 400

        # Generar ID ├║nico para el comprobante
        comprobante_id = f"PAT-{int(time.time())}-{uuid.uuid4().hex[:8]}"

        # Construir detalle
        detalle_completo = f"Pago de Patente Automotor\n"
        detalle_completo += f"Patente: {patente}\n"
        detalle_completo += f"Veh├¡culo: {marca} {modelo} ({anio})\n"
        if comentarios:
            detalle_completo += f"Comentarios: {comentarios}\n"
        if descuento > 0:
            detalle_completo += f"\nMonto original: ${monto}\n"
            detalle_completo += f"Descuento aplicado: {descuento}%\n"
            detalle_completo += f"Total pagado: ${total_final}\n"
        detalle_completo += f"\nRecibido por: {administrativo}"

        # Items para PDF
        items_for_pdf = [{
            "description": f"Patente {patente} - {marca} {modelo} ({anio})",
            "amount": total_final
        }]

        # Guardar en PostgreSQL - Tabla espec├¡fica de pagos en efectivo
        save_cash_payment(
            comprobante_id=comprobante_id,
            tipo_pago='patente',
            fecha_pago=fecha,
            nombre=nombre,
            email=email,
            monto_original=monto,
            descuento=descuento,
            monto_total=total_final,
            administrativo=administrativo,
            detalle=detalle_completo,
            items_json=items_for_pdf,
            patente=patente,
            marca=marca,
            modelo=modelo,
            anio=anio,
            comentarios=comentarios,
            transferencia=transferencia,
            pdf_enviado=False,
            email_status='Pendiente'
        )

        # Tambi├®n guardar en payment_history para consistencia
        save_payment_history(
            payment_id=comprobante_id,
            comprobante_numero=comprobante_id,
            nombre_apellido=nombre,
            dni='',
            email=email,
            monto=total_final,
            estado='exitoso',
            items_pagados=items_for_pdf,
            detalles=detalle_completo
        )

        # Guardar en Airtable
        if api:
            try:
                patente_table = api.table(BASE_ID, PATENTE_MANUAL_TABLE_ID)
                airtable_record = patente_table.create({
                    'Comprobante ID': comprobante_id,
                    'Fecha': fecha,
                    'Nombre': nombre,
                    'Email': email,
                    'Patente': patente,
                    'Marca': marca,
                    'Modelo': modelo,
                    'A├▒o': anio,
                    'Monto': total_final,
                    'Descuento': descuento,
                    'Detalle': detalle_completo,
                    'Administrativo': administrativo,
                    'Comentarios': comentarios
                })
                log_to_airtable('INFO', 'Patente Efectivo',
                                f'Registro creado: {comprobante_id} - Patente {patente} - ${total_final}')
            except Exception as airtable_error:
                log_to_airtable('ERROR', 'Patente Efectivo',
                                f'Error guardando en Airtable: {airtable_error}')
                # No fallar si Airtable falla, ya est├í en PostgreSQL

        # Generar PDF
        pdf_details = {
            "FECHA_PAGO": datetime.strptime(fecha, '%Y-%m-%d').strftime("%d/%m/%Y"),
            "ESTADO_PAGO": "Pagado en Efectivo",
            "ID_PAGO_MP": comprobante_id,
            "NOMBRE_PAGADOR": nombre,
            "IDENTIFICADOR_PAGADOR": f"Patente: {patente}",
            "items": items_for_pdf,
            "MONTO_TOTAL": total_final
        }

        pdf_file, pdf_id = create_receipt_pdf(pdf_details, pdf_id=comprobante_id)

        if not pdf_file:
            return jsonify({"error": "Error generando PDF"}), 500

        # Convertir PDF a base64 para enviarlo en la respuesta
        pdf_content = base64.b64encode(pdf_file.getvalue()).decode('utf-8')

        # Enviar email con el PDF
        email_status = "No enviado"
        if email and resend.api_key:
            try:
                from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
                params = {
                    "from": from_email,
                    "to": email,
                    "subject": "Comprobante de Pago de Patente - Municipalidad de Villa Traful",
                    "html": f"""
                    <h2>Comprobante de Pago de Patente</h2>
                    <p>Estimado/a {nombre},</p>
                    <p>Adjuntamos el comprobante de su pago de patente recibido en efectivo.</p>
                    <p><strong>N├║mero de comprobante:</strong> {comprobante_id}</p>
                    <p><strong>Patente:</strong> {patente}</p>
                    <p><strong>Veh├¡culo:</strong> {marca} {modelo} ({anio})</p>
                    <p><strong>Fecha:</strong> {datetime.strptime(fecha, '%Y-%m-%d').strftime("%d/%m/%Y")}</p>
                    <p><strong>Monto total:</strong> ${total_final}</p>
                    <p>Gracias por su pago.</p>
                    <p>Municipalidad de Villa Traful</p>
                    """,
                    "attachments": [{
                        "filename": f"comprobante_patente_{patente}_{comprobante_id}.pdf",
                        "content": pdf_content
                    }]
                }
                resend.Emails.send(params)
                email_status = f"Enviado a {email}"

                # Guardar contacto
                save_contacto(
                    email=email,
                    nombre=nombre,
                    origen='Pago Patente Efectivo'
                )

                log_to_airtable('INFO', 'Patente Efectivo',
                                f'Email enviado a {email} con comprobante {comprobante_id}')

                # Actualizar estado del email en PostgreSQL
                conn = get_db_connection()
                if conn:
                    try:
                        with conn.cursor() as cur:
                            cur.execute("""
                                UPDATE cash_payments
                                SET pdf_enviado = TRUE, email_status = %s
                                WHERE comprobante_id = %s
                            """, (email_status, comprobante_id))
                            conn.commit()
                    except Exception as update_error:
                        print(f"Error actualizando estado email: {update_error}")
                    finally:
                        conn.close()

            except Exception as email_error:
                log_to_airtable('ERROR', 'Patente Efectivo',
                                f'Error enviando email: {email_error}')
                email_status = f"Error: {str(email_error)[:100]}"

                # Actualizar estado del error en PostgreSQL
                conn = get_db_connection()
                if conn:
                    try:
                        with conn.cursor() as cur:
                            cur.execute("""
                                UPDATE cash_payments
                                SET pdf_enviado = FALSE, email_status = %s
                                WHERE comprobante_id = %s
                            """, (email_status, comprobante_id))
                            conn.commit()
                    except Exception as update_error:
                        print(f"Error actualizando estado email: {update_error}")
                    finally:
                        conn.close()

        return jsonify({
            "message": f"Pago de patente registrado exitosamente. Comprobante: {comprobante_id}. {email_status}",
            "comprobante_id": comprobante_id,
            "pdf_base64": pdf_content,
            "email_status": email_status
        }), 200

    except Exception as e:
        log_to_airtable('ERROR', 'Patente Efectivo',
                        f'Error procesando pago de patente en efectivo: {e}',
                        details={'error': str(e), 'traceback': traceback.format_exc()})
        return jsonify({"error": str(e)}), 500


# --- ENDPOINTS DE ESTAD├ìSTICAS ---
@app.route('/api/admin/stats-login', methods=['POST'])
def stats_login():
    """Endpoint para autenticar acceso al panel de estad├¡sticas"""
    try:
        data = request.get_json()
        password = data.get('password')
        
        if not password:
            return jsonify({"error": "Contrase├▒a requerida"}), 400
        
        if password == ADMIN_PASSWORD_FROM_ENV:
            log_to_airtable('INFO', 'Stats Login', 'Acceso exitoso al panel de estad├¡sticas')
            return jsonify({"success": True}), 200
        else:
            log_to_airtable('WARNING', 'Stats Login', 'Intento de acceso fallido al panel de estad├¡sticas')
            return jsonify({"error": "Contrase├▒a incorrecta"}), 401
    except Exception as e:
        log_to_airtable('ERROR', 'Stats Login', f'Error en stats_login: {e}')
        return jsonify({"error": "Error interno del servidor"}), 500


@app.route('/api/admin/stats', methods=['GET'])
def get_stats():
    """Endpoint para obtener estad├¡sticas de recaudaci├│n de tasas y derechos"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Error de conexi├│n a la base de datos"}), 500
    
    try:
        with conn.cursor() as cur:
            # --- CONTADOR: Total de registros de recaudaci├│n de tasas y derechos ---
            cur.execute("""
                SELECT COUNT(*) 
                FROM cash_payments
                WHERE tipo_pago = 'recaudacion'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
            """)
            total_registros_recaudacion = cur.fetchone()[0] or 0
            
            # --- MONTO TOTAL de recaudaci├│n de tasas y derechos ---
            cur.execute("""
                SELECT COALESCE(SUM(monto_total), 0)
                FROM cash_payments
                WHERE tipo_pago = 'recaudacion'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
            """)
            monto_total_recaudacion = float(cur.fetchone()[0] or 0)
            
            # --- GR├üFICO DIARIO: Recaudaci├│n de tasas y derechos por d├¡a ---
            cur.execute("""
                SELECT 
                    fecha_pago,
                    TO_CHAR(fecha_pago, 'DD/MM/YYYY') as fecha_formateada,
                    COALESCE(SUM(monto_total), 0) as total_dia,
                    COUNT(*) as cantidad_registros
                FROM cash_payments
                WHERE tipo_pago = 'recaudacion'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
                GROUP BY fecha_pago, TO_CHAR(fecha_pago, 'DD/MM/YYYY')
                ORDER BY fecha_pago DESC
                LIMIT 60
            """)
            daily_recaudacion = cur.fetchall()
            
            # Formatear datos para el gr├ífico diario (orden cronol├│gico)
            daily_chart = [
                {
                    "date": row[1],  # fecha_formateada
                    "total": round(float(row[2]), 2),  # total_dia
                    "cantidad": int(row[3])  # cantidad_registros
                } 
                for row in reversed(daily_recaudacion)  # Invertir para orden cronol├│gico
            ]
            
            # --- GR├üFICO MENSUAL: Recaudaci├│n de tasas y derechos por mes ---
            cur.execute("""
                SELECT 
                    TO_CHAR(fecha_pago, 'Month') as mes_nombre,
                    EXTRACT(MONTH FROM fecha_pago) as mes_num,
                    COALESCE(SUM(monto_total), 0) as total_mes,
                    COUNT(*) as cantidad_registros
                FROM cash_payments
                WHERE tipo_pago = 'recaudacion'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
                GROUP BY TO_CHAR(fecha_pago, 'Month'), EXTRACT(MONTH FROM fecha_pago)
                ORDER BY mes_num
            """)
            monthly_recaudacion = cur.fetchall()
            
            # Formatear datos para el gr├ífico mensual
            monthly_chart = [
                {
                    "month": row[0].strip(),  # mes_nombre
                    "total": round(float(row[2]), 2),  # total_mes
                    "cantidad": int(row[3])  # cantidad_registros
                } 
                for row in monthly_recaudacion
            ]
            
            # ============= DATOS DE PATENTES =============
            
            # --- CONTADOR: Total de registros de patentes ---
            cur.execute("""
                SELECT COUNT(*) 
                FROM cash_payments
                WHERE tipo_pago = 'patente'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
            """)
            total_registros_patentes = cur.fetchone()[0] or 0
            
            # --- MONTO TOTAL de patentes ---
            cur.execute("""
                SELECT COALESCE(SUM(monto_total), 0)
                FROM cash_payments
                WHERE tipo_pago = 'patente'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
            """)
            monto_total_patentes = float(cur.fetchone()[0] or 0)
            
            # --- GR├üFICO DIARIO: Patentes por d├¡a ---
            cur.execute("""
                SELECT 
                    fecha_pago,
                    TO_CHAR(fecha_pago, 'DD/MM/YYYY') as fecha_formateada,
                    COALESCE(SUM(monto_total), 0) as total_dia,
                    COUNT(*) as cantidad_registros
                FROM cash_payments
                WHERE tipo_pago = 'patente'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
                GROUP BY fecha_pago, TO_CHAR(fecha_pago, 'DD/MM/YYYY')
                ORDER BY fecha_pago DESC
                LIMIT 60
            """)
            daily_patentes = cur.fetchall()
            
            # Formatear datos para el gr├ífico diario de patentes
            daily_chart_patentes = [
                {
                    "date": row[1],  # fecha_formateada
                    "total": round(float(row[2]), 2),  # total_dia
                    "cantidad": int(row[3])  # cantidad_registros
                } 
                for row in reversed(daily_patentes)  # Invertir para orden cronol├│gico
            ]
            
            # --- GR├üFICO MENSUAL: Patentes por mes ---
            cur.execute("""
                SELECT 
                    TO_CHAR(fecha_pago, 'Month') as mes_nombre,
                    EXTRACT(MONTH FROM fecha_pago) as mes_num,
                    COALESCE(SUM(monto_total), 0) as total_mes,
                    COUNT(*) as cantidad_registros
                FROM cash_payments
                WHERE tipo_pago = 'patente'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
                GROUP BY TO_CHAR(fecha_pago, 'Month'), EXTRACT(MONTH FROM fecha_pago)
                ORDER BY mes_num
            """)
            monthly_patentes = cur.fetchall()
            
            # Formatear datos para el gr├ífico mensual de patentes
            monthly_chart_patentes = [
                {
                    "month": row[0].strip(),  # mes_nombre
                    "total": round(float(row[2]), 2),  # total_mes
                    "cantidad": int(row[3])  # cantidad_registros
                } 
                for row in monthly_patentes
            ]
            
            # ============= DATOS DE PLANES DE PAGO =============
            
            # --- CONTADOR: Total de registros de planes de pago ---
            cur.execute("""
                SELECT COUNT(*) 
                FROM cash_payments
                WHERE tipo_pago = 'plan_pago'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
            """)
            total_registros_planes = cur.fetchone()[0] or 0
            
            # --- MONTO TOTAL de planes de pago ---
            cur.execute("""
                SELECT COALESCE(SUM(monto_total), 0)
                FROM cash_payments
                WHERE tipo_pago = 'plan_pago'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
            """)
            monto_total_planes = float(cur.fetchone()[0] or 0)
            
            # --- GR├üFICO DIARIO: Planes de pago por d├¡a ---
            cur.execute("""
                SELECT 
                    fecha_pago,
                    TO_CHAR(fecha_pago, 'DD/MM/YYYY') as fecha_formateada,
                    COALESCE(SUM(monto_total), 0) as total_dia,
                    COUNT(*) as cantidad_registros
                FROM cash_payments
                WHERE tipo_pago = 'plan_pago'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
                GROUP BY fecha_pago, TO_CHAR(fecha_pago, 'DD/MM/YYYY')
                ORDER BY fecha_pago DESC
                LIMIT 60
            """)
            daily_planes = cur.fetchall()
            
            # Formatear datos para el gr├ífico diario de planes de pago
            daily_chart_planes = [
                {
                    "date": row[1],  # fecha_formateada
                    "total": round(float(row[2]), 2),  # total_dia
                    "cantidad": int(row[3])  # cantidad_registros
                } 
                for row in reversed(daily_planes)  # Invertir para orden cronol├│gico
            ]
            
            # --- GR├üFICO MENSUAL: Planes de pago por mes ---
            cur.execute("""
                SELECT 
                    TO_CHAR(fecha_pago, 'Month') as mes_nombre,
                    EXTRACT(MONTH FROM fecha_pago) as mes_num,
                    COALESCE(SUM(monto_total), 0) as total_mes,
                    COUNT(*) as cantidad_registros
                FROM cash_payments
                WHERE tipo_pago = 'plan_pago'
                    AND EXTRACT(YEAR FROM fecha_pago) = 2026
                GROUP BY TO_CHAR(fecha_pago, 'Month'), EXTRACT(MONTH FROM fecha_pago)
                ORDER BY mes_num
            """)
            monthly_planes = cur.fetchall()
            
            # Formatear datos para el gr├ífico mensual de planes de pago
            monthly_chart_planes = [
                {
                    "month": row[0].strip(),  # mes_nombre
                    "total": round(float(row[2]), 2),  # total_mes
                    "cantidad": int(row[3])  # cantidad_registros
                } 
                for row in monthly_planes
            ]
            
            # ============= DATOS DE COBRO EFECTIVO (desde Airtable) =============
            
            try:
                efectivo_table = api.table(BASE_ID, EFECTIVO_TABLE_ID)
                efectivo_records = efectivo_table.all()
                
                # Filtrar por a├▒o 2026 y procesar
                from datetime import datetime
                
                # Solo procesamos patentes efectivo
                pat_efectivo_data = []
                
                for record in efectivo_records:
                    fields = record['fields']
                    fecha_str = fields.get('Fecha y Hora', '')
                    tipo = fields.get('Tipo', '').lower()
                    monto = float(fields.get('Total', 0))
                    
                    if not fecha_str:
                        continue
                    
                    try:
                        # Parsear fecha (formato: YYYY-MM-DD o DD/MM/YYYY)
                        if '-' in fecha_str:
                            fecha = datetime.strptime(fecha_str[:10], '%Y-%m-%d')
                        else:
                            fecha = datetime.strptime(fecha_str, '%d/%m/%Y')
                        
                        # Filtrar por a├▒o 2026
                        if fecha.year != 2026:
                            continue
                        
                        data_item = {
                            'fecha': fecha,
                            'fecha_str': fecha.strftime('%d/%m/%Y'),
                            'monto': monto,
                            'mes': fecha.month,
                            'mes_nombre': fecha.strftime('%B')
                        }
                        
                        # Solo procesamos patentes
                        if tipo in ['patente', 'patentes']:
                            pat_efectivo_data.append(data_item)
                    except:
                        continue
                
                # Calcular totales (solo patentes)
                total_registros_pat_efectivo = len(pat_efectivo_data)
                monto_total_pat_efectivo = sum(item['monto'] for item in pat_efectivo_data)
                
                # Total efectivo = solo patentes
                total_registros_efectivo = total_registros_pat_efectivo
                monto_total_efectivo = monto_total_pat_efectivo
                
                # Gr├íficos diarios - Patentes
                from collections import defaultdict
                daily_pat_dict = defaultdict(lambda: {'total': 0, 'cantidad': 0})
                for item in pat_efectivo_data:
                    daily_pat_dict[item['fecha_str']]['total'] += item['monto']
                    daily_pat_dict[item['fecha_str']]['cantidad'] += 1
                
                daily_chart_pat_efectivo = [
                    {'date': fecha, 'total': round(data['total'], 2), 'cantidad': data['cantidad']}
                    for fecha, data in sorted(daily_pat_dict.items(), key=lambda x: datetime.strptime(x[0], '%d/%m/%Y'), reverse=True)[:60]
                ]
                daily_chart_pat_efectivo.reverse()
                
                # Gr├íficos mensuales - Patentes
                monthly_pat_dict = defaultdict(lambda: {'total': 0, 'cantidad': 0, 'mes_num': 0})
                for item in pat_efectivo_data:
                    mes_nombre = item['mes_nombre']
                    monthly_pat_dict[mes_nombre]['total'] += item['monto']
                    monthly_pat_dict[mes_nombre]['cantidad'] += 1
                    monthly_pat_dict[mes_nombre]['mes_num'] = item['mes']
                
                monthly_chart_pat_efectivo = [
                    {'month': mes, 'total': round(data['total'], 2), 'cantidad': data['cantidad']}
                    for mes, data in sorted(monthly_pat_dict.items(), key=lambda x: x[1]['mes_num'])
                ]
                
            except Exception as e:
                print(f"Error obteniendo datos de efectivo desde Airtable: {e}")
                total_registros_pat_efectivo = 0
                monto_total_pat_efectivo = 0
                total_registros_efectivo = 0
                monto_total_efectivo = 0
                daily_chart_pat_efectivo = []
                monthly_chart_pat_efectivo = []
            
            # ============= DATOS DE PAGOS AUTOMATIZADOS (desde Airtable - Historial) =============
            
            try:
                # Obtener todos los registros del historial de pagos
                historial_table = api.table(BASE_ID, HISTORIAL_TABLE_ID)
                historial_records = historial_table.all()
                
                tasas_data = []
                agua_data = []
                
                
                for record in historial_records:
                    fields = record['fields']
                    estado = fields.get('Estado', '')
                    fecha_str = fields.get('Fecha de Transacci├│n', '')
                    items_json_str = fields.get('ItemsPagadosJSON', '[]')
                    
                    # Solo pagos exitosos
                    if estado != 'Exitoso' or not fecha_str:
                        continue
                    
                    try:
                        # Parsear ItemsPagadosJSON
                        import json
                        items = json.loads(items_json_str) if items_json_str else []
                        
                        if not items:
                            continue
                        
                        # Parsear fecha
                        if '-' in fecha_str:
                            fecha = datetime.strptime(fecha_str[:10], '%Y-%m-%d')
                        else:
                            fecha = datetime.strptime(fecha_str, '%d/%m/%Y')
                        
                        # Filtrar por a├▒o 2026
                        if fecha.year != 2026:
                            continue
                        
                        # Procesar cada item del pago
                        for item in items:
                            description = item.get('description', '').lower()
                            amount = float(item.get('amount', 0))
                            
                            if amount <= 0:
                                continue
                            
                            data_item = {
                                'fecha': fecha,
                                'fecha_str': fecha.strftime('%d/%m/%Y'),
                                'monto': amount,
                                'mes': fecha.month,
                                'mes_nombre': fecha.strftime('%B')
                            }
                            
                            # Clasificar por tipo seg├║n descripci├│n
                            # Tasas Retributivas: incluye Cuota Tasas, Pago Recaudaci├│n Manual, Pago Patente
                            if ('tasas' in description or 
                                'recaudaci├│n' in description or 
                                'recaudacion' in description or
                                'patente' in description):
                                tasas_data.append(data_item)
                            elif 'agua' in description or 'cuota agua' in description:
                                agua_data.append(data_item)
                    except Exception as e:
                        print(f"Error procesando registro: {e}")
                        continue
                
                # Calcular totales
                total_registros_tasas_online = len(tasas_data)
                monto_total_tasas_online = sum(item['monto'] for item in tasas_data)
                
                total_registros_agua_online = len(agua_data)
                monto_total_agua_online = sum(item['monto'] for item in agua_data)
                
                total_registros_automatizados = total_registros_tasas_online + total_registros_agua_online
                monto_total_automatizados = monto_total_tasas_online + monto_total_agua_online
                
                # Gr├íficos diarios - Tasas
                daily_tasas_dict = defaultdict(lambda: {'total': 0, 'cantidad': 0})
                for item in tasas_data:
                    daily_tasas_dict[item['fecha_str']]['total'] += item['monto']
                    daily_tasas_dict[item['fecha_str']]['cantidad'] += 1
                
                daily_chart_tasas_online = [
                    {'date': fecha, 'total': round(data['total'], 2), 'cantidad': data['cantidad']}
                    for fecha, data in sorted(daily_tasas_dict.items(), key=lambda x: datetime.strptime(x[0], '%d/%m/%Y'), reverse=True)[:60]
                ]
                daily_chart_tasas_online.reverse()
                
                # Gr├íficos diarios - Agua
                daily_agua_dict = defaultdict(lambda: {'total': 0, 'cantidad': 0})
                for item in agua_data:
                    daily_agua_dict[item['fecha_str']]['total'] += item['monto']
                    daily_agua_dict[item['fecha_str']]['cantidad'] += 1
                
                daily_chart_agua_online = [
                    {'date': fecha, 'total': round(data['total'], 2), 'cantidad': data['cantidad']}
                    for fecha, data in sorted(daily_agua_dict.items(), key=lambda x: datetime.strptime(x[0], '%d/%m/%Y'), reverse=True)[:60]
                ]
                daily_chart_agua_online.reverse()
                
                # Gr├íficos mensuales - Tasas
                monthly_tasas_dict = defaultdict(lambda: {'total': 0, 'cantidad': 0, 'mes_num': 0})
                for item in tasas_data:
                    mes_nombre = item['mes_nombre']
                    monthly_tasas_dict[mes_nombre]['total'] += item['monto']
                    monthly_tasas_dict[mes_nombre]['cantidad'] += 1
                    monthly_tasas_dict[mes_nombre]['mes_num'] = item['mes']
                
                monthly_chart_tasas_online = [
                    {'month': mes, 'total': round(data['total'], 2), 'cantidad': data['cantidad']}
                    for mes, data in sorted(monthly_tasas_dict.items(), key=lambda x: x[1]['mes_num'])
                ]
                
                # Gr├íficos mensuales - Agua
                monthly_agua_dict = defaultdict(lambda: {'total': 0, 'cantidad': 0, 'mes_num': 0})
                for item in agua_data:
                    mes_nombre = item['mes_nombre']
                    monthly_agua_dict[mes_nombre]['total'] += item['monto']
                    monthly_agua_dict[mes_nombre]['cantidad'] += 1
                    monthly_agua_dict[mes_nombre]['mes_num'] = item['mes']
                
                monthly_chart_agua_online = [
                    {'month': mes, 'total': round(data['total'], 2), 'cantidad': data['cantidad']}
                    for mes, data in sorted(monthly_agua_dict.items(), key=lambda x: x[1]['mes_num'])
                ]
                
            except Exception as e:
                print(f"Error obteniendo datos de pagos automatizados desde Airtable: {e}")
                total_registros_tasas_online = 0
                monto_total_tasas_online = 0
                total_registros_agua_online = 0
                monto_total_agua_online = 0
                total_registros_automatizados = 0
                monto_total_automatizados = 0
                daily_chart_tasas_online = []
                daily_chart_agua_online = []
                monthly_chart_tasas_online = []
                monthly_chart_agua_online = []


            
            # --- CONSTRUIR RESPUESTA ---
            response_data = {
                "recaudacion_tasas": {
                    "total_registros": total_registros_recaudacion,
                    "monto_total": round(monto_total_recaudacion, 2)
                },
                "daily_chart": daily_chart,
                "monthly_chart": monthly_chart,
                "patentes": {
                    "total_registros": total_registros_patentes,
                    "monto_total": round(monto_total_patentes, 2)
                },
                "daily_chart_patentes": daily_chart_patentes,
                "monthly_chart_patentes": monthly_chart_patentes,
                "planes_pago": {
                    "total_registros": total_registros_planes,
                    "monto_total": round(monto_total_planes, 2)
                },
                "daily_chart_planes": daily_chart_planes,
                "monthly_chart_planes": monthly_chart_planes,
                "cobro_efectivo": {
                    "patentes": {
                        "total_registros": total_registros_pat_efectivo,
                        "monto_total": round(monto_total_pat_efectivo, 2)
                    },
                    "total": {
                        "total_registros": total_registros_efectivo,
                        "monto_total": round(monto_total_efectivo, 2)
                    }
                },
                "daily_chart_pat_efectivo": daily_chart_pat_efectivo,
                "monthly_chart_pat_efectivo": monthly_chart_pat_efectivo,
                "pagos_automatizados": {
                    "tasas_retributivas": {
                        "total_registros": total_registros_tasas_online,
                        "monto_total": round(monto_total_tasas_online, 2)
                    },
                    "agua": {
                        "total_registros": total_registros_agua_online,
                        "monto_total": round(monto_total_agua_online, 2)
                    },
                    "total": {
                        "total_registros": total_registros_automatizados,
                        "monto_total": round(monto_total_automatizados, 2)
                    }
                },
                "daily_chart_tasas_online": daily_chart_tasas_online,
                "daily_chart_agua_online": daily_chart_agua_online,
                "monthly_chart_tasas_online": monthly_chart_tasas_online,
                "monthly_chart_agua_online": monthly_chart_agua_online
            }
            
            log_to_airtable('INFO', 'Stats Dashboard', 
                          f'Estad├¡sticas - Recaudaci├│n: {total_registros_recaudacion} (${monto_total_recaudacion:.2f}), Patentes: {total_registros_patentes} (${monto_total_patentes:.2f}), Planes: {total_registros_planes} (${monto_total_planes:.2f}), Efectivo: {total_registros_efectivo} (${monto_total_efectivo:.2f}), Automatizados: {total_registros_automatizados} (${monto_total_automatizados:.2f})')
            
            return jsonify(response_data), 200
            
    except Exception as e:
        log_to_airtable('ERROR', 'Stats Dashboard', 
                       f'Error generando estad├¡sticas: {e}',
                       details={'error': str(e), 'traceback': traceback.format_exc()})
        return jsonify({"error": f"Error al generar estad├¡sticas: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000, debug=True)
