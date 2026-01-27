#!/bin/sh

# Agregar /api al final de la URL del backend si no lo tiene
# Primero removemos cualquier / al final, luego agregamos /api
API_URL=$(echo "${VITE_API_BASE_URL}" | sed 's#/$##')/api

# Sustituir el placeholder en el archivo de configuración con el valor de la variable de entorno
# Usamos un delimitador diferente para sed (#) para evitar conflictos si la URL contiene slashes (/)
echo "Sustituyendo variables de entorno en env-config.js..."
echo "VITE_API_BASE_URL original: ${VITE_API_BASE_URL}"
echo "API_URL con /api: ${API_URL}"
sed -i "s#__VITE_API_BASE_URL__#${API_URL}#g" /usr/share/nginx/html/env-config.js

# Iniciar Nginx en primer plano
echo "Iniciando Nginx..."
exec nginx -g 'daemon off;'
