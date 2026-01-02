import google.generativeai as genai
import os

def iniciar_consola():
    """Initializes and runs the Gemini console using the new google.generativeai API."""
    try:
        # Configure the API key
        api_key = os.environ.get('GOOGLE_API_KEY')
        if not api_key:
            print("\nError: La variable de entorno GOOGLE_API_KEY no está configurada.\n")
            return
        genai.configure(api_key=api_key)

        # Create the model using the new API syntax
        # Using the model name we confirmed from list_models()
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        chat = model.start_chat(history=[])

        print("\n" + "="*42)
        print("   CONSOLA GEMINI (API MODERNA) ACTIVA")
        print("      (Escribe 'salir' para cerrar)")
        print("="*42 + "\n")

        while True:
            user_input = input(">> Tu: ")
            if user_input.lower() in ['salir', 'exit', 'quit']:
                break
            if not user_input.strip():
                continue
            
            response = chat.send_message(user_input)
            print(f"\nGemini: {response.text}\n")

    except Exception as e:
        # Provide more specific error feedback if possible
        if "API_KEY_INVALID" in str(e):
            print("\nError: La clave de API no es válida. Revisa la variable de entorno GOOGLE_API_KEY.\n")
        elif "404" in str(e) and "Model not found" in str(e):
             print(f"\nError: El modelo 'models/gemini-2.5-flash' no fue encontrado. Intenta listar los modelos de nuevo.\n")
        else:
            print(f"\nOcurrió un error inesperado: {e}\n")

if __name__ == "__main__":
    iniciar_consola()