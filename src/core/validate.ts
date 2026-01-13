/**
 * Validation utility functions for checking values and required fields.
 * @module core/validate
 */

/** Check if a value is undefined. */
export const is_undefined = (value: unknown): value is undefined => typeof value === 'undefined';

/** Check if a value exists and is meaningful (not null, undefined, NaN, or empty string). */
export const has_value = (value: unknown): boolean => {
    if (value == null || value !== value) return false;
    if (typeof value === 'string' && value.trim().length === 0) return false;
    return true;
};

/** Validate that required fields have values in an object. Returns array of missing field names. */
export const validate_required_fields = (obj: Record<string, unknown>, field_names: string[]): string[] => {
    return field_names.filter((field_name) => !has_value(obj[field_name]));
};
