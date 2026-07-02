import axios from 'axios';
import type {
    StartSessionResponse,
    MessageResponse,
    VerifyInactivityResponse,
} from '../types/index';

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

export const startChatSession = async (message: string): Promise<StartSessionResponse> => {
    try {
        const response = await api.post<StartSessionResponse>('/chatbot/session/start', { message });
        console.log('[API Response] /chatbot/session/start:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error starting chat session:', error);
        throw new Error('Hubo un error al iniciar la sesión. Por favor, intenta de nuevo.');
    }
};

export const sendChatMessage = async (sessionId: string, message: string): Promise<MessageResponse> => {
    try {
        const response = await api.post<MessageResponse>('/chatbot/session/message', { session_id: sessionId, message });
        console.log('[API Response] /chatbot/session/message:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error);
        throw new Error('Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.');
    }
};

export const closeChatSession = async (sessionId: string): Promise<unknown | null> => {
    try {
        const response = await api.delete(`/chatbot/session/${sessionId}`);
        console.log('[API Response] /chatbot/session (DELETE):', response.data);
        return response.data;
    } catch (error) {
        console.error('Error closing session:', error);
        // Fallamos silenciosamente o lanzamos error según se prefiera; mejor loguear solamente
        return null;
    }
};

export const verifySessionInactivity = async (sessionId: string): Promise<VerifyInactivityResponse> => {
    try {
        const response = await api.post<VerifyInactivityResponse>('/chatbot/session/inactivity/verify', {
            session_id: sessionId,
        });
        console.log('[API Response] /chatbot/session/inactivity/verify:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error verifying session inactivity:', error);
        throw error;
    }
};

export default api;
