/**
 * @fileoverview Object manipulation utility functions.
 * @module core/obj
 */

/**
 * Create a new object by copying specified attributes from source object.
 * @param {Object} obj - Source object to copy from.
 * @param {string[]} attrs - Array of attribute names to copy.
 * @returns {Object} New object containing only the specified attributes.
 */
const copy_obj = (obj, attrs) => {
    const copied = {};
    attrs.forEach((attr) => { copied[attr] = obj[attr]; });
    return copied;
};

/**
 * Check if a value is a plain object (not null, not array).
 * @param {*} obj - Value to check.
 * @returns {boolean} True if value is a plain object, false otherwise.
 */
const is_object = (obj) => typeof obj === 'object' && obj !== null && !Array.isArray(obj);

module.exports = { copy_obj, is_object };