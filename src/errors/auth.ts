/**
 * Authentication error classes.
 * @module errors/auth
 */

/** Error thrown when authentication is required but not provided. */
export class AuthError extends Error {
    readonly code = 'NO_SESSION';

    constructor(message = 'authentication required') {
        super(message);
        this.name = 'AuthError';
    }
}

/** Error thrown when JWT token has expired. */
export class TokenExpiredError extends Error {
    readonly code = 'TOKEN_EXPIRED';

    constructor(message = 'token expired') {
        super(message);
        this.name = 'TokenExpiredError';
    }
}
