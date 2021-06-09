const http_context = require('express-http-context');

const set_context_value = (key, obj) => {
    http_context.set(key, obj);
}

const get_context_value = (key) => {
    return http_context.get(key);
}

module.exports = { set_context_value, get_context_value }
