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
    if (!settings || !settings.server) {
        throw new Error('Server settings required for CORS initialization');
    }

    const { server } = settings;
    if (server.client_web_url && Array.isArray(server.client_web_url)) {
        app.use(cors({
            origin: server.client_web_url,
            methods: ['GET', 'POST'],
            credentials: true
        }));
    }
};

module.exports = { init_cors };
