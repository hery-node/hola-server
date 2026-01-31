/**
 * Array manipulation utility functions.
 * @module core/array
 */

import { round_to_fixed2 } from './number.js';

/** Shuffle array elements randomly in place. */
export const shuffle = <T>(arr: T[]): void => {
    for (let i = arr.length; i; i--) {
        const j = Math.floor(Math.random() * i);
        [arr[i - 1], arr[j]] = [arr[j], arr[i - 1]];
    }
};

/** Remove elements from array by matching field value. */
export const remove_element = <T, K extends keyof T>(array: T[], field: K, value: T[K]): void => {
    for (let i = array.length - 1; i >= 0; --i) {
        if (array[i][field] == value) array.splice(i, 1);
    }
};

/** Extract n elements from array using specified method. */
const extract_n = <T>(array: T[], n: number, method: 'pop' | 'shift'): T[] | undefined => {
    const result: T[] = [];
    while (result.length < n) {
        const ele = array[method]();
        if (ele !== undefined) result.push(ele);
        else break;
    }
    return result.length > 0 ? result : undefined;
};

export const pop_n = <T>(array: T[], n: number): T[] | undefined => extract_n(array, n, 'pop');
export const shift_n = <T>(array: T[], n: number): T[] | undefined => extract_n(array, n, 'shift');

/** Calculate sum of number array. */
export const sum = (arr: number[]): number => round_to_fixed2(arr.reduce((pre, cur) => pre + cur, 0));

/** Calculate average of number array. */
export const avg = (arr: number[]): number => arr.length === 0 ? 0 : round_to_fixed2(sum(arr) / arr.length);

/** Convert array of objects to key-value object. */
export const map_array_to_obj = <T, K extends keyof T, V extends keyof T>(arr: T[], key_attr: K, value_attr: V): Record<string, T[V]> => {
    return arr.reduce((obj, el) => ({ ...obj, [String(el[key_attr])]: el[value_attr] }), {} as Record<string, T[V]>);
};

/** Sort array of objects by attribute. */
export const sort_by_attr = <T extends Record<string, number>>(arr: T[], attr: keyof T, desc: boolean = false): T[] => {
    arr.sort((a, b) => desc ? b[attr] - a[attr] : a[attr] - b[attr]);
    return arr;
};

export const sort_desc = <T extends Record<string, number>>(arr: T[], attr: keyof T): T[] => sort_by_attr(arr, attr, true);
export const sort_asc = <T extends Record<string, number>>(arr: T[], attr: keyof T): T[] => sort_by_attr(arr, attr, false);

/** Sort array by predefined key sequence. */
export const sort_by_key_seq = <T, K extends keyof T>(arr: T[], attr: K, keys: T[K][]): T[] => {
    arr.sort((a, b) => keys.indexOf(a[attr]) - keys.indexOf(b[attr]));
    return arr;
};

/** Create cartesian product of two object arrays. */
export const combine = <T extends object, U extends object>(arr1: T[], arr2: U[]): (T & U)[] => {
    return arr1.flatMap(obj1 => arr2.map(obj2 => ({ ...obj1, ...obj2 })));
};

/** Remove duplicate elements from array. */
export const unique = <T>(array: T[]): T[] => {
    const seen = new Map<string, boolean>();
    return array.filter(value => {
        const key = JSON.stringify(value);
        return seen.has(key) ? false : (seen.set(key, true), true);
    });
};
