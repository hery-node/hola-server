const { has_value } = require('../core/validate');

const parse_params = function (input, params) {
    const obj = {};
    params.forEach(function (param) {
        if (has_value(input[param])) {
            obj[param] = input[param];
        }
    });
    return obj;
};

const get_params = function (req, params) {
    return parse_params(req.query, params);
};

const post_params = function (req, params) {
    return parse_params(req.body, params);
};

const required_params = function (input, params) {
    const obj = {};
    let passed = true;
    params.forEach(function (param) {
        if (!has_value(input[param])) {
            passed = false;
        } else {
            obj[param] = input[param];
        }
    });
    if (passed === false) {
        return null;
    } else {
        return obj;
    }
};

const required_get_params = function (req, params) {
    return required_params(req.query, params);
};

const required_post_params = function (req, params) {
    return required_params(req.body, params);
};

module.exports = { get_params, post_params, required_get_params, required_post_params, required_params }
