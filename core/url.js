/**
 * @fileoverview URL and HTTP request utility functions.
 * @module core/url
 */

const axios = require('axios');
const { get_settings } = require("../setting");

/**
 * Create HTTP request function with preset URL and method.
 * @param {string} url - Request URL.
 * @param {string} method - HTTP method (GET, POST, etc.).
 * @returns {Function} Function that accepts config and returns axios promise.
 */
const url = (url, method) => {
    const settings = get_settings();
    const axios_config = settings.axios;

    return (config) => {
        const params = {
            url,
            method,
            validateStatus: false,
            ...(axios_config.proxy && { proxy: axios_config.proxy })
        };
        return axios.request({ ...params, ...config });
    };
};

module.exports = { url };
