# Etapa 1: Build de la aplicación con Node
FROM crdevanita20eastus-gef0dfe9gvc9c6eh.azurecr.io/node:22-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .


# Argumentos de construcción para inyectar variables de entorno en el build
ARG VITE_RAG_API_URL
ARG VITE_RAG_TOKEN
ENV VITE_RAG_API_URL=$VITE_RAG_API_URL
ENV VITE_RAG_TOKEN=$VITE_RAG_TOKEN

# Construir la aplicación para producción (se genera la carpeta 'dist')
RUN npm run build

# Etapa 2: Servir la aplicación con Nginx
FROM nginx:alpine

# Opcional: Copiar configuración personalizada de Nginx para Single Page Applications
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Script para inyectar variables de entorno en runtime para frontend estatico
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copiar los archivos estáticos desde la etapa de build al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["/docker-entrypoint.sh"]
