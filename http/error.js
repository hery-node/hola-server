/**
 * @fileoverview Error handling middleware and utilities.
 * @module http/error
 */

const { ERROR } = require('./code');
const { LOG_SYSTEM, is_log_error, log_error } = require('../db/db');

/**
 * Wrap async route handler to catch errors.
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
const wrap_http = fn => (...args) => fn(...args).catch(args[2]);

/**
 * Global error handler middleware.
 * Logs errors when enabled and returns standardized error response.
 * @param {Object} app - Express application instance
 */
const handle_exception = app => {
    app.use(function (error, req, res, next) {
        if (error) {
            const error_msg = error.stack || error.message || JSON.stringify(error);

            if (is_log_error()) {
                log_error(LOG_SYSTEM, error_msg, { path: req.originalUrl, method: req.method });
            } else {
                console.error('[Error]', error_msg);
            }
        }

        if (!res.headersSent) {
            res.json({ code: ERROR, err: "server error" });
        }
    });
};

module.exports = { wrap_http, handle_exception };
