/**
 * @fileoverview Array manipulation utility functions.
 * @module core/array
 */

const { round_to_fixed2 } = require('./number');

/**
 * Shuffle array elements randomly in place.
 * @param {Array} arr - Array to shuffle.
 */
const shuffle = (arr) => {
    for (let i = arr.length; i; i--) {
        const j = Math.floor(Math.random() * i);
        [arr[i - 1], arr[j]] = [arr[j], arr[i - 1]];
    }
};

/**
 * Remove elements from array by matching field value.
 * @param {Object[]} array - Array of objects to modify.
 * @param {string} field - Field name to match.
 * @param {*} value - Value to match for removal.
 */
const remove_element = (array, field, value) => {
    for (let i = array.length - 1; i >= 0; --i) {
        if (array[i][field] == value) array.splice(i, 1);
    }
};

/**
 * Extract n elements from array using specified method.
 * @param {Array} array - Source array.
 * @param {number} n - Number of elements to extract.
 * @param {string} method - 'pop' or 'shift'.
 * @returns {Array|undefined} Array of extracted elements or undefined if empty.
 */
const extract_n = (array, n, method) => {
    const result = [];
    while (result.length < n) {
        const ele = array[method]();
        if (ele) result.push(ele);
        else break;
    }
    return result.length > 0 ? result : undefined;
};

const pop_n = (array, n) => extract_n(array, n, 'pop');
const shift_n = (array, n) => extract_n(array, n, 'shift');

/**
 * Calculate sum of number array.
 * @param {number[]} arr - Array of numbers.
 * @returns {number} Sum rounded to 2 decimal places.
 */
const sum = (arr) => round_to_fixed2(arr.reduce((pre, cur) => pre + cur, 0));

/**
 * Calculate average of number array.
 * @param {number[]} arr - Array of numbers.
 * @returns {number} Average rounded to 2 decimal places.
 */
const avg = (arr) => arr.length === 0 ? 0 : round_to_fixed2(sum(arr) / arr.length);

/**
 * Convert array of objects to key-value object.
 * @param {Object[]} arr - Array of objects.
 * @param {string} key_attr - Attribute to use as key.
 * @param {string} value_attr - Attribute to use as value.
 * @returns {Object} Mapped object.
 */
const map_array_to_obj = (arr, key_attr, value_attr) => {
    return arr.reduce((obj, el) => ({ ...obj, [el[key_attr]]: el[value_attr] }), {});
};

/**
 * Sort array of objects by attribute.
 * @param {Object[]} arr - Array to sort.
 * @param {string} attr - Attribute name to sort by.
 * @param {boolean} [desc=false] - Sort descending if true.
 * @returns {Object[]} Sorted array.
 */
const sort_by_attr = (arr, attr, desc = false) => {
    arr.sort((a, b) => desc ? b[attr] - a[attr] : a[attr] - b[attr]);
    return arr;
};

const sort_desc = (arr, attr) => sort_by_attr(arr, attr, true);
const sort_asc = (arr, attr) => sort_by_attr(arr, attr, false);

/**
 * Sort array by predefined key sequence.
 * @param {Object[]} arr - Array to sort.
 * @param {string} attr - Attribute name to sort by.
 * @param {Array} keys - Ordered array of key values.
 * @returns {Object[]} Sorted array.
 */
const sort_by_key_seq = (arr, attr, keys) => {
    arr.sort((a, b) => keys.indexOf(a[attr]) - keys.indexOf(b[attr]));
    return arr;
};

/**
 * Create cartesian product of two object arrays.
 * @param {Object[]} arr1 - First array.
 * @param {Object[]} arr2 - Second array.
 * @returns {Object[]} Combined array with length arr1.length * arr2.length.
 */
const combine = (arr1, arr2) => arr1.flatMap(obj1 => arr2.map(obj2 => ({ ...obj1, ...obj2 })));

/**
 * Remove duplicate elements from array.
 * @param {Array} array - Array to deduplicate.
 * @returns {Array} Array with unique elements.
 */
const unique = (array) => {
    const seen = new Map();
    return array.filter(value => {
        const key = JSON.stringify(value);
        return seen.has(key) ? false : (seen.set(key, true), true);
    });
};

module.exports = { shuffle, remove_element, pop_n, shift_n, sum, avg, combine, sort_desc, sort_asc, sort_by_key_seq, unique, map_array_to_obj };