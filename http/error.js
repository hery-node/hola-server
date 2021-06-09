const http_context = require('express-http-context');

const { ERROR } = require('./code');
const { format_date_time } = require('../core/date');
const { get_db } = require('../db/db');
const { get_settings } = require('../setting');
const { save_db, log_level, col_log } = get_settings().log;

const wrap_http = fn => (...args) => fn(...args).catch(args[2]);

const LOG_LEVEL_DEBUG = 0;
const LOG_LEVEL_INFO = 1;
const LOG_LEVEL_WARN = 2;
const LOG_LEVEL_ERROR = 3;

const LOG_DB = "database";
const LOG_ENTITY = "entity";
const LOG_SYSTEM = "system";

const log_msg = (category, level, msg) => {
    const time = format_date_time(new Date());
    const db = get_db();

    const req = http_context.get("req");
    const path = req ? req.path : '';
    const user = req && req.session && req.session.user ? req.session.user.id : '';

    db.create(col_log, { time: time, category: category, level: level, msg: msg, user: user, path: path }).then(() => { });
}

const is_log_debug = () => {
    return save_db && log_level >= LOG_LEVEL_DEBUG;
}

const is_log_info = () => {
    return save_db && log_level >= LOG_LEVEL_INFO;
}

const is_log_warn = () => {
    return save_db && log_level >= LOG_LEVEL_WARN;
}

const is_log_error = () => {
    return save_db && log_level >= LOG_LEVEL_ERROR;
}

const log_debug = (category, msg) => {
    if (is_log_debug()) {
        log_msg(category, msg, LOG_LEVEL_DEBUG);
    }
}

const log_info = (category, msg) => {
    if (is_log_info()) {
        log_msg(category, msg, LOG_LEVEL_INFO);
    }
}

const log_warn = (category, msg) => {
    if (is_log_warn()) {
        log_msg(category, msg, LOG_LEVEL_WARN);
    }
}

const log_error = (category, msg) => {
    if (is_log_error()) {
        log_msg(category, msg, LOG_LEVEL_ERROR);
    }
}

const handle_exception = app => {
    app.use(function (error, req, res, next) {
        if (save_db) {
            log_error(error.stack, LOG_SYSTEM);
        } else {
            throw new Error(error);
        }

        res.json({ code: ERROR, err: "errors occur in server" });
    });
}

module.exports = { wrap_http, handle_exception, log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info, is_log_warn, is_log_error, LOG_DB, LOG_SYSTEM, LOG_ENTITY }
