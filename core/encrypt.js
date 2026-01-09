/**
 * @fileoverview Encryption and hashing utility functions.
 * @module core/encrypt
 */

const crypto = require('crypto');
const { get_settings } = require('../setting');

/**
 * Generate MD5 hash of content.
 * @param {string} content - Content to hash.
 * @returns {string} MD5 hash in hex format.
 */
const md5 = (content) => crypto.createHash('md5').update(content).digest('hex');

/**
 * Encrypt password using MD5 with salt.
 * @param {string} password - Plain text password.
 * @returns {string} Encrypted password hash.
 */
const encrypt_pwd = (password) => {
    const crypto_key = get_settings().encrypt.key;
    return md5(`BGT*&+${password}&76w${crypto_key}`);
};

module.exports = { md5, encrypt_pwd };