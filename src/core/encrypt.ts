/**
 * Encryption and hashing utility functions.
 * @module core/encrypt
 */

import crypto from 'crypto';
import { get_settings } from '../setting.js';

/** Generate MD5 hash of content. */
export const md5 = (content: string): string => crypto.createHash('md5').update(content).digest('hex');

/** Encrypt password using MD5 with salt. */
export const encrypt_pwd = (password: string): string => {
    const crypto_key = get_settings().encrypt.key;
    return md5(`BGT*&+${password}&76w${crypto_key}`);
};
