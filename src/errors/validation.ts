/**
 * Validation error class.
 * @module errors/validation
 */

/** Error thrown when request validation fails. */
export class ValidationError extends Error {
    readonly code = 'INVALID';
    readonly fields: string[];

    constructor(message: string, fields: string[] = []) {
        super(message);
        this.name = 'ValidationError';
        this.fields = fields;
    }
}
