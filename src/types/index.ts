export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface ChatResponse {
    answer: string;
    sources?: string[];
}

export interface ChatRequest {
    query: string;
    history?: Message[];
}

export interface StartSessionRequest {
    message: string;
}

export interface StartSessionResponse {
    session_id: string;
    reply: string;
    step: string;
}

export interface MessageRequest {
    session_id: string;
    message: string;
}

export interface MessageResponse {
    session_id: string;
    reply: string;
    step: string;
    finished?: boolean;
}
