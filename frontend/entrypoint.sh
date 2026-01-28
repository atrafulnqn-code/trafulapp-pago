#!/bin/sh

# Asegurarse de que la URL del API tenga el sufijo /api
API_URL="${VITE_API_BASE_URL}"

# Si la URL no termina en /api, agregarlo
if [ -n "$API_URL" ] && [ "$API_URL" != "__VITE_API_BASE_URL__" ]; then
    case "$API_URL" in
        */api)
            # Ya tiene /api, no hacer nada
            ;;
        *)
            # No tiene /api, agregarlo
            API_URL="${API_URL}/api"
            ;;
    esac
fi

# Sustituir el placeholder en el archivo de configuración con el valor de la variable de entorno
# Usamos un delimitador diferente para sed (#) para evitar conflictos si la URL contiene slashes (/)
echo "==================================="
echo "Configurando env-config.js"
echo "VITE_API_BASE_URL original: ${VITE_API_BASE_URL}"
echo "VITE_API_BASE_URL final: ${API_URL}"
echo "==================================="
sed -i "s#__VITE_API_BASE_URL__#${API_URL}#g" /usr/share/nginx/html/env-config.js

echo "Contenido de env-config.js:"
cat /usr/share/nginx/html/env-config.js
echo "==================================="

# Iniciar Nginx en primer plano
echo "Iniciando Nginx..."
exec nginx -g 'daemon off;'
