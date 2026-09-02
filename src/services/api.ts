import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type {
    E2EEPublicKeyResponse,
    MessageRequest,
    StartSessionResponse,
    MessageResponse,
    VerifyInactivityResponse,
} from '../types/index';
import { trackBackendHttpError, trackException } from './telemetry';

const runtimeConfig = window.__RUNTIME_CONFIG__;

const RAG_API_URL = runtimeConfig?.VITE_RAG_API_URL || import.meta.env.VITE_RAG_API_URL;
const RAG_TOKEN = runtimeConfig?.VITE_RAG_TOKEN || import.meta.env.VITE_RAG_TOKEN;

const headers: Record<string, string> = {
    'Content-Type': 'application/json',
};

if (RAG_TOKEN?.trim()) {
    headers['X-API-Key'] = RAG_TOKEN.trim();
} else {
    console.warn('VITE_RAG_TOKEN no esta definido; se envia request sin X-API-Key.');
}

const api = axios.create({
    baseURL: RAG_API_URL,
    headers,
});

const requestStartTimes = new WeakMap<InternalAxiosRequestConfig, number>();

const getSafeRequestPath = (config?: InternalAxiosRequestConfig): string => {
    const rawUrl = config?.url ?? 'unknown';

    try {
        const url = new URL(rawUrl, config?.baseURL ?? window.location.origin);
        return url.pathname;
    } catch {
        return rawUrl.split('?')[0] || 'unknown';
    }
};

api.interceptors.request.use((config) => {
    requestStartTimes.set(config, Date.now());
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            if (status && status >= 500) {
                const config = error.config;
                const startTime = config ? requestStartTimes.get(config) : undefined;
                const durationMs = startTime
                    ? Date.now() - startTime
                    : undefined;

                trackBackendHttpError({
                    method: config?.method?.toUpperCase() ?? 'UNKNOWN',
                    path: getSafeRequestPath(config),
                    status,
                    durationMs,
                    source: 'api.interceptor',
                });
            }
        }

        return Promise.reject(error);
    }
);

export const startChatSession = async (message: string): Promise<StartSessionResponse> => {
    try {
        const response = await api.post<StartSessionResponse>('/chatbot/session/start', { message });
        return response.data;
    } catch {
        throw new Error('Hubo un error al iniciar la sesión. Por favor, intenta de nuevo.');
    }
};

export const createSessionE2EEKeyPair = async (
    sessionId: string,
): Promise<E2EEPublicKeyResponse> => {
    try {
        const response = await api.post<E2EEPublicKeyResponse>(
            `/chatbot/session/${sessionId}/e2ee/public-key`,
        );
        return response.data;
    } catch {
        throw new Error('No fue posible habilitar el cifrado seguro.');
    }
};

export const sendChatMessage = async (
    sessionId: string,
    message: string,
    e2ee?: true,
): Promise<MessageResponse> => {
    try {
        const payload: MessageRequest = { session_id: sessionId, message };
        if (e2ee) {
            payload.e2ee = true;
        }
        const response = await api.post<MessageResponse>('/chatbot/session/message', payload);
        return response.data;
    } catch {
        throw new Error('Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.');
    }
};

export const closeChatSession = async (sessionId: string): Promise<unknown | null> => {
    try {
        const response = await api.delete(`/chatbot/session/${sessionId}`);
        return response.data;
    } catch (error) {
        trackException(error, {
            source: 'api.closeChatSession',
            path: '/chatbot/session/:sessionId',
        });
        // Fallamos silenciosamente o lanzamos error según se prefiera; mejor loguear solamente
        return null;
    }
};

export const verifySessionInactivity = async (sessionId: string): Promise<VerifyInactivityResponse> => {
    try {
        const response = await api.post<VerifyInactivityResponse>('/chatbot/session/inactivity/verify', {
            session_id: sessionId,
        });
        return response.data;
    } catch (error) {
        trackException(error, {
            source: 'api.verifySessionInactivity',
            path: '/chatbot/session/inactivity/verify',
        });
        throw error;
    }
};

export default api;
