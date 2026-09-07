import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
    closeChatSession,
    createSessionE2EEKeyPair,
    sendChatMessage,
    startChatSession,
    verifySessionInactivity,
} from './services/api';
import { encryptE2EEMessage } from './utils/e2ee';

vi.mock('./services/api', () => ({
    closeChatSession: vi.fn(),
    createSessionE2EEKeyPair: vi.fn(),
    sendChatMessage: vi.fn(),
    startChatSession: vi.fn(),
    verifySessionInactivity: vi.fn(),
}));

vi.mock('./services/telemetry', () => ({
    trackErrorTrace: vi.fn(),
    trackException: vi.fn(),
}));

vi.mock('./utils/e2ee', () => ({
    encryptE2EEMessage: vi.fn(),
}));

const sessionId = '353a8f28-b982-4107-a073-ce479f09f08e';
const e2eeResponse = {
    session_id: sessionId,
    public_key: '-----BEGIN PUBLIC KEY-----\nPUBLIC\n-----END PUBLIC KEY-----',
    algorithm: 'RSA-OAEP-SHA256' as const,
    key_size: 4096,
    max_plaintext_bytes: 446,
};

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
};

describe('App E2EE flow', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        vi.mocked(closeChatSession).mockResolvedValue(null);
        vi.mocked(verifySessionInactivity).mockResolvedValue({
            session_id: sessionId,
            inactivity_status: 'pending',
        });
        vi.mocked(startChatSession).mockResolvedValue({
            session_id: sessionId,
            reply: 'Ingresa tu usuario',
            step: 'bot_active',
            input_type: 'bv_username',
        });
        vi.mocked(sendChatMessage).mockResolvedValue({
            session_id: sessionId,
            reply: 'Dato recibido',
            step: 'bot_active',
        });
        vi.mocked(encryptE2EEMessage).mockResolvedValue('BASE64_CIPHERTEXT');
    });

    afterEach(() => {
        cleanup();
    });

    it('creates and persists the key, then sends only ciphertext for sensitive input', async () => {
        const keyRequest = deferred<typeof e2eeResponse>();
        vi.mocked(createSessionE2EEKeyPair).mockReturnValue(keyRequest.promise);
        render(<App />);

        const initialInput = screen.getByPlaceholderText('Pregunta a Anita...');
        fireEvent.change(initialInput, { target: { value: 'hola' } });
        fireEvent.click(screen.getByRole('button', { name: '' }));

        await screen.findByText('Ingresa tu usuario');
        expect(createSessionE2EEKeyPair).toHaveBeenCalledTimes(1);
        expect((screen.getByPlaceholderText('Pregunta a Anita...') as HTMLTextAreaElement).disabled).toBe(true);
        expect(sendChatMessage).not.toHaveBeenCalled();

        await act(async () => keyRequest.resolve(e2eeResponse));
        const sensitiveInput = await screen.findByPlaceholderText('Pregunta a Anita...');
        await waitFor(() => expect((sensitiveInput as HTMLTextAreaElement).disabled).toBe(false));

        const plaintext = 'usuario-original-secreto';
        fireEvent.change(sensitiveInput, { target: { value: plaintext } });
        fireEvent.click(screen.getByRole('button', { name: '' }));

        await waitFor(() => {
            expect(encryptE2EEMessage).toHaveBeenCalledWith(plaintext, {
                public_key: e2eeResponse.public_key,
                algorithm: e2eeResponse.algorithm,
                max_plaintext_bytes: e2eeResponse.max_plaintext_bytes,
            });
            expect(sendChatMessage).toHaveBeenCalledWith(
                sessionId,
                'BASE64_CIPHERTEXT',
                true,
            );
        });

        const cachedState = localStorage.getItem('rag_chat_state') ?? '';
        expect(cachedState).not.toContain(plaintext);
        expect(cachedState).toContain('Información privada');
        expect(JSON.parse(cachedState).e2ee).toEqual({
            public_key: e2eeResponse.public_key,
            algorithm: e2eeResponse.algorithm,
            max_plaintext_bytes: e2eeResponse.max_plaintext_bytes,
        });
    });

    it('keeps sensitive input blocked after key failure and enables explicit retry', async () => {
        vi.mocked(createSessionE2EEKeyPair)
            .mockRejectedValueOnce(new Error('backend details'))
            .mockResolvedValueOnce(e2eeResponse);
        render(<App />);

        const initialInput = screen.getByPlaceholderText('Pregunta a Anita...');
        fireEvent.change(initialInput, { target: { value: 'hola' } });
        fireEvent.click(screen.getByRole('button', { name: '' }));

        const retry = await screen.findByRole('button', { name: 'Reintentar' });
        expect((screen.getByPlaceholderText('Pregunta a Anita...') as HTMLTextAreaElement).disabled).toBe(true);
        expect(sendChatMessage).not.toHaveBeenCalled();

        fireEvent.click(retry);

        await waitFor(() => {
            expect(createSessionE2EEKeyPair).toHaveBeenCalledTimes(2);
            expect((screen.getByPlaceholderText('Pregunta a Anita...') as HTMLTextAreaElement).disabled).toBe(false);
        });
    });
});