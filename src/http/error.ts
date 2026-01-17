/**
 * Error handling utilities for Elysia.
 * @module http/error
 */

import { Elysia } from 'elysia';
import { ERROR } from './code.js';
import { LOG_SYSTEM, is_log_error, log_error } from '../db/db.js';

/** Register global error handler on Elysia app. */
export const handle_exception = (app: Elysia<any>): void => {
    app.onError(({ error, request, set }) => {
        if (error) {
            const err = error as Error;
            const error_msg = err.stack || err.message || JSON.stringify(error);
            if (is_log_error()) {
                log_error(LOG_SYSTEM, error_msg, { path: new URL(request.url).pathname, method: request.method });
            } else {
                console.error('[Error]', error_msg);
            }
        }
        set.status = 500;
        return { code: ERROR, err: "server error" };
    });
};
