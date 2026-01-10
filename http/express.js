/**
 * @fileoverview Express server initialization and configuration.
 * @module http/express
 */

const express = require('express');

const { init_cors } = require('./cors');
const { NO_SESSION } = require('./code');
const { init_session, get_session_user_id } = require('./session');
const { init_router_dirs } = require('./router');
const { handle_exception } = require('./error');
const { get_settings } = require('../setting');
const { asyncLocalStorage, set_context_value } = require('./context');

const app = express();
let server_initialized = false;

/**
 * Check if URL is in the excluded list.
 * @param {Object} server - Server settings
 * @param {Object} req - Express request
 * @returns {boolean} True if URL should be excluded from auth
 */
const is_excluded_url = (server, req) => {
    const patterns = server.exclude_urls;
    if (!Array.isArray(patterns)) {
        return false;
    }
    return patterns.some(pattern => new RegExp(pattern, "i").test(req.originalUrl));
};

/**
 * Configure body parser middleware with optional size limit.
 * @param {Object} app - Express application
 * @param {string|undefined} body_limit - Optional body size limit
 */
const configure_body_parser = (app, body_limit) => {
    const options = body_limit ? { limit: body_limit, extended: true } : { extended: true };
    app.use(express.json(options));
    app.use(express.urlencoded(options));
};

/**
 * Create authentication middleware.
 * @param {Object} server - Server settings
 * @returns {Function} Express middleware
 */
const create_auth_middleware = (server) => (req, res, next) => {
    if (server.check_user && !is_excluded_url(server, req)) {
        if (!get_session_user_id(req)) {
            res.json({ code: NO_SESSION, err: "authentication required" });
            return;
        }
    }

    asyncLocalStorage.run({}, () => {
        set_context_value("req", req);
        next();
    });
};

/**
 * Initialize Express server with middleware and routes.
 * @param {string} base_dir - Base directory for router files
 * @param {string} port_attr - Port attribute name in settings
 * @param {Function} [callback] - Optional callback after server starts
 * @returns {Object} Express app instance
 * @throws {Error} If server settings are invalid
 */
const init_express_server = (base_dir, port_attr, callback) => {
    if (server_initialized) {
        return app;
    }

    const settings = get_settings();
    if (!settings?.server) {
        throw new Error('Server settings required for initialization');
    }

    const { server } = settings;
    const port = server[port_attr];
    if (!port) {
        throw new Error(`Port attribute '${port_attr}' not found in server settings`);
    }

    init_cors(app);
    configure_body_parser(app, server.threshold?.body_limit);
    init_session(app);
    app.use(create_auth_middleware(server));
    init_router_dirs(app, base_dir);
    handle_exception(app);

    app.listen(port, async () => {
        if (callback) await callback();
    });

    server_initialized = true;
    return app;
};

module.exports = { init_express_server };