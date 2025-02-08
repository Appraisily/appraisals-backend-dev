# Dockerfile

# Usar una imagen base de Node.js oficial
FROM node:18-slim

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el código fuente
COPY . .

# Exponer el puerto que usará la aplicación
EXPOSE 8080

# Comando para iniciar la aplicación
CMD [ "node", "index.js" ]
