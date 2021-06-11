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

const get_session_userid = (req) => {
    const user = req && req.session ? req.session.user : null;
    return user ? user.id : null;
}

module.exports = { init_session, get_session_userid };
