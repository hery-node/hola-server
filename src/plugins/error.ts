/**
 * Error handling plugin for Elysia.
 * @module plugins/error
 */

import { Elysia } from 'elysia';
import { AuthError, TokenExpiredError, ValidationError, NotFoundError, NoRightsError } from '../errors/index.js';

interface ErrorWithCode extends Error {
    code?: string;
    fields?: string[];
}

/**
 * Create error handling plugin.
 * Maps custom error classes to HTTP status codes and { code, err } response format.
 */
export const holaError = () =>
    new Elysia({ name: 'hola-error' })
        .error({
            AUTH: AuthError,
            TOKEN_EXPIRED: TokenExpiredError,
            VALIDATION: ValidationError,
            NOT_FOUND: NotFoundError,
            NO_RIGHTS: NoRightsError
        })
        .onError(({ code, error, set }) => {
            const err = error as ErrorWithCode;

            // Map error types to HTTP status
            const status_map: Record<string, number> = {
                AUTH: 401,
                TOKEN_EXPIRED: 401,
                VALIDATION: 400,
                NOT_FOUND: 404,
                NO_RIGHTS: 403,
                PARSE: 400,
                VALIDATION_ERROR: 400,
                UNKNOWN: 500,
                INTERNAL_SERVER_ERROR: 500,
                NOT_FOUND_ERROR: 404
            };

            set.status = status_map[code] ?? 500;

            // Return consistent error format
            const response: Record<string, unknown> = {
                code: err.code ?? code,
                err: err.message
            };

            // Include field list for validation errors
            if (err.fields?.length) {
                response.fields = err.fields;
            }

            return response;
        });
