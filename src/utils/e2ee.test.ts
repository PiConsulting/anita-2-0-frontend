// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { E2EEConfig } from '../types/index';
import { encryptE2EEMessage } from './e2ee';

const toPem = (spki: ArrayBuffer): string => {
    const base64 = Buffer.from(spki).toString('base64');
    const body = base64.match(/.{1,64}/g)?.join('\n') ?? base64;
    return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
};

const createKeyFixture = async () => {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt'],
    );
    const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const config: E2EEConfig = {
        public_key: toPem(spki),
        algorithm: 'RSA-OAEP-SHA256',
        max_plaintext_bytes: 190,
    };

    return { config, privateKey: keyPair.privateKey };
};

describe('encryptE2EEMessage', () => {
    it('encrypts UTF-8 content as standard Base64 with RSA-OAEP SHA-256', async () => {
        const { config, privateKey } = await createKeyFixture();
        const plaintext = 'usuario-seguro-ñ';

        const encodedCiphertext = await encryptE2EEMessage(plaintext, config);
        const ciphertext = Uint8Array.from(
            Buffer.from(encodedCiphertext, 'base64'),
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKey,
            ciphertext,
        );

        expect(new TextDecoder().decode(decrypted)).toBe(plaintext);
        expect(encodedCiphertext).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });

    it('rejects content that exceeds the UTF-8 byte limit without exposing it', async () => {
        const { config } = await createKeyFixture();
        const plaintext = 'contraseña-que-no-debe-aparecer';

        await expect(encryptE2EEMessage(plaintext, {
            ...config,
            max_plaintext_bytes: 4,
        })).rejects.not.toThrow(plaintext);
    });

    it('rejects unsupported algorithms', async () => {
        const { config } = await createKeyFixture();

        await expect(encryptE2EEMessage('dato', {
            ...config,
            algorithm: 'RSA-OAEP-SHA1',
        })).rejects.toThrow('no es compatible');
    });
});