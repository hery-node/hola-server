const express_session = require('express-session');
const MongoStore = require('connect-mongo');
const { get_settings } = require('../setting');
const { is_root_user } = require('../core/role');

const init_session = (app) => {
    const server = get_settings().server;
    const mongo = get_settings().mongo;

    if (server.keep_session && mongo) {
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

const get_session_user_groups = (req) => {
    const group = req && req.session ? req.session.group : null;
    return group && Array.isArray(group) ? group : null;
}

const is_owner = async (req, meta, entity, query) => {
    if (is_root_user(req)) {
        return true;
    }

    if (meta.user_field) {
        const user_id = get_session_userid(req);
        if (user_id == null) {
            throw new Error("no user id is found in session");
        }
        const user_query = {};
        user_query[meta.user_field] = user_id;
        return await entity.count({ ...query, ...user_query }) == 1;
    }
    return true;
}

module.exports = { init_session, get_session_userid, get_session_user_groups, is_owner };
