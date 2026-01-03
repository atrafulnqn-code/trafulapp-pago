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

# Copia la configuración personalizada de Nginx (opcional, si es necesaria)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expón el puerto 80, que es el puerto por defecto de Nginx
EXPOSE 80

# El comando por defecto de Nginx ya inicia el servidor
CMD ["nginx", "-g", "daemon off;"]
