/**
 * @fileoverview Random generation utility functions.
 * @module core/random
 */

/**
 * Generate random 6-digit code.
 * @returns {number} Random number between 0 and 999999.
 */
const random_code = () => Math.floor(Math.random() * 1000000);

module.exports = { random_code };