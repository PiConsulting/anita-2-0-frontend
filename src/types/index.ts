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
    step?: ChatStep;
    input_type?: InputType;
    isSensitive?: boolean;
    sensitiveType?: SensitiveInputType;
    options?: Record<string, string>;
    inactivity_status?: InactivityStatus;
}

export type InactivityStatus = 'pending' | 'inactivity_warned_1' | 'inactivity_warned_2';

export type SensitiveInputType = 'bv_username' | 'bv_password';

export type InputType = SensitiveInputType | (string & {});

export type ChatStep =
    | 'terms_pending'
    | 'id_type'
    | 'id_number'
    | 'bot_active'
    | 'bot_survey'
    | 'finished'
    | 'hand-off'
    | (string & {});

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
    step: ChatStep;
    input_type?: InputType;
    options?: Record<string, string>;
    finished?: boolean;
    inactivity_status?: InactivityStatus;
}

export interface MessageRequest {
    session_id: string;
    message: string;
    e2ee?: true;
}

export interface E2EEPublicKeyResponse {
    session_id: string;
    public_key: string;
    algorithm: 'RSA-OAEP-SHA256' | (string & {});
    key_size: number;
    max_plaintext_bytes: number;
}

export type E2EEConfig = Pick<
    E2EEPublicKeyResponse,
    'public_key' | 'algorithm' | 'max_plaintext_bytes'
>;

export type E2EEStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface MessageResponse {
    session_id: string;
    reply: string;
    step: ChatStep;
    input_type?: InputType;
    options?: Record<string, string>;
    finished?: boolean;
    inactivity_status?: InactivityStatus;
}

export interface VerifyInactivityResponse {
    session_id: string;
    message?: string;
    reply?: string;
    options?: Record<string, string>;
    step?: ChatStep;
    input_type?: InputType;
    finished?: boolean;
    inactivity_status: InactivityStatus;
}
