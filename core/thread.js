/**
 * @fileoverview Threading and async utility functions.
 * @module core/thread
 */

/**
 * Sleep for specified milliseconds.
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>} Promise that resolves after delay.
 */
const snooze = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { snooze };
