/**
 * @fileoverview Request context management using AsyncLocalStorage.
 * @module http/context
 */

const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Set value in current request context.
 * @param {string} key - Context key
 * @param {*} obj - Value to store
 */
const set_context_value = (key, obj) => {
    const store = asyncLocalStorage.getStore();
    if (store) {
        store[key] = obj;
    }
};

/**
 * Get value from current request context.
 * @param {string} key - Context key
 * @returns {*} Stored value or null
 */
const get_context_value = (key) => {
    const store = asyncLocalStorage.getStore();
    return store ? store[key] : null;
};

module.exports = { asyncLocalStorage, set_context_value, get_context_value };
