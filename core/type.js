const { has_value, is_undefined } = require('./validate');
const { encrypt_pwd } = require('./encrypt');
const type_manager = {};

/**
 * register your use type
 * @param {type object to do validation and type conversion} type 
 */
const register_type = type => {
    type_manager[type.name] = type;
}

const convert_number = (value, type) => {
    const num_value = Number(value);
    if (isNaN(num_value)) {
        return { err: 'convert error for value:' + value + ",and type:" + type };
    } else {
        return { value: num_value };
    }
}

const convert_float = (value, type) => {
    const float_value = parseFloat(value);
    if (isNaN(float_value)) {
        return { err: 'convert error for value:' + value + ",and type:" + type };
    } else {
        return { value: parseFloat(float_value.toFixed(2)) };
    }
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

const obj_type = {
    name: "obj",
    convert: function (value) {
        return value;
    }
}

register_type(obj_type);

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
        return convert_float(value, "float");
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
        return convert_number(value, "number");
    }
}

register_type(number_type);

const string_type = {
    name: "string",
    convert: function (value) {
        return { value: value ? (value + "").trim() : "" };
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

const log_level_type = {
    name: "log_level",
    convert: function (value) {
        if (is_int(value)) {
            const int_value = parseInt(value);
            if (int_value == 0 || int_value == 1 || int_value == 2 || int_value == 3) {
                return { value: int_value };
            } else {
                return { err: "invalid level value:" + value }
            }
        } else {
            return { err: "log level isn't int type:" + value };
        }
    }
}

register_type(log_level_type);

const log_category_type = {
    name: "log_category",
    convert: function (value) {
        return { value: value + "" };
    }
}

register_type(log_category_type);

const percentage_type = {
    name: "percentage",
    convert: function (value) {
        return convert_float(value, "percentage");
    }
}

register_type(percentage_type);

const currency_type = {
    name: "currency",
    convert: function (value) {
        return convert_number(value, "currency");
    }
}

register_type(currency_type);

const email_type = {
    name: "email",
    convert: function (value) {
        const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        if (pattern.test(value)) {
            return { value: value };
        } else {
            return { err: 'err email for value:' + value };
        }
    }
}

register_type(email_type);

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

const convert_update_type = function (obj, fields) {
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
        } else if (!is_undefined(field_value)) {
            result[field.name] = "";
        }
    });
    return { obj: result, error_field_names: error_field_names };
}

module.exports = { register_type, convert_type, convert_update_type, get_type }
