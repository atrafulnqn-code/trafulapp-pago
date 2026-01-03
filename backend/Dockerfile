# Usa una imagen base de Python. Elige la versión que uses localmente.
FROM python:3.11-slim-bookworm

# Instala las dependencias del sistema para WeasyPrint
RUN apt-get update && apt-get install -y \
build-essential \
libcairo2-dev \
libpango1.0-dev \
libgdk-pixbuf2.0-dev \
libffi-dev \
shared-mime-info \
libjpeg-dev \
python3-dev \
&& rm -rf /var/lib/apt/lists/*

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app/backend

# Copia el archivo de requisitos e instala las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código de la aplicación
COPY . .

# Expón el puerto en el que la aplicación Flask se ejecutará
EXPOSE 10000

# Comando para ejecutar la aplicación con Gunicorn
# 'app:app' se refiere a la instancia de Flask 'app' en el archivo 'app.py'
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000"]
