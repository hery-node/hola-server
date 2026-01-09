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
    if (!server.exclude_urls || !Array.isArray(server.exclude_urls)) {
        return false;
    }

    return server.exclude_urls.some((pattern) => {
        const re = new RegExp(pattern, "i");
        return re.test(req.originalUrl);
    });
};

/**
 * Initialize session context and call next middleware.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const init_request_context = (req, res, next) => {
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
    if (!settings || !settings.server) {
        throw new Error('Server settings required for initialization');
    }

    const { server } = settings;
    const { threshold } = server;

    init_cors(app);

    if (threshold && threshold.body_limit) {
        app.use(express.json({ limit: threshold.body_limit, extended: true }));
        app.use(express.urlencoded({ limit: threshold.body_limit, extended: true }));
    } else {
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
    }

    init_session(app);

    app.use((req, res, next) => {
        if (server.check_user && !is_excluded_url(server, req)) {
            const user_id = get_session_user_id(req);
            if (!user_id) {
                res.json({ code: NO_SESSION, err: "authentication required" });
                return;
            }
        }
        init_request_context(req, res, next);
    });

    init_router_dirs(app, base_dir);
    handle_exception(app);

    const port = server[port_attr];
    if (!port) {
        throw new Error(`Port attribute '${port_attr}' not found in server settings`);
    }

    app.listen(port, async () => {
        if (callback) {
            await callback();
        }
    });

    server_initialized = true;
    return app;
};

module.exports = { init_express_server };