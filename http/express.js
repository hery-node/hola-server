const express = require('express');

const { init_cors } = require('./cors');
const { init_session } = require('./session');
const { init_router_dirs } = require('./router');
const { handle_exception } = require('./error');
const { get_settings } = require('../setting');
const { asyncLocalStorage, set_context_value } = require('./context');

const app = express();
let server_initialized = false;

const init_express_server = (base_dir, callback) => {
    if (server_initialized === true) {
        return app;
    }

    const server = get_settings().server;
    const threshold = server.threshold;

    init_cors(app);
    app.use(express.json({ limit: threshold.body_limit, extended: true }));
    app.use(express.urlencoded({ limit: threshold.body_limit, extended: true }));

    app.use((req, res, next) => {
        asyncLocalStorage.run({}, () => {
            set_context_value("req", req);
            next();
        });
    });

    init_session(app);
    init_router_dirs(app, base_dir);
    handle_exception(app);

    app.listen(server.service_port, async function () {
        if (callback) {
            await callback();
        }
    });

    server_initialized = true;
    return app;
}

module.exports = { init_express_server };
