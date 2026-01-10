/**
 * @fileoverview Request parameter extraction utilities.
 * @module http/params
 */

const { has_value, is_undefined } = require('../core/validate');

/**
 * Extract parameters from input object using a filter function.
 * @param {Object} input - Source object (req.query or req.body)
 * @param {string[]} params - Parameter names to extract
 * @param {Function} filter_fn - Function to determine if param should be included
 * @returns {Object} Object containing extracted parameters
 */
const extract_params = (input, params, filter_fn) => {
    const obj = {};
    for (const param of params) {
        if (filter_fn(input[param])) {
            obj[param] = input[param];
        }
    }
    return obj;
};

/**
 * Extract specified parameters from input object (only if values are present).
 * @param {Object} input - Source object (req.query or req.body)
 * @param {string[]} params - Parameter names to extract
 * @returns {Object} Object containing extracted parameters
 */
const parse_params = (input, params) => extract_params(input, params, has_value);

/**
 * Extract query parameters from request.
 * @param {Object} req - Express request
 * @param {string[]} params - Parameter names to extract
 * @returns {Object} Extracted parameters
 */
const get_params = (req, params) => parse_params(req.query, params);

/**
 * Extract body parameters from request.
 * @param {Object} req - Express request
 * @param {string[]} params - Parameter names to extract
 * @returns {Object} Extracted parameters
 */
const post_params = (req, params) => parse_params(req.body, params);

/**
 * Extract update parameters from request body, including undefined values.
 * Used for partial updates where undefined means "don't change".
 * @param {Object} req - Express request
 * @param {string[]} params - Parameter names to extract
 * @returns {Object} Extracted parameters
 */
const post_update_params = (req, params) => extract_params(req.body, params, v => !is_undefined(v));

/**
 * Extract required parameters, returning null if any are missing.
 * @param {Object} input - Source object
 * @param {string[]} params - Required parameter names
 * @returns {Object|null} Extracted parameters or null if any missing
 */
const required_params = (input, params) => {
    const result = parse_params(input, params);
    return Object.keys(result).length === params.length ? result : null;
};

/**
 * Extract required query parameters from request.
 * @param {Object} req - Express request
 * @param {string[]} params - Required parameter names
 * @returns {Object|null} Extracted parameters or null if any missing
 */
const required_get_params = (req, params) => required_params(req.query, params);

/**
 * Extract required body parameters from request.
 * @param {Object} req - Express request
 * @param {string[]} params - Required parameter names
 * @returns {Object|null} Extracted parameters or null if any missing
 */
const required_post_params = (req, params) => required_params(req.body, params);

module.exports = { get_params, post_params, post_update_params, required_get_params, required_post_params, required_params };
