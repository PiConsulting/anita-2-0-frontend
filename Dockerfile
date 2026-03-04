# Etapa 1: Build de la aplicación con Node
FROM node:22-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Argumentos de construcción para inyectar variables de entorno en el build
ARG VITE_RAG_API_URL
ENV VITE_RAG_API_URL=$VITE_RAG_API_URL

# Construir la aplicación para producción (se genera la carpeta 'dist')
RUN npm run build

# Etapa 2: Servir la aplicación con Nginx
FROM nginx:alpine

# Opcional: Copiar configuración personalizada de Nginx para Single Page Applications
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos desde la etapa de build al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
