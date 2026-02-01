/**
 * Encryption and hashing utility functions.
 * @module core/encrypt
 */

import { get_settings } from '../setting.js';
import crypto from 'crypto';

/** Generate MD5 hash of content using Bun's native CryptoHasher. */
export const md5 = (content: string): string => {
    const hasher = new Bun.CryptoHasher('md5');
    hasher.update(content);
    return hasher.digest('hex');
};

/** Encrypt password using MD5 with salt. (One-way hashing for passwords) */
export const encrypt_pwd = (password: string): string => {
    const crypto_key = get_settings().encrypt.key;
    return md5(`BGT*&+${password}&76w${crypto_key}`);
};

/**
 * Encrypt a secret using AES-256-CBC (reversible encryption).
 * Use this for API tokens, secrets that need to be retrieved later.
 */
export const encrypt_secret = (plaintext: string): string => {
    if (!plaintext) return '';
    const key = get_settings().encrypt.key;
    // Derive a 32-byte key from the settings key
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Prepend IV to the encrypted text for decryption
    return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt a secret encrypted with encrypt_secret.
 */
export const decrypt_secret = (encrypted: string): string => {
    if (!encrypted || !encrypted.includes(':')) return '';
    const key = get_settings().encrypt.key;
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    const [ivHex, encryptedText] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
