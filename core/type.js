const { has_value } = require('./validate');
const { encrypt_pwd } = require('./encrypt');
const type_manager = {};

/**
 * register your use type
 * @param {type object to do validation and type conversion} type 
 */
const register_type = type => {
    type_manager[type.name] = type;
}

/**
 * get your user type
 * @param {type name} name 
 * @returns 
 */
const get_type = name => {
    const type = type_manager[name];
    if (type) {
        return type;
    } else {
        throw new Error('no type registered for name [' + name + ']');
    }
}

const boolean_type = {
    name: "boolean",
    convert: function (value) {
        if (value === true || value === "true") {
            return { value: true };
        } else if (value === false || value === "false") {
            return { value: false };
        } else {
            return { err: 'boolean convert error for value:' + value };
        }
    }
}

register_type(boolean_type);

const is_int = (value) => {
    return parseInt(value) == parseFloat(value);
}
const int_type = {
    name: "int",
    convert: function (value) {
        return is_int(value) ? { value: parseInt(value) } : { err: 'int convert error for value:' + value };
    }
}

register_type(int_type);

const uint_type = {
    name: "uint",
    convert: function (value) {
        const int_value = parseInt(value);
        return is_int(value) && int_value >= 0 ? { value: int_value } : { err: 'int convert error for value:' + value };
    }
}

register_type(uint_type);

const float_type = {
    name: "float",
    convert: function (value) {
        const float_value = parseFloat(value);
        if (isNaN(float_value)) {
            return { err: 'float convert error for value:' + value };
        } else {
            return { value: parseFloat(float_value.toFixed(2)) };
        }
    }
}

register_type(float_type);

const ufloat_type = {
    name: "ufloat",
    convert: function (value) {
        const float_value = parseFloat(value);
        if (isNaN(float_value) || float_value < 0) {
            return { err: 'float convert error for value:' + value };
        } else {
            return { value: parseFloat(float_value.toFixed(2)) };
        }
    }
}

register_type(ufloat_type);

const number_type = {
    name: "number",
    convert: function (value) {
        const num_value = Number(value);
        if (isNaN(num_value)) {
            return { err: 'number convert error for value:' + value };
        } else {
            return { value: num_value };
        }
    }
}

register_type(number_type);

const string_type = {
    name: "string",
    convert: function (value) {
        return { value: value + "" };
    }
}

register_type(string_type);

const password_type = {
    name: "password",
    convert: function (value) {
        return { value: encrypt_pwd(value) };
    }
}

register_type(password_type);

const file_type = {
    name: "file",
    convert: function (value) {
        return { value: value };
    }
}

register_type(file_type);

const array_type = {
    name: "array",
    convert: function (value) {
        if (typeof value === "string") {
            return { value: value.split(",") }
        } else if (Array.isArray(value)) {
            return { value: value }
        } else {
            return { err: "error array type" }
        }
    }
}

register_type(array_type);

const lstr_type = {
    name: "lstr",
    convert: function (value) {
        return { value: value + "" };
    }
}

register_type(lstr_type);

const text_type = {
    name: "text",
    convert: function (value) {
        return { value: value + "" };
    }
}

register_type(text_type);

const date_type = {
    name: "date",
    convert: function (value) {
        return { value: value + "" };
    }
}

register_type(date_type);

const age_type = {
    name: "age",
    convert: function (value) {
        if (is_int(value)) {
            const int_value = parseInt(value);
            if (int_value < 0 || int_value > 200) {
                return { err: "invalid age value:" + value };
            } else {
                return { value: int_value };
            }
        } else {
            return { err: "age isn't int type:" + value };
        }
    }
}

register_type(age_type);

const gender_type = {
    name: "gender",
    convert: function (value) {
        if (is_int(value)) {
            const int_value = parseInt(value);
            if (int_value == 0 || int_value == 1) {
                return { value: int_value };
            } else {
                return { err: "invalid gender value:" + value }
            }
        } else {
            return { err: "gender isn't int type:" + value };
        }
    }
}

register_type(gender_type);

const convert_type = function (obj, fields) {
    const result = {};
    const error_field_names = [];

    fields.forEach(function (field) {
        const field_value = obj[field.name];
        if (has_value(field_value)) {
            const type_name = field.type ? field.type : "string";
            const type = get_type(type_name);
            const { value, err } = type.convert(field_value);
            if (err) {
                error_field_names.push(field.name);
            } else {
                result[field.name] = value;
            }
        }
    });
    return { obj: result, error_field_names: error_field_names };
}

module.exports = { register_type, convert_type, get_type }
