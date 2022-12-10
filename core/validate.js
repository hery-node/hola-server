const is_undefined = function (value) {
    return typeof value === 'undefined';
}

const has_value = function (value) {
    //In short, JavaScript NaN values are the only ones that are not equal to themselves
    //value!==value is to check is NaN
    if (value === undefined || value === null || value !== value) {
        return false
    }
    if (typeof value == 'undefined') {
        return false;
    }
    if (typeof value === 'string' && value.trim().length === 0) {
        return false;
    }
    return true;
};

const validate_required_fields = function (obj, field_names) {
    const error_field_names = [];
    field_names.forEach(function (field_name) {
        const value = obj[field_name];
        if (!has_value(value)) {
            error_field_names.push(field_name);
        }
    });

    return error_field_names;
};

module.exports = { is_undefined, has_value, validate_required_fields }