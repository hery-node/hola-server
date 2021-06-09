const { ERROR } = require('./code');
const { LOG_SYSTEM, is_log_error, log_error } = require('../db/db');

const wrap_http = fn => (...args) => fn(...args).catch(args[2]);

const handle_exception = app => {
    app.use(function (error, req, res, next) {
        if (is_log_error()) {
            log_error(LOG_SYSTEM, error.stack);
        } else {
            throw new Error(error);
        }

        res.json({ code: ERROR, err: "errors occur in server" });
    });
}

module.exports = { wrap_http, handle_exception }
