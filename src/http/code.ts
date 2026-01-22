/**
 * HTTP status and error codes.
 * @module http/code
 */

export const ERROR = 500;                  // Internal Server Error
export const SUCCESS = 200;                // OK

// Import errors
export const IMPORT_EMPTY_KEY = 400;       // Bad Request - missing key
export const IMPORT_WRONG_FIELDS = 406;    // Not Acceptable - wrong fields
export const IMPORT_DUPLICATE_KEY = 409;   // Conflict - duplicate in import
export const IMPORT_NO_FOUND_REF = 424;    // Failed Dependency - ref not found

// Auth errors
export const NO_SESSION = 401;             // Unauthorized
export const NO_RIGHTS = 403;              // Forbidden

// Validation errors
export const NO_PARAMS = 400;              // Bad Request - missing params
export const NOT_FOUND = 404;              // Not Found
export const INVALID_PARAMS = 422;         // Unprocessable Entity

// Reference errors
export const REF_NOT_FOUND = 424;          // Failed Dependency - ref lookup failed
export const REF_NOT_UNIQUE = 300;         // Multiple Choices - ambiguous reference

// Integrity errors
export const HAS_REF = 423;                // Locked - has dependent references
export const DUPLICATE_UNIQUE = 409;       // Conflict - unique field exists

// Resource errors
export const NO_RESOURCE = 410;            // Gone - resource unavailable
