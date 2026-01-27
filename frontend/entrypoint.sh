#!/bin/sh

# Sustituir el placeholder en el archivo de configuración con el valor de la variable de entorno
# Usamos un delimitador diferente para sed (#) para evitar conflictos si la URL contiene slashes (/)
echo "==================================="
echo "Configurando env-config.js"
echo "VITE_API_BASE_URL: ${VITE_API_BASE_URL}"
echo "==================================="
sed -i "s#__VITE_API_BASE_URL__#${VITE_API_BASE_URL}#g" /usr/share/nginx/html/env-config.js

echo "Contenido de env-config.js:"
cat /usr/share/nginx/html/env-config.js
echo "==================================="

# Iniciar Nginx en primer plano
echo "Iniciando Nginx..."
exec nginx -g 'daemon off;'
