# Anita RAG Frontend

Interfaz de usuario moderna y minimalista diseñada para interactuar con servicios de Retrieval-Augmented Generation (RAG). Construida con React, TypeScript y Tailwind CSS, ofreciendo una experiencia fluida, segura y altamente responsiva.

## 🚀 Tecnologías Utilisadas

- **React 19** + **Vite**: Framework y herramienta de construcción de última generación.
- **TypeScript**: Tipado estricto para un desarrollo robusto.
- **Tailwind CSS v4**: Estilos modernos con el nuevo motor de compilación.
- **Lucide React**: Biblioteca de iconos premium.
- **React Markdown**: Renderizado seguro de respuestas enriquecidas.
- **DOMPurify**: Sanitización de contenido para prevenir ataques XSS.
- **Axios**: Cliente HTTP para comunicación con el backend.

## 📁 Estructura del Proyecto

```text
src/
├── components/         # Componentes modulares
│   └── chat/           # Lógica y UI del chat
│       ├── ChatWindow.tsx    # Contenedor de mensajes
│       ├── MessageBubble.tsx # Burbujas de chat con Markdown
│       └── InputArea.tsx     # Área de entrada auto-ajustable
├── services/           # Integración con APIs externas
│   └── api.ts          # Cliente Axios configurado para RAG
├── types/              # Definiciones de TypeScript
├── utils/              # Funciones de utilidad (cn, sanitization)
├── App.tsx             # Orquestador principal y gestión de temas
└── index.css           # Configuración de Tailwind v4 y variables globales
```

## 🛠️ Instalación y Configuración

### Prerrequisitos
- **Node.js**: v18.0.0 o superior.
- **npm** o **pnpm**.

### Pasos para iniciar
1. **Clonar el repositorio** e instalar dependencias:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto basándote en el ejemplo:
   ```bash
   cp .env.example .env
   ```
   Edita `.env` y define `VITE_RAG_API_URL` con la URL de tu backend. Para telemetria frontend, define `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` con la cadena de conexion del recurso Application Insights del entorno.

3. **Levantar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

## 🛡️ Notas de Arquitectura y Seguridad

- **Frontend Desacoplado**: Este proyecto es puramente el cliente. No incluye lógica de backend ni bases de datos vectoriales. Toda la comunicación se realiza vía peticiones HTTP seguras.
- **Seguridad (XSS)**: Todo el contenido devuelto por el RAG es pasado por `DOMPurify` antes de ser renderizado por `React Markdown`.
- **Modo Oscuro**: Implementado nativamente usando clases de Tailwind y persistencia en `localStorage`.
- **Variables de Entorno**: No se incluyen secretos en el código fuente. En desarrollo se usan variables `VITE_*`; en Azure Container Apps el contenedor genera `env-config.js` al iniciar para resolver variables runtime.
- **Telemetria**: Application Insights captura excepciones frontend, promesas rechazadas, errores de render y errores HTTP 500 observados contra el backend. No se envian mensajes del usuario, documentos ni tokens como propiedades custom.

## 📡 Application Insights y Alertas

Variables requeridas por entorno:

```bash
VITE_APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=...;IngestionEndpoint=..."
VITE_APPINSIGHTS_CLOUD_ROLE_NAME=anita-frontend
VITE_APPINSIGHTS_ENABLED=true
```

Para crear o actualizar las alertas de Azure Monitor del entorno actual sobre un recurso Application Insights existente:

```powershell
.\scripts\deploy_appinsights_alerts.ps1 `
   -Subscription "subs-dev-001" `
   -ResourceGroup "rg-dev-anita-2-0-eastus-001" `
   -AppInsightsName "ai-dev-anita-2-0-eastus-00"
```

El script no crea Application Insights. Busca el recurso existente, crea o actualiza un Action Group con los correos configurados y crea o actualiza tres reglas: excepciones frontend, errores backend 500-599 observados por el frontend, y trazas de error/irregularidad emitidas por la aplicacion. Cambia los parametros para cada suscripcion, grupo de recursos y recurso Application Insights.

---
Desarrollado con enfoque en Clean Code y Visual Excellence.
