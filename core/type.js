/**
 * @fileoverview Type conversion and validation system.
 * @module core/type
 */

const { has_value, is_undefined } = require('./validate');
const { encrypt_pwd } = require('./encrypt');

const type_manager = {};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create success result.
 * @param {*} value - Converted value.
 * @returns {{value: *}} Success result.
 */
const ok = (value) => ({ value });

/**
 * Create error result.
 * @param {string} type - Type name.
 * @param {*} value - Original value.
 * @returns {{err: string}} Error result.
 */
const err = (type, value) => ({ err: `invalid ${type}:${value}` });

/**
 * Check if value is an integer.
 * @param {*} value - Value to check.
 * @returns {boolean} True if integer.
 */
const is_int = (value) => parseInt(value) === parseFloat(value);

/**
 * Create a regex validation type.
 * @param {string} name - Type name.
 * @param {RegExp} pattern - Regex pattern.
 * @returns {Object} Type definition.
 */
const regex_type = (name, pattern) => ({
    name,
    convert: (value) => pattern.test(value) ? ok(value) : err(name, value)
});

/**
 * Create an integer range validation type.
 * @param {string} name - Type name.
 * @param {number[]} valid_values - Array of valid values.
 * @returns {Object} Type definition.
 */
const int_enum_type = (name, valid_values) => ({
    name,
    convert: (value) => {
        if (!is_int(value)) return err(name, value);
        const int_value = parseInt(value);
        return valid_values.includes(int_value) ? ok(int_value) : err(name, value);
    }
});

/**
 * Create an integer range validation type.
 * @param {string} name - Type name.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {Object} Type definition.
 */
const int_range_type = (name, min, max) => ({
    name,
    convert: (value) => {
        if (!is_int(value)) return err(name, value);
        const int_value = parseInt(value);
        return (int_value >= min && int_value <= max) ? ok(int_value) : err(name, value);
    }
});

/**
 * Create a passthrough string type.
 * @param {string} name - Type name.
 * @returns {Object} Type definition.
 */
const string_type = (name) => ({ name, convert: (value) => ok(value + "") });

// ============================================================================
// Type Registration
// ============================================================================

/**
 * Register a custom type with conversion function.
 * @param {Object} type - Type definition with name and convert function.
 */
const register_type = (type) => { type_manager[type.name] = type; };

/**
 * Get registered type by name.
 * @param {string} name - Type name.
 * @returns {Object} Type definition.
 * @throws {Error} If type not registered.
 */
const get_type = (name) => {
    const type = type_manager[name];
    if (!type) throw new Error(`no type registered for name [${name}]`);
    return type;
};

// ============================================================================
// Built-in Types: Basic
// ============================================================================

register_type({ name: "obj", convert: ok });
register_type({ name: "string", convert: (value) => ok(value ? (value + "").trim() : "") });
register_type({ name: "password", convert: (value) => ok(encrypt_pwd(value)) });
register_type({ name: "file", convert: ok });

// Passthrough string types
register_type(string_type("lstr"));
register_type(string_type("text"));
register_type(string_type("date"));
register_type(string_type("enum"));
register_type(string_type("log_category"));

// ============================================================================
// Built-in Types: Boolean
// ============================================================================

register_type({
    name: "boolean",
    convert: (value) => {
        if (value === true || value === "true") return ok(true);
        if (value === false || value === "false") return ok(false);
        return err("boolean", value);
    }
});

// ============================================================================
// Built-in Types: Numeric
// ============================================================================

register_type({
    name: "number",
    convert: (value) => {
        const num = Number(value);
        return isNaN(num) ? err("number", value) : ok(num);
    }
});

register_type({
    name: "int",
    convert: (value) => is_int(value) ? ok(parseInt(value)) : err("int", value)
});

register_type({
    name: "uint",
    convert: (value) => {
        const int_value = parseInt(value);
        return (is_int(value) && int_value >= 0) ? ok(int_value) : err("uint", value);
    }
});

register_type({
    name: "float",
    convert: (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? err("float", value) : ok(parseFloat(num.toFixed(2)));
    }
});

register_type({
    name: "ufloat",
    convert: (value) => {
        const num = parseFloat(value);
        return (isNaN(num) || num < 0) ? err("ufloat", value) : ok(parseFloat(num.toFixed(2)));
    }
});

register_type({
    name: "decimal",
    convert: (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? err("decimal", value) : ok(num);
    }
});

register_type({
    name: "percentage",
    convert: (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? err("percentage", value) : ok(parseFloat(num.toFixed(2)));
    }
});

register_type({
    name: "currency",
    convert: (value) => {
        const num = Number(value);
        return isNaN(num) ? err("currency", value) : ok(num);
    }
});

// ============================================================================
// Built-in Types: Date/Time
// ============================================================================

register_type({
    name: "datetime",
    convert: (value) => {
        const date = new Date(value);
        return isNaN(date.getTime()) ? err("datetime", value) : ok(date.toISOString());
    }
});

register_type(regex_type("time", /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/));

// ============================================================================
// Built-in Types: Validation
// ============================================================================

register_type({
    name: "email",
    convert: (value) => {
        const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return pattern.test(value) ? ok(value) : err("email", value);
    }
});

register_type({
    name: "url",
    convert: (value) => {
        try { new URL(value); return ok(value); }
        catch { return err("url", value); }
    }
});

register_type({
    name: "phone",
    convert: (value) => {
        const cleaned = value.replace(/[\s\-\(\)]/g, '');
        return /^\+?[1-9]\d{1,14}$/.test(cleaned) ? ok(cleaned) : err("phone", value);
    }
});

register_type(regex_type("uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
register_type(regex_type("color", /^#([0-9A-F]{3}){1,2}$/i));

register_type({
    name: "ip_address",
    convert: (value) => {
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return err("ip_address", value);
        const valid = value.split('.').every(part => parseInt(part) <= 255);
        return valid ? ok(value) : err("ip_address", value);
    }
});

// ============================================================================
// Built-in Types: Data Structures
// ============================================================================

register_type({
    name: "array",
    convert: (value) => {
        if (typeof value === "string") return ok(value.split(","));
        if (Array.isArray(value)) return ok(value);
        return err("array", value);
    }
});

register_type({
    name: "json",
    convert: (value) => {
        if (typeof value === 'object') return ok(value);
        try { return ok(JSON.parse(value)); }
        catch { return err("json", value); }
    }
});

// ============================================================================
// Built-in Types: Transformations
// ============================================================================

register_type({
    name: "slug",
    convert: (value) => ok(value.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-'))
});

// ============================================================================
// Built-in Types: Domain-Specific
// ============================================================================

register_type(int_range_type("age", 0, 200));
register_type(int_enum_type("gender", [0, 1]));
register_type(int_enum_type("log_level", [0, 1, 2, 3]));

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert a single field value.
 * @param {*} field_value - Value to convert.
 * @param {string} type_name - Type name.
 * @returns {{value?: *, err?: string}} Conversion result.
 */
const convert_field = (field_value, type_name) => {
    const type = get_type(type_name || "string");
    return type.convert(field_value);
};

/**
 * Convert object fields to their defined types.
 * @param {Object} obj - Object with values to convert.
 * @param {Array<{name: string, type?: string}>} fields - Field definitions.
 * @param {boolean} preserve_empty - Whether to preserve empty values as "".
 * @returns {{obj: Object, error_field_names: string[]}} Converted object and error fields.
 */
const convert_fields = (obj, fields, preserve_empty = false) => {
    const result = {};
    const error_field_names = [];

    for (const field of fields) {
        const field_value = obj[field.name];

        if (has_value(field_value)) {
            const { value, err } = convert_field(field_value, field.type);
            if (err) error_field_names.push(field.name);
            else result[field.name] = value;
        } else if (preserve_empty && !is_undefined(field_value)) {
            result[field.name] = "";
        }
    }

    return { obj: result, error_field_names };
};

/**
 * Convert object fields to their defined types.
 * @param {Object} obj - Object with values to convert.
 * @param {Array<{name: string, type?: string}>} fields - Field definitions.
 * @returns {{obj: Object, error_field_names: string[]}} Converted object and error fields.
 */
const convert_type = (obj, fields) => convert_fields(obj, fields, false);

/**
 * Convert object fields for update operation (preserves empty values).
 * @param {Object} obj - Object with values to convert.
 * @param {Array<{name: string, type?: string}>} fields - Field definitions.
 * @returns {{obj: Object, error_field_names: string[]}} Converted object and error fields.
 */
const convert_update_type = (obj, fields) => convert_fields(obj, fields, true);

module.exports = { register_type, convert_type, convert_update_type, get_type };
