/**
 * Step values returned by the backend for each bot message:
 * - terms_pending : T&C acceptance required (shows Accept/Reject buttons)
 * - id_type       : Requesting document type
 * - id_number     : Requesting document number
 * - bot_active    : Normal active conversation
 * - finished      : Conversation ended
 * - hand-off      : Transferred to human agent
 */
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    step?: string;
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
