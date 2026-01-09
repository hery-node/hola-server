/**
 * @fileoverview Number manipulation and mathematical utility functions.
 * @module core/number
 */

const { has_value } = require('./validate');
const { is_object } = require('./obj');

/**
 * Parse string value to number, returns 0 if invalid.
 * @param {string|number} str - Value to parse.
 * @returns {number} Parsed number or 0.
 */
const parse_num = (str) => {
    const value = parseFloat(str);
    return value ? value : 0;
};

/**
 * Parse string value to number with 2 decimal places.
 * @param {string|number} str - Value to parse.
 * @returns {number} Parsed number rounded to 2 decimal places.
 */
const to_fixed2 = (str) => {
    const value = parse_num(str);
    return value ? parseFloat(value.toFixed(2)) : 0;
};

/**
 * Round number to 2 decimal places.
 * @param {number} num - Number to round.
 * @returns {number} Rounded number.
 */
const round_to_fixed2 = (num) => Math.round(num * 100) / 100;

/**
 * Generate range array. Example: range(3) = [0,1,2], range(1,5) = [1,2,3,4,5]
 * @param {number} start - Start value or length if end not provided.
 * @param {number} [end] - End value (inclusive).
 * @param {number} [step=1] - Step increment.
 * @returns {number[]} Array of numbers in the range.
 */
const range = (start, end, step = 1) => {
    if (!end) return Array.from({ length: start }, (_, key) => key);
    return [...Array(Math.floor((end - start) / step) + 1)].map((_, i) => start + i * step);
};

/**
 * Generate scale array with exponential growth. Example: scale(2,10) = [2,4,8]
 * @param {number} start - Start value.
 * @param {number} end - End value.
 * @param {number} [ratio=2] - Scale multiplier.
 * @returns {number[]} Array of scaled numbers.
 */
const scale = (start, end, ratio = 2) => {
    const length = Math.floor(Math.log(end / start) / Math.log(ratio)) + 1;
    return [...Array(length)].map((_, i) => start * Math.pow(ratio, i));
};

/**
 * Create a space object representing a min-max range.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {{min: number, max: number}} Space object.
 * @throws {Error} If min or max not provided.
 */
const space = (min, max) => {
    if (!has_value(min) || !has_value(max)) throw new Error("min and max not provided for space");
    return { min, max };
};

/**
 * Check if value is a space object (has min and max properties).
 * @param {*} value - Value to check.
 * @returns {boolean} True if value is a space object.
 */
const is_space = (value) => is_object(value) && has_value(value.min) && has_value(value.max);

/**
 * Check if value is an integer.
 * @param {*} value - Value to check.
 * @returns {boolean} True if value is an integer.
 */
const is_integer = (value) => /^-?[0-9]+$/.test(value);

/**
 * Check if object contains any space objects as property values.
 * @param {Object} obj - Object to check.
 * @returns {boolean} True if any property is a space object.
 */
const contains_space = (obj) => {
    for (const key in obj) {
        if (is_space(obj[key])) return true;
    }
    return false;
};

/**
 * Generate random number between min and max.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {number} Random number (integer if both bounds are integers).
 */
const random_number = (min, max) => {
    const random = Math.random() * (max - min) + min;
    return is_integer(min) && is_integer(max) ? Math.floor(random) : to_fixed2(random);
};

/**
 * Generate Latin Hypercube Sampling ranges for a given range.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @param {number} n - Number of samples.
 * @returns {{min: number, max: number}[]} Array of sample ranges.
 */
const lhs_samples = (min, max, n) => {
    const all_int = is_integer(min + "") && is_integer(max + "");
    const interval = (max - min) / n;
    const ranges = [];

    for (let i = 0; i < n; i++) {
        const start = i * interval + min;
        const end = (i === n - 1) ? max : start + interval;
        const min_val = Math.min(start, end);
        const max_val = Math.max(start, end);

        ranges.push(all_int
            ? { min: Math.floor(min_val), max: Math.floor(max_val) }
            : { min: to_fixed2(min_val), max: to_fixed2(max_val) }
        );
    }
    return ranges;
};

/**
 * Create random sample object from configuration with arrays or space objects.
 * @param {Object} obj - Configuration object with arrays or space values.
 * @returns {Object} Sample object with randomly selected values.
 */
const random_sample = (obj) => {
    const sample_obj = {};
    for (const key in obj) {
        const value = obj[key];
        if (Array.isArray(value)) {
            sample_obj[key] = value[Math.floor(random_number(0, value.length))];
        } else if (is_space(value)) {
            sample_obj[key] = random_number(value.min, value.max);
        } else {
            sample_obj[key] = value;
        }
    }
    return sample_obj;
};

/**
 * Extract numeric value from string containing numbers.
 * @param {string} value - String to extract number from.
 * @returns {number} Extracted number or 0 if not found.
 */
const extract_number = (value) => {
    const numbers = value.match(/([+\-0-9\\.]+)/g);
    if (!numbers) return 0;
    const values = numbers.map(Number).filter((v) => has_value(v));
    return values.length === 1 ? values[0] : 0;
};

module.exports = {
    parse_num,
    extract_number,
    to_fixed2,
    round_to_fixed2,
    range,
    scale,
    space,
    is_space,
    contains_space,
    is_integer,
    random_number,
    random_sample,
    lhs_samples
};