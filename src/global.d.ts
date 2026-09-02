declare const __APP_VERSION__: string;

interface Window {
	__RUNTIME_CONFIG__?: {
		VITE_RAG_API_URL?: string;
		VITE_RAG_TOKEN?: string;
		VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?: string;
		VITE_APPINSIGHTS_CLOUD_ROLE_NAME?: string;
		VITE_APPINSIGHTS_ENABLED?: string;
	};
}
