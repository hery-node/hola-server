/**
 * HTTP error classes.
 * @module errors/http
 */

/** Error thrown when a requested resource is not found. */
export class NotFoundError extends Error {
    readonly code = 'NOT_FOUND';

    constructor(message = 'resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}

/** Error thrown when user lacks required permissions. */
export class NoRightsError extends Error {
    readonly code = 'NO_RIGHTS';

    constructor(message = 'no rights') {
        super(message);
        this.name = 'NoRightsError';
    }
}
