/**
 * Number manipulation and mathematical utility functions.
 * @module core/number
 */

import { has_value } from './validate.js';
import { is_object } from './obj.js';

export interface Space {
    min: number;
    max: number;
}

/** Parse string value to number, returns 0 if invalid. */
export const parse_num = (str: string | number): number => {
    const value = parseFloat(String(str));
    return value ? value : 0;
};

/** Parse string value to number with 2 decimal places. */
export const to_fixed2 = (str: string | number): number => {
    const value = parse_num(str);
    return value ? parseFloat(value.toFixed(2)) : 0;
};

/** Round number to 2 decimal places. */
export const round_to_fixed2 = (num: number): number => Math.round(num * 100) / 100;

/** Generate range array. Example: range(3) = [0,1,2], range(1,5) = [1,2,3,4,5] */
export const range = (start: number, end?: number, step: number = 1): number[] => {
    if (end === undefined) return Array.from({ length: start }, (_, key) => key);
    return [...Array(Math.floor((end - start) / step) + 1)].map((_, i) => start + i * step);
};

/** Generate scale array with exponential growth. Example: scale(2,10) = [2,4,8] */
export const scale = (start: number, end: number, ratio: number = 2): number[] => {
    const length = Math.floor(Math.log(end / start) / Math.log(ratio)) + 1;
    return [...Array(length)].map((_, i) => start * Math.pow(ratio, i));
};

/** Create a space object representing a min-max range. */
export const space = (min: number, max: number): Space => {
    if (!has_value(min) || !has_value(max)) throw new Error("min and max not provided for space");
    return { min, max };
};

/** Check if value is a space object (has min and max properties). */
export const is_space = (value: unknown): value is Space => {
    if (!is_object(value)) return false;
    const obj = value as Record<string, unknown>;
    return has_value(obj.min) && has_value(obj.max);
};

/** Check if value is an integer. */
export const is_integer = (value: unknown): boolean => /^-?[0-9]+$/.test(String(value));

/** Check if object contains any space objects as property values. */
export const contains_space = (obj: Record<string, unknown>): boolean => {
    for (const key in obj) {
        if (is_space(obj[key])) return true;
    }
    return false;
};

/** Generate random number between min and max. */
export const random_number = (min: number, max: number): number => {
    const random = Math.random() * (max - min) + min;
    return is_integer(min) && is_integer(max) ? Math.floor(random) : to_fixed2(random);
};

/** Generate Latin Hypercube Sampling ranges for a given range. */
export const lhs_samples = (min: number, max: number, n: number): Space[] => {
    const all_int = is_integer(min) && is_integer(max);
    const interval = (max - min) / n;
    const ranges: Space[] = [];

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

/** Create random sample object from configuration with arrays or space objects. */
export const random_sample = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sample_obj: Record<string, unknown> = {};
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

/** Extract numeric value from string containing numbers. */
export const extract_number = (value: string): number => {
    const numbers = value.match(/([+\-0-9\\.]+)/g);
    if (!numbers) return 0;
    const values = numbers.map(Number).filter((v) => has_value(v));
    return values.length === 1 ? values[0] : 0;
};
