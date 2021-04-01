const { round_to_fixed2 } = require('./number');

/**
 * Shuffle the array randomly
 * 
 * @param {array to be shuffle} a 
 */
const shuffle = (a) => {
    let j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}

/**
 * Remove the object from array based on the attribute value of the object
 * @param {array of object} array 
 * @param {the attribute name of the object} field 
 * @param {the attribute value} value 
 */
const remove_element = (array, field, value) => {
    for (let i = array.length - 1; i >= 0; --i) {
        if (array[i][field] == value) {
            array.splice(i, 1);
        }
    }
}

/**
 * Pop n elements from the array
 * @param {array of elements} array 
 * @param {n number of object to pop} n 
 * @returns 
 */
const pop_n = (array, n) => {
    const subarray = [];
    while (subarray.length < n) {
        const ele = array.pop();
        if (ele) {
            subarray.push(ele);
        } else {
            break;
        }
    }
    if (subarray.length > 0) {
        return subarray;
    } else {
        return undefined;
    }
}

/**
 * Shift n elements from the array
 * @param {array of elements} array 
 * @param {n number of object to pop} n 
 * @returns 
 */
const shift_n = (array, n) => {
    const subarray = [];
    while (subarray.length < n) {
        const ele = array.shift();
        if (ele) {
            subarray.push(ele);
        } else {
            break;
        }
    }
    if (subarray.length > 0) {
        return subarray;
    } else {
        return undefined;
    }
}

/**
 * Calculate the sum value of the array of the number
 * @param {array of number} arr 
 * @returns 
 */
const sum = function (arr) {
    return round_to_fixed2(arr.reduce((pre, cur) => pre + cur));
};

/**
 * Calculate the average value of the array of number
 * @param {array of number} arr 
 * @returns 
 */
const avg = function (arr) {
    if (arr.length === 0) {
        return 0;
    } else {
        return round_to_fixed2(sum(arr) / arr.length);
    }
};

/**
 * Remove duplicate element and keep it unique
 * @param {array of elements} arr 
 * @returns 
 */
const unique = function (arr) {
    return arr.filter(function (elem, pos) {
        return arr.indexOf(elem) == pos;
    });
}

/**
 * 
 * @param {array of object} arr 
 * @param {key attr of element as key} key_attr 
 * @param {value attr of element as value} value_attr 
 * @returns 
 */
const map_array_to_obj = function (arr, key_attr, value_attr) {
    const obj = {};
    arr.forEach(element => {
        obj[element[key_attr]] = element[value_attr];
    });
    return obj;
}

/**
 * Sort array of element based on the attr value in desc order
 * @param {array to be sort} arr 
 * @param {attribute used to do sorting} attr 
 * @returns 
 */
const sort_desc = function (arr, attr) {
    arr.sort((a, b) => {
        return b[attr] - a[attr];
    });
    return arr;
};

/**
 * Sort array of element based on the attr value in asc order
 * @param {array to be sort} arr 
 * @param {attribute used to do sorting} attr 
 * @returns 
 */
const sort_asc = function (arr, attr) {
    arr.sort((a, b) => {
        return a[attr] - b[attr];
    });
    return arr;
};

/**
 * Use the keys sequence to sort the array
 * @param {array of object} arr 
 * @param {the attr used to do sorting } attr 
 * @param {the key values} keys 
 * @returns 
 */
const sort_by_key_seq = function (arr, attr, keys) {
    arr.sort((a, b) => {
        return keys.indexOf(a[attr]) - keys.indexOf(b[attr]);
    });
    return arr;
};

module.exports = { shuffle, remove_element, pop_n, shift_n, sum, avg, sort_desc, sort_asc, sort_by_key_seq, unique, map_array_to_obj }
