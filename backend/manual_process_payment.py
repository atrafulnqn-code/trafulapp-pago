"""
Script para procesar manualmente un pago que no fue procesado por el webhook
Uso: python manual_process_payment.py <payment_id>
"""

import sys
import os
import json
from dotenv import load_dotenv
import mercadopago

# Cargar variables de entorno
load_dotenv()

# Configurar Mercado Pago
MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
if not MERCADOPAGO_ACCESS_TOKEN:
    print("ERROR: MERCADOPAGO_ACCESS_TOKEN no configurado")
    sys.exit(1)

sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)

def get_payment_info(payment_id):
    """Obtiene información del pago desde Mercado Pago"""
    try:
        print(f"Consultando pago {payment_id} en Mercado Pago...")
        response = sdk.payment().get(payment_id)

        if response["status"] != 200:
            print(f"ERROR: No se pudo obtener el pago. Status: {response['status']}")
            return None

        payment_info = response["response"]
        print(f"\n=== INFORMACIÓN DEL PAGO ===")
        print(f"ID: {payment_info.get('id')}")
        print(f"Status: {payment_info.get('status')}")
        print(f"Status Detail: {payment_info.get('status_detail')}")
        print(f"Monto: ${payment_info.get('transaction_amount')}")
        print(f"Email: {payment_info.get('payer', {}).get('email')}")
        print(f"Fecha: {payment_info.get('date_approved')}")

        # External reference contiene el contexto del pago
        external_ref = payment_info.get('external_reference', '{}')
        print(f"\n=== EXTERNAL REFERENCE (contexto) ===")
        print(external_ref)

        try:
            items_context = json.loads(external_ref)
            print(f"\n=== ITEMS CONTEXT (parseado) ===")
            print(json.dumps(items_context, indent=2))
            return payment_info, items_context
        except json.JSONDecodeError:
            print("ERROR: No se pudo parsear external_reference")
            return payment_info, {}

    except Exception as e:
        print(f"ERROR obteniendo información del pago: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Uso: python manual_process_payment.py <payment_id>")
        print("\nEjemplo:")
        print("  python manual_process_payment.py 141870342175")
        sys.exit(1)

    payment_id = sys.argv[1]

    result = get_payment_info(payment_id)
    if not result:
        print("\nNo se pudo obtener la información del pago.")
        sys.exit(1)

    payment_info, items_context = result

    print("\n" + "="*60)
    print("INFORMACIÓN OBTENIDA EXITOSAMENTE")
    print("="*60)
    print("\nPara procesar este pago manualmente:")
    print("1. Ve a tu backend en Render")
    print("2. Usa el endpoint /api/debug/simulate_payment con este payload:")
    print("\n" + "="*60)

    # Generar payload para simulate_payment
    simulate_payload = {
        "items_to_pay": items_context
    }

    print(json.dumps(simulate_payload, indent=2))
    print("="*60)

    print("\nO puedes hacer un POST a:")
    print(f"  POST https://traful-backend-docker.onrender.com/api/payment_webhook")
    print("\nCon este payload:")
    webhook_payload = {
        "type": "payment",
        "data": {
            "id": payment_id
        }
    }
    print(json.dumps(webhook_payload, indent=2))

if __name__ == "__main__":
    main()
