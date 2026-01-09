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
 * Pop n elements from end of array.
 * @param {Array} array - Source array to pop from.
 * @param {number} n - Number of elements to pop.
 * @returns {Array|undefined} Array of popped elements or undefined if empty.
 */
const pop_n = (array, n) => {
    const subarray = [];
    while (subarray.length < n) {
        const ele = array.pop();
        if (ele) subarray.push(ele);
        else break;
    }
    return subarray.length > 0 ? subarray : undefined;
};

/**
 * Shift n elements from beginning of array.
 * @param {Array} array - Source array to shift from.
 * @param {number} n - Number of elements to shift.
 * @returns {Array|undefined} Array of shifted elements or undefined if empty.
 */
const shift_n = (array, n) => {
    const subarray = [];
    while (subarray.length < n) {
        const ele = array.shift();
        if (ele) subarray.push(ele);
        else break;
    }
    return subarray.length > 0 ? subarray : undefined;
};

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
    const obj = {};
    arr.forEach((element) => { obj[element[key_attr]] = element[value_attr]; });
    return obj;
};

/**
 * Sort array of objects by attribute in descending order.
 * @param {Object[]} arr - Array to sort.
 * @param {string} attr - Attribute name to sort by.
 * @returns {Object[]} Sorted array.
 */
const sort_desc = (arr, attr) => {
    arr.sort((a, b) => b[attr] - a[attr]);
    return arr;
};

/**
 * Sort array of objects by attribute in ascending order.
 * @param {Object[]} arr - Array to sort.
 * @param {string} attr - Attribute name to sort by.
 * @returns {Object[]} Sorted array.
 */
const sort_asc = (arr, attr) => {
    arr.sort((a, b) => a[attr] - b[attr]);
    return arr;
};

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
const combine = (arr1, arr2) => {
    const result = [];
    for (const obj1 of arr1) {
        for (const obj2 of arr2) {
            result.push({ ...obj1, ...obj2 });
        }
    }
    return result;
};

/**
 * Remove duplicate elements from array.
 * @param {Array} array - Array to deduplicate.
 * @returns {Array} Array with unique elements.
 */
const unique = (array) => {
    return array.filter((value, index) => {
        const value_str = JSON.stringify(value);
        return index === array.findIndex((obj) => JSON.stringify(obj) === value_str);
    });
};

module.exports = { shuffle, remove_element, pop_n, shift_n, sum, avg, combine, sort_desc, sort_asc, sort_by_key_seq, unique, map_array_to_obj };