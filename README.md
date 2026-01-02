<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1yWyaxKEp3971mBqsfPY4kqozdNZxk9XI

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 12. Estilos de Botones y su Personalización

### 12.1. Botones Principales (`Home.tsx`)

*   **"Comenzar Pago" (Botón Hero):**
    ```html
    <button
      class="bg-white text-blue-900 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-50 transition-all active:scale-95"
    >
      Comenzar Pago
    </button>
    ```

*   **"Pagar Ahora" (Botones de Servicio):** La lógica en el frontend utiliza una propiedad `buttonClass` para aplicar estos estilos de forma programática.
    *   **Ejemplo para "Tasas Retributivas" (verde esmeralda):**
        ```html
        <button
          class="mt-auto w-full text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          Pagar Ahora
          <!-- Icono SVG -->
        </button>
        ```
    *   **Ejemplo para "Patente Automotor" (azul):**
        ```html
        <button
          class="mt-auto w-full text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          Pagar Ahora
          <!-- Icono SVG -->
        </button>
        ```
    *   **Ejemplo para "Otras Deudas" (ámbar):**
        ```html
        <button
          class="mt-auto w-full text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700"
        >
          Pagar Ahora
          <!-- Icono SVG -->
        </button>
        ```

### 12.2. Botones del Flujo de Pago (`PaymentFlow.tsx`)

#### a. Botón "Consultar Deuda"

Un botón de acción principal con spinner de carga:
```html
<button
  disabled={!inputValue || loading}
  class="w-full bg-blue-900 text-white py-4 rounded-xl font-bold hover:bg-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
>
  <!-- Renderizado condicional para spinner -->
  {loading ? (
    <div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  ) : 'Consultar Deuda'}
</button>
```

#### b. Botón "Volver" (Secundario)

Un botón con borde, para acciones secundarias o de navegación:
```html
<button
  class="px-6 py-3 border border-slate-700 rounded-xl hover:bg-slate-800 font-semibold transition-colors"
>
  Volver
</button>
```

#### c. Botón "Continuar al Pago"

Otro botón de acción principal, que avanza en el flujo:
```html
<button
  disabled={selectedDebts.length === 0}
  class="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
>
  Continuar al Pago
</button>
```

#### d. Botón "Confirmar y Pagar"

El botón final para completar la transacción, con un color de confirmación (verde) y spinner:
```html
<button
  disabled={loading}
  class="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-3"
>
  {loading ? (
    <div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  ) : 'Confirmar y Pagar'}
</button>
```

#### e. Botones de Selección de Método de Pago

Estos botones utilizan clases para indicar un estado seleccionado vs. no seleccionado:

**No seleccionado (por defecto):**
```html
<button
  class="flex items-center gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-slate-300 text-left outline-none transition-colors"
>
  <!-- Contenido y icono -->
</button>
```
**Seleccionado (ejemplo para "Tarjeta Crédito / Débito"):**
```html
<button
  class="flex items-center gap-4 p-6 rounded-2xl border-2 border-blue-600 bg-blue-50 text-left outline-none"
>
  <!-- Contenido y icono -->
</button>
```
La aplicación usa lógica condicional para aplicar estas clases (`border-blue-600 bg-blue-50` cuando está seleccionado).

### 12.3. Personalización de Colores y Estilos

Puedes modificar los colores y otros estilos de estos botones de varias maneras:

1.  **Directamente en las Clases de Tailwind:** Cambia clases como `bg-blue-900` por `bg-red-600`, `text-white` por `text-black`, `rounded-full` por `rounded-md`, etc.
2.  **Configuración de `tailwind.config.js`:** Si quieres usar colores que no están en la paleta por defecto de Tailwind o cambiar los colores existentes, puedes extender tu `tailwind.config.js`. Por ejemplo, para añadir un color 'primary' personalizado:
    ```javascript
    // tailwind.config.js
    module.exports = {
      theme: {
        extend: {
          colors: {
            primary: '#ff4400', // Tu color personalizado
            secondary: '#007bff',
          },
        },
      },
      plugins: [],
    };
    ```
    Luego, puedes usar `bg-primary`, `text-primary`, `hover:bg-primary`, etc.
3.  **Clases CSS Personalizadas (uso limitado):** Si necesitas estilos muy específicos que no se pueden lograr fácilmente con utilidades de Tailwind, puedes añadir clases personalizadas a `src/index.css` y luego aplicarlas a tus botones. Sin embargo, se recomienda usar Tailwind siempre que sea posible.