/**
 * @fileoverview Request parameter extraction utilities.
 * @module http/params
 */

const { has_value, is_undefined } = require('../core/validate');

/**
 * Extract specified parameters from input object.
 * @param {Object} input - Source object (req.query or req.body)
 * @param {string[]} params - Parameter names to extract
 * @returns {Object} Object containing extracted parameters
 */
const parse_params = (input, params) => {
    const obj = {};
    params.forEach((param) => {
        if (has_value(input[param])) {
            obj[param] = input[param];
        }
    });
    return obj;
};

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
const post_update_params = (req, params) => {
    const input = req.body;
    const obj = {};
    params.forEach((param) => {
        if (!is_undefined(input[param])) {
            obj[param] = input[param];
        }
    });
    return obj;
};

/**
 * Extract required parameters, returning null if any are missing.
 * @param {Object} input - Source object
 * @param {string[]} params - Required parameter names
 * @returns {Object|null} Extracted parameters or null if any missing
 */
const required_params = (input, params) => {
    const obj = {};
    let has_all = true;

    params.forEach((param) => {
        if (!has_value(input[param])) {
            has_all = false;
        } else {
            obj[param] = input[param];
        }
    });

    return has_all ? obj : null;
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
