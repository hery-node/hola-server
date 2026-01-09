const express = require('express');

const { init_cors } = require('./cors');
const { NO_SESSION } = require('./code');
const { init_session, get_session_user_id } = require('./session');
const { init_router_dirs } = require('./router');
const { handle_exception } = require('./error');
const { get_settings } = require('../setting');
const { asyncLocalStorage, set_context_value } = require('./context');

const app = express();
let server_initialized = false;

const is_excluded_url = (server, req) => {
    const exclude_urls = server.exclude_urls;
    for (let i = 0; i < exclude_urls.length; i++) {
        const re = new RegExp(exclude_urls[i], "gim");
        if (re.test(req.originalUrl)) {
            return true;
        }
    }

    return false;
}

const init_express_server = (base_dir, port_attr, callback) => {
    if (server_initialized === true) {
        return app;
    }

    const server = get_settings().server;
    const threshold = server.threshold;

    init_cors(app);

    if (threshold) {
        app.use(express.json({ limit: threshold.body_limit, extended: true }));
        app.use(express.urlencoded({ limit: threshold.body_limit, extended: true }));
    }

    init_session(app);

    app.use((req, res, next) => {
        if (server.check_user && !is_excluded_url(server, req)) {
            const user_id = get_session_user_id(req);
            if (user_id == null) {
                res.json({ code: NO_SESSION, err: "no session found" });
            } else {
                asyncLocalStorage.run({}, () => {
                    set_context_value("req", req);
                    next();
                });
            }
        } else {
            asyncLocalStorage.run({}, () => {
                set_context_value("req", req);
                next();
            });
        }
    });

    init_router_dirs(app, base_dir);
    handle_exception(app);

    app.listen(server[port_attr], async function () {
        if (callback) {
            await callback();
        }
    });

    server_initialized = true;
    return app;
}

module.exports = { init_express_server };