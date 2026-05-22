declare const __APP_VERSION__: string;

interface Window {
	__RUNTIME_CONFIG__?: {
		VITE_RAG_API_URL?: string;
		VITE_RAG_TOKEN?: string;
	};
}
