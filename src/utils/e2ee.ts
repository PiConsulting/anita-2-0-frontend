import type { E2EEConfig } from '../types/index';

const SUPPORTED_ALGORITHM = 'RSA-OAEP-SHA256';

const decodePublicKey = (publicKeyPem: string): ArrayBuffer => {
    const encodedKey = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '');

    if (!encodedKey) {
        throw new Error('No fue posible preparar el cifrado seguro.');
    }

    try {
        const binaryKey = atob(encodedKey);
        return Uint8Array.from(binaryKey, character => character.charCodeAt(0)).buffer;
    } catch {
        throw new Error('No fue posible preparar el cifrado seguro.');
    }
};

const encodeBase64 = (data: ArrayBuffer): string => {
    const bytes = new Uint8Array(data);
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
};

export const encryptE2EEMessage = async (
    plaintext: string,
    config: E2EEConfig,
): Promise<string> => {
    if (config.algorithm !== SUPPORTED_ALGORITHM) {
        throw new Error('El algoritmo de cifrado recibido no es compatible.');
    }

    const plaintextBytes = new TextEncoder().encode(plaintext);
    if (plaintextBytes.byteLength > config.max_plaintext_bytes) {
        throw new Error('La informacion ingresada supera el limite permitido.');
    }

    try {
        const publicKey = await crypto.subtle.importKey(
            'spki',
            decodePublicKey(config.public_key),
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['encrypt'],
        );
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            plaintextBytes,
        );

        return encodeBase64(ciphertext);
    } catch {
        throw new Error('No fue posible cifrar la informacion de forma segura.');
    }
};