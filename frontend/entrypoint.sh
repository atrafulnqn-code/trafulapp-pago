#!/bin/sh

# Sustituir el placeholder en el archivo de configuración con el valor de la variable de entorno
# Usamos un delimitador diferente para sed (#) para evitar conflictos si la URL contiene slashes (/)
echo "Sustituyendo variables de entorno en env-config.js..."
sed -i "s#__VITE_API_BASE_URL__#${VITE_API_BASE_URL}#g" /usr/share/nginx/html/env-config.js

# Iniciar Nginx en primer plano
echo "Iniciando Nginx..."
exec nginx -g 'daemon off;'
