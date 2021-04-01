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

module.exports = { parse_num, to_fixed2, round_to_fixed2 }
