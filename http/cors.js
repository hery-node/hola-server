/**
 * @fileoverview CORS middleware initialization.
 * @module http/cors
 */

const cors = require('cors');
const { get_settings } = require('../setting');

/**
 * Initialize CORS middleware with client URL whitelist.
 * @param {Object} app - Express application instance
 * @throws {Error} If server settings are missing
 */
const init_cors = (app) => {
    const settings = get_settings();
    if (!settings?.server) {
        throw new Error('Server settings required for CORS initialization');
    }

    const client_urls = settings.server.client_web_url;
    if (!Array.isArray(client_urls)) {
        return;
    }

    app.use(cors({
        origin: client_urls,
        methods: ['GET', 'POST'],
        credentials: true
    }));
};

module.exports = { init_cors };
