# Guía de Deployment - Traful Tablero

Esta guía te ayudará a deployar de forma segura el proyecto Traful Tablero en Render u otro servicio de hosting.

## 📋 Pre-requisitos

- Cuenta en [Render](https://render.com)
- Credenciales de:
  - Airtable (Personal Access Token)
  - Mercado Pago (Access Token)
  - Resend (API Key)
  - Payway (opcional)

---

## 🔐 Configuración de Variables de Entorno

### Para desarrollo local:

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` y completa tus credenciales reales.

3. **NUNCA** hagas commit del archivo `.env` al repositorio.

### Para producción en Render:

#### Backend Service

Ve a tu servicio de backend en Render y configura las siguientes variables de entorno:

**Requeridas:**
```
AIRTABLE_PAT=tu_token_de_airtable
MERCADOPAGO_ACCESS_TOKEN=tu_token_de_mercadopago
RESEND_API_KEY=tu_api_key_de_resend
RESEND_FROM_EMAIL=tu_email@dominio.com
ADMIN_PASSWORD=tu_contraseña_segura
```

**URLs:**
```
FRONTEND_URL=https://tu-frontend.onrender.com
BACKEND_URL=https://tu-backend.onrender.com
```

**Seguridad (Recomendado para producción):**
```
CORS_ORIGINS=https://tu-frontend.onrender.com,https://www.tu-dominio.com
```

**Opcionales (Payway):**
```
PAYWAY_SITE_ID=tu_site_id
PAYWAY_PUBLIC_KEY=tu_public_key
PAYWAY_PRIVATE_KEY=tu_private_key
PAYWAY_TEMPLATE_ID=tu_template_id
```

---

## 🐳 Deployment con Docker

### Local

Para levantar todo el proyecto localmente con Docker:

```bash
docker-compose up --build
```

Esto levantará:
- Backend en `http://localhost:10000`
- Frontend en `http://localhost`

### Detener los servicios:

```bash
docker-compose down
```

---

## 🚀 Deployment en Render

### Backend (Flask)

1. Conecta tu repositorio de GitHub a Render
2. Crea un nuevo **Web Service**
3. Configura:
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:10000`
   - **Root Directory:** `backend`
4. Añade todas las variables de entorno listadas arriba
5. Deploy

### Frontend (React + Vite)

1. Crea otro **Static Site** en Render
2. Configura:
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish Directory:** `frontend/dist`
3. Añade variables de entorno si son necesarias:
   ```
   VITE_API_URL=https://tu-backend.onrender.com
   ```
4. Deploy

---

## 🔒 Checklist de Seguridad

Antes de hacer deployment a producción, verifica:

- [ ] `.env` NO está en el repositorio
- [ ] Todas las credenciales están en variables de entorno de Render
- [ ] `CORS_ORIGINS` está configurado con dominios específicos (no "*")
- [ ] Las credenciales en producción son diferentes a las de desarrollo
- [ ] Se configuró HTTPS en producción (Render lo hace automáticamente)
- [ ] La contraseña de admin es segura (no "admin123")

---

## 🧪 Testing del Deployment

Después del deployment, verifica:

1. **Backend health check:**
   ```bash
   curl https://tu-backend.onrender.com/
   ```

2. **CORS funciona correctamente:**
   - Abre el frontend en el navegador
   - Verifica en DevTools > Network que no hay errores CORS

3. **Airtable conecta:**
   - Prueba hacer una búsqueda en el frontend
   - Verifica que los datos se cargan correctamente

4. **Mercado Pago funciona:**
   - Crea un pago de prueba
   - Verifica que se genera el link de pago

5. **Webhooks funcionan:**
   - En Mercado Pago, configura la URL del webhook:
     ```
     https://tu-backend.onrender.com/api/payment_webhook
     ```

---

## 📊 Monitoreo

### Logs en Render

Para ver los logs del backend:
1. Ve a tu servicio en Render Dashboard
2. Click en "Logs"
3. Verás todos los `print()` statements y errores

### Logs en Airtable

El proyecto tiene logging integrado que guarda eventos en una tabla de Airtable.

---

## 🆘 Troubleshooting

### Error: "AIRTABLE_PAT no está configurada"

**Solución:** Verifica que la variable de entorno esté bien configurada en Render.

### Error CORS en el frontend

**Solución:**
1. Verifica que `CORS_ORIGINS` incluya la URL del frontend
2. O temporalmente configúralo como "*" para debugging

### Error 502 Bad Gateway

**Solución:**
- El backend no está levantado correctamente
- Verifica los logs en Render
- Verifica que el comando de start sea correcto

### Los webhooks no funcionan

**Solución:**
1. Verifica que la URL del webhook en Mercado Pago sea correcta
2. Debe ser: `https://tu-backend.onrender.com/api/payment_webhook`
3. Verifica en los logs que los webhooks estén llegando

---

## 🔄 Actualizar el deployment

Render hace auto-deploy cuando haces push a la rama conectada (generalmente `main`).

Para deployment manual:
1. Ve al servicio en Render Dashboard
2. Click en "Manual Deploy" > "Deploy latest commit"

---

## 📝 Notas Adicionales

### CORS para múltiples dominios

Si necesitas permitir múltiples dominios, configura `CORS_ORIGINS` así:

```
CORS_ORIGINS=https://dominio1.com,https://dominio2.com,https://www.dominio1.com
```

### Logging en producción

Los console.logs del frontend NO aparecen en producción si usas el logger:

```typescript
import logger from '@/utils/logger';
logger.debug('Esto solo se ve en desarrollo', data);
```

---

## 📞 Soporte

Si tienes problemas con el deployment, verifica:
1. Logs de Render
2. Logs de Airtable (tabla de logs del proyecto)
3. DevTools del navegador (Console y Network)
