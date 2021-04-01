const { ERROR } = require('./code');
const { format_date_time } = require('../core/date');
const { get_db } = require('../db/db');
const { get_settings } = require('../setting');

const wrap_http = fn => (...args) => fn(...args).catch(args[2]);

const handle_exception = app => {
    const db = get_db();
    const log = get_settings().log;

    app.use(async function (error, req, res, next) {
        if (log.save_db) {
            const path = req.path;
            const user = req.session ? req.session.user : '';
            const user_name = user ? user.name : '';
            const time = format_date_time(new Date());
            await db.create(log.col_log, { time: time, user: user_name, path: path, error: error.stack })
        } else {
            throw new Error(error);
        }

        res.json({ code: ERROR, err: "errors occur in server" });
    });

}

module.exports = { wrap_http, handle_exception }
