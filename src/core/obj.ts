/**
 * Object manipulation utility functions.
 * @module core/obj
 */

/** Create a new object by copying specified attributes from source object. */
export const copy_obj = <T extends Record<string, unknown>>(obj: T, attrs: (keyof T)[]): Partial<T> => {
    const copied: Partial<T> = {};
    attrs.forEach((attr) => { copied[attr] = obj[attr]; });
    return copied;
};

/** Check if a value is a plain object (not null, not array). */
export const is_object = (obj: unknown): obj is Record<string, unknown> => {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
};
