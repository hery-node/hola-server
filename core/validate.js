/**
 * @fileoverview Validation utility functions for checking values and required fields.
 * @module core/validate
 */

/**
 * Check if a value is undefined.
 * @param {*} value - The value to check.
 * @returns {boolean} True if value is undefined, false otherwise.
 */
const is_undefined = (value) => typeof value === 'undefined';

/**
 * Check if a value exists and is meaningful (not null, undefined, NaN, or empty string).
 * @param {*} value - The value to check.
 * @returns {boolean} True if value has meaningful content, false otherwise.
 */
const has_value = (value) => {
    // NaN is the only value that is not equal to itself
    if (value === undefined || value === null || value !== value) return false;
    if (typeof value === 'undefined') return false;
    if (typeof value === 'string' && value.trim().length === 0) return false;
    return true;
};

/**
 * Validate that required fields have values in an object.
 * @param {Object} obj - The object to validate.
 * @param {string[]} field_names - Array of required field names.
 * @returns {string[]} Array of field names that are missing values.
 */
const validate_required_fields = (obj, field_names) => {
    return field_names.filter((field_name) => !has_value(obj[field_name]));
};

module.exports = { is_undefined, has_value, validate_required_fields };