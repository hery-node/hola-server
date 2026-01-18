/**
 * Encryption and hashing utility functions.
 * @module core/encrypt
 */

import { get_settings } from '../setting.js';

/** Generate MD5 hash of content using Bun's native CryptoHasher. */
export const md5 = (content: string): string => {
    const hasher = new Bun.CryptoHasher('md5');
    hasher.update(content);
    return hasher.digest('hex');
};

/** Encrypt password using MD5 with salt. */
export const encrypt_pwd = (password: string): string => {
    const crypto_key = get_settings().encrypt.key;
    return md5(`BGT*&+${password}&76w${crypto_key}`);
};
