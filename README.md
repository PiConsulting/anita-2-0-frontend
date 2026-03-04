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
   Edita `.env` y define `VITE_RAG_API_URL` con la URL de tu backend.

3. **Levantar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

## 🛡️ Notas de Arquitectura y Seguridad

- **Frontend Desacoplado**: Este proyecto es puramente el cliente. No incluye lógica de backend ni bases de datos vectoriales. Toda la comunicación se realiza vía peticiones HTTP seguras.
- **Seguridad (XSS)**: Todo el contenido devuelto por el RAG es pasado por `DOMPurify` antes de ser renderizado por `React Markdown`.
- **Modo Oscuro**: Implementado nativamente usando clases de Tailwind y persistencia en `localStorage`.
- **Variables de Entorno**: No se incluyen secretos en el código fuente; todo se gestiona vía `import.meta.env`.

---
Desarrollado con enfoque en Clean Code y Visual Excellence.
