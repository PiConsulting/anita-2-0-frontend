import axios from 'axios';
import type { StartSessionResponse, MessageResponse } from '../types/index';

const RAG_API_URL = import.meta.env.VITE_RAG_API_URL;

const api = axios.create({
    baseURL: RAG_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
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

export const closeChatSession = async (sessionId: string): Promise<any> => {
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

export default api;
