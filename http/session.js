const express_session = require('express-session');
const MongoStore = require('connect-mongo');
const { get_settings, is_valid_role, is_root_role } = require('../setting');

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

const get_session_user_role = (req) => {
    const user = req && req.session ? req.session.user : null;
    return user ? user.role : null;
}

//b:batch mode, c:create, d:delete, e:export, i:import, o:clone, p:page, r: refresh, s:search, u:update
const mode_all = "bcdeiorsu";

const get_user_role_mode = (req, roles) => {
    const server = get_settings().server;
    if (server.check_user == false) {
        return mode_all;
    }

    const user_role = get_session_user_role(req);
    if (!user_role) {
        return "";
    }

    if (is_root_role(user_role)) {
        return mode_all;
    } else if (is_valid_role(user_role)) {
        for (let i = 0; i < roles.length; i++) {
            const role = roles[i];
            const role_settings = role.split(":");
            const role_name = role_settings[0];
            const role_mode = role_settings[1];
            if (user_role == role_name) {
                return role_mode;
            }
        }
    }

    return "";
}

const check_user_role = (req, roles, mode) => {
    const role_mode = get_user_role_mode(req, roles);
    return role_mode.includes(mode);
}

const get_session_user_groups = (req) => {
    const group = req && req.session ? req.session.group : null;
    return group && Array.isArray(group) ? group : null;
}

module.exports = { init_session, get_session_userid, get_session_user_role, get_session_user_groups, check_user_role, get_user_role_mode };
