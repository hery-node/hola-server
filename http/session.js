const express_session = require('express-session');
const MongoStore = require('connect-mongo');
const { get_settings } = require('../setting');

const init_session = (app) => {
    const server = get_settings().server;
    const mongo = get_settings().mongo;

    if (server.keep_session) {
        const session = server.session;

        app.use(express_session({
            secret: session.secret,
            resave: true,
            saveUninitialized: true,
            cookie: { maxAge: session.cookie_max_age },
            store: MongoStore.create({ mongoUrl: mongo.url })
        }));
    }
}

module.exports = { init_session };
