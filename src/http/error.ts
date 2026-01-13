/**
 * Error handling middleware and utilities.
 * @module http/error
 */

import { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import { ERROR } from './code.js';
import { LOG_SYSTEM, is_log_error, log_error } from '../db/db.js';

/** Wrap async route handler to catch errors. */
export const wrap_http = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler => {
    return (req, res, next) => fn(req, res, next).catch(next);
};

/** Global error handler middleware. */
export const handle_exception = (app: Express): void => {
    app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
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
