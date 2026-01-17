/**
 * Error classes index - exports all error types.
 * @module errors
 */

export { AuthError, TokenExpiredError } from './auth.js';
export { ValidationError } from './validation.js';
export { NotFoundError, NoRightsError } from './http.js';

/** Error code constants for backward compatibility. */
export const ERROR_CODES = {
    SUCCESS: 0,
    ERROR: 1,
    NO_SESSION: 2,
    NO_RIGHTS: 3,
    INVALID: 4,
    NOT_FOUND: 5,
    TOKEN_EXPIRED: 6
} as const;
