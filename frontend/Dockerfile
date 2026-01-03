# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app/frontend

# Copia los archivos de configuración y dependencias
COPY package.json ./
COPY package-lock.json ./

# Instala las dependencias
RUN npm install

# Copia el resto del código y construye la aplicación
COPY . .
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:alpine

# Copia los archivos estáticos construidos desde la etapa 'builder'
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copia nuestro script de entrypoint y la configuración de Nginx
COPY ./entrypoint.sh /entrypoint.sh
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Haz que el script de entrypoint sea ejecutable
RUN chmod +x /entrypoint.sh

# Expón el puerto 80, que es el puerto por defecto de Nginx
EXPOSE 80

# El entrypoint se encargará de iniciar Nginx
ENTRYPOINT ["/entrypoint.sh"]
