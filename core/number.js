const { has_value } = require('./validate');
const { is_object } = require('./obj');

/**
 * Parse String value to number
 * @param {String value to parse to number} str 
 * @returns 
 */
const parse_num = function (str) {
    const value = parseFloat(str);
    return value ? value : 0;
};

/**
 * Parse String value to fixed2 number
 * @param {String value to parse to number} str 
 * @returns 
 */
const to_fixed2 = function (str) {
    const value = parse_num(str);
    return value ? parseFloat(value.toFixed(2)) : 0;
};

/**
 * Round the number to fixed 2
 * @param {number to be rounded to fixed2} num 
 * @returns 
 */
const round_to_fixed2 = function (num) {
    return Math.round(num * 100) / 100;
};

/**
 * Generate range array, for example: range(3) = [0,1,2]
 * @param {start index} start 
 * @param {end index} end 
 * @param {stepping} step 
 * @returns 
 */
const range = (start, end, step = 1) => end ? [...Array(Math.floor((end - start) / step) + 1)].map((_, i) => start + i * step) : Array.from({ length: start }, (_, key) => key);

/**
 * Generate scale array, for example: scale(2,10) = [2,4,8]
 * @param {start index} start 
 * @param {end index} end 
 * @param {scale ratio} scale 
 * @returns 
 */
const scale = (start, end, scale = 2) => [...Array(Math.floor(Math.log(end / start) / Math.log(scale)) + 1)].map((_, i) => start * Math.pow(scale, i));

/**
 * Create a space 
 * @param {min value} min 
 * @param {max value} max 
 * @returns 
 */
const space = (min, max) => {
    if (has_value(min) && has_value(max)) {
        return { ["min"]: min, ["max"]: max };
    }

    throw new Error("min and max not provide for space");
}

/**
 * Check this value is space object
 * @param {value to be checked} value 
 * @returns true if it is space otherwise return false
 */
const is_space = (value) => {
    return is_object(value) && has_value(value.min) && has_value(value.max);
}

/**
 * check the object is integer or not
 * @param {string need to check} str 
 * @returns 
 */
const is_integer = (value) => {
    const regex_pattern = /^-?[0-9]+$/;
    return regex_pattern.test(value);
}

/**
 * Check the object attr contains space object or not
 * @param {object need to check} obj 
 * @returns true if contains space
 */
const contains_space = (obj) => {
    for (const key in obj) {
        const value = obj[key];
        if (is_space(value)) {
            return true;
        }
    }
    return false;
}

/**
 * Generate the random number
 * @param {min value} min 
 * @param {max value} max 
 * @returns 
 */
const random_number = (min, max) => {
    const random = Math.random() * (max - min) + min;
    return is_integer(min) && is_integer(max) ? Math.floor(random) : to_fixed(random);
}

/**
 * Use LHS method to generate sample ranges
 * @param {min value} min 
 * @param {max value} max 
 * @param {sample number} n 
 * @returns 
 */
const lhs_samples = (min, max, n) => {
    const all_int = is_integer(min + "") && is_integer(max + "");
    const interval = (max - min) / n;
    const ranges = [];
    for (let i = 0; i < n; i++) {
        const start = i * interval + min;
        let end = start + interval;
        if (i == n - 1) {
            end = max;
        }

        const min_value = start < end ? start : end;
        const max_value = start > end ? start : end;

        let obj = {};
        if (all_int) {
            obj = { min: Math.floor(min_value), max: Math.floor(max_value) };
        } else {
            obj = { min: to_fixed2(min_value), max: to_fixed2(max_value) };
        }
        ranges.push(obj);
    }
    return ranges;
}

/**
 * Create an random sample object
 * @param {object } sample configuration 
 * @returns a sample object
 */
const random_sample = (obj) => {
    const sample_obj = {};
    for (const key in obj) {
        const value = obj[key];
        if (Array.isArray(value)) {
            const random = Math.floor(random_number(0, value.length));
            sample_obj[key] = value[random];
        } else if (is_space(value)) {
            const random = random_number(value.min, value.max);
            sample_obj[key] = random;
        } else {
            sample_obj[key] = value;
        }
    }
    return sample_obj;
}

/**
 * Extract number from string
 * @param {contain number value} value 
 * @returns 
 */
const extract_number = (value) => {
    const number = value.match(/[+\-0-9\\.]+/g);
    if (!number) {
        return 0;
    }

    const values = number.map(Number);
    return values.length == 1 ? values[0] : 0;
}

module.exports = { parse_num, extract_number, to_fixed2, round_to_fixed2, range, scale, space, is_space, contains_space, is_integer, random_number, random_sample, lhs_samples }