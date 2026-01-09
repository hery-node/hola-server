/**
 * @fileoverview Type conversion and validation system.
 * @module core/type
 */

const { has_value, is_undefined } = require('./validate');
const { encrypt_pwd } = require('./encrypt');

const type_manager = {};

/**
 * Register a custom type with conversion function.
 * @param {Object} type - Type definition with name and convert function.
 */
const register_type = (type) => { type_manager[type.name] = type; };

/**
 * Convert value to number.
 * @param {*} value - Value to convert.
 * @param {string} type - Type name for error message.
 * @returns {{value?: number, err?: string}} Conversion result.
 */
const convert_number = (value, type) => {
    const num_value = Number(value);
    return isNaN(num_value) ? { err: `convert error for value:${value},type:${type}` } : { value: num_value };
};

/**
 * Convert value to float with 2 decimal places.
 * @param {*} value - Value to convert.
 * @param {string} type - Type name for error message.
 * @returns {{value?: number, err?: string}} Conversion result.
 */
const convert_float = (value, type) => {
    const float_value = parseFloat(value);
    return isNaN(float_value) ? { err: `convert error for value:${value},type:${type}` } : { value: parseFloat(float_value.toFixed(2)) };
};

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

/**
 * Check if value is an integer.
 * @param {*} value - Value to check.
 * @returns {boolean} True if integer.
 */
const is_int = (value) => parseInt(value) === parseFloat(value);

// Register built-in types
register_type({ name: "obj", convert: (value) => value });

register_type({
    name: "boolean",
    convert: (value) => {
        if (value === true || value === "true") return { value: true };
        if (value === false || value === "false") return { value: false };
        return { err: `boolean convert error for value:${value}` };
    }
});

register_type({
    name: "int",
    convert: (value) => is_int(value) ? { value: parseInt(value) } : { err: `int convert error for value:${value}` }
});

register_type({
    name: "uint",
    convert: (value) => {
        const int_value = parseInt(value);
        return is_int(value) && int_value >= 0 ? { value: int_value } : { err: `uint convert error for value:${value}` };
    }
});

register_type({ name: "float", convert: (value) => convert_float(value, "float") });

register_type({
    name: "ufloat",
    convert: (value) => {
        const float_value = parseFloat(value);
        return isNaN(float_value) || float_value < 0 ? { err: `ufloat convert error for value:${value}` } : { value: parseFloat(float_value.toFixed(2)) };
    }
});

register_type({ name: "number", convert: (value) => convert_number(value, "number") });
register_type({ name: "string", convert: (value) => ({ value: value ? (value + "").trim() : "" }) });
register_type({ name: "password", convert: (value) => ({ value: encrypt_pwd(value) }) });
register_type({ name: "file", convert: (value) => ({ value }) });

register_type({
    name: "array",
    convert: (value) => {
        if (typeof value === "string") return { value: value.split(",") };
        if (Array.isArray(value)) return { value };
        return { err: "error array type" };
    }
});

register_type({ name: "lstr", convert: (value) => ({ value: value + "" }) });
register_type({ name: "text", convert: (value) => ({ value: value + "" }) });
register_type({ name: "date", convert: (value) => ({ value: value + "" }) });

register_type({
    name: "age",
    convert: (value) => {
        if (!is_int(value)) return { err: `age isn't int type:${value}` };
        const int_value = parseInt(value);
        return (int_value < 0 || int_value > 200) ? { err: `invalid age value:${value}` } : { value: int_value };
    }
});

register_type({
    name: "gender",
    convert: (value) => {
        if (!is_int(value)) return { err: `gender isn't int type:${value}` };
        const int_value = parseInt(value);
        return (int_value === 0 || int_value === 1) ? { value: int_value } : { err: `invalid gender value:${value}` };
    }
});

register_type({
    name: "log_level",
    convert: (value) => {
        if (!is_int(value)) return { err: `log level isn't int type:${value}` };
        const int_value = parseInt(value);
        return [0, 1, 2, 3].includes(int_value) ? { value: int_value } : { err: `invalid level value:${value}` };
    }
});

register_type({ name: "log_category", convert: (value) => ({ value: value + "" }) });
register_type({ name: "percentage", convert: (value) => convert_float(value, "percentage") });
register_type({ name: "currency", convert: (value) => convert_number(value, "currency") });

register_type({
    name: "email",
    convert: (value) => {
        const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return pattern.test(value) ? { value } : { err: `invalid email:${value}` };
    }
});

/**
 * Convert object fields to their defined types.
 * @param {Object} obj - Object with values to convert.
 * @param {Array<{name: string, type?: string}>} fields - Field definitions.
 * @returns {{obj: Object, error_field_names: string[]}} Converted object and error fields.
 */
const convert_type = (obj, fields) => {
    const result = {};
    const error_field_names = [];

    fields.forEach((field) => {
        const field_value = obj[field.name];
        if (!has_value(field_value)) return;

        const type_name = field.type || "string";
        const type = get_type(type_name);
        const { value, err } = type.convert(field_value);

        if (err) error_field_names.push(field.name);
        else result[field.name] = value;
    });

    return { obj: result, error_field_names };
};

/**
 * Convert object fields for update operation (preserves empty values).
 * @param {Object} obj - Object with values to convert.
 * @param {Array<{name: string, type?: string}>} fields - Field definitions.
 * @returns {{obj: Object, error_field_names: string[]}} Converted object and error fields.
 */
const convert_update_type = (obj, fields) => {
    const result = {};
    const error_field_names = [];

    fields.forEach((field) => {
        const field_value = obj[field.name];
        if (has_value(field_value)) {
            const type_name = field.type || "string";
            const type = get_type(type_name);
            const { value, err } = type.convert(field_value);

            if (err) error_field_names.push(field.name);
            else result[field.name] = value;
        } else if (!is_undefined(field_value)) {
            result[field.name] = "";
        }
    });

    return { obj: result, error_field_names };
};

module.exports = { register_type, convert_type, convert_update_type, get_type };
