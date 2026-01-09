/**
 * @fileoverview Session middleware initialization and helpers.
 * @module http/session
 */

const express_session = require('express-session');
const MongoStore = require('connect-mongo');
const { get_settings } = require('../setting');
const { is_root_user } = require('../core/role');

/**
 * Initialize session middleware with MongoDB store.
 * @param {Object} app - Express application instance
 * @throws {Error} If session settings are invalid
 */
const init_session = (app) => {
    const settings = get_settings();
    if (!settings || !settings.server || !settings.mongo) {
        throw new Error('Server and mongo settings required for session initialization');
    }

    const { server, mongo } = settings;

    if (server.keep_session) {
        if (!server.session || !server.session.secret) {
            throw new Error('Session secret is required when keep_session is enabled');
        }

        const { session } = server;
        app.use(express_session({
            secret: session.secret,
            resave: true,
            saveUninitialized: true,
            cookie: { maxAge: session.cookie_max_age || 86400000 },
            store: MongoStore.create({ mongoUrl: mongo.url })
        }));
    }
}

/**
 * Get current user ID from session.
 * @param {Object} req - Express request
 * @returns {string|null} User ID or null
 */
const get_session_user_id = (req) => {
    const user = req && req.session ? req.session.user : null;
    return user ? user.id : null;
};

/**
 * Get current user groups from session.
 * @param {Object} req - Express request
 * @returns {string[]|null} User group IDs or null
 */
const get_session_user_groups = (req) => {
    const group = req && req.session ? req.session.group : null;
    return group && Array.isArray(group) ? group : null;
};

/**
 * Check if current user owns the entity.
 * @param {Object} req - Express request
 * @param {Object} meta - Entity meta
 * @param {Object} entity - Entity instance
 * @param {Object} query - MongoDB query
 * @returns {Promise<boolean>} True if owner or root
 * @throws {Error} If user_field is set but no user in session
 */
const is_owner = async (req, meta, entity, query) => {
    if (is_root_user(req)) {
        return true;
    }

    if (meta.user_field) {
        const user_id = get_session_user_id(req);
        if (user_id == null) {
            throw new Error("no user id is found in session");
        }
        const user_query = {};
        user_query[meta.user_field] = user_id;
        return await entity.count({ ...query, ...user_query }) == 1;
    }
    return true;
}

module.exports = { init_session, get_session_user_id, get_session_user_groups, is_owner };
