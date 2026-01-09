/**
 * @fileoverview Hola Server - Main entry point and public API.
 * @module index
 */

// Database
const { get_db } = require('./db/db');
const { Entity } = require('./db/entity');
const { log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info, is_log_warn, is_log_error, get_session_user_id, oid_queries, oid_query } = require('./db/db');
const gridfs = require('./db/gridfs');

// Settings and Configuration
const { init_settings } = require('./setting');

// HTTP Layer
const { init_router } = require('./http/router');
const { init_express_server } = require('./http/express');
const code = require('./http/code');
const err = require('./http/error');
const params = require('./http/params');
const context = require('./http/context');

// Core Type System
const { register_type, get_type } = require('./core/type');
const { EntityMeta, get_entity_meta } = require('./core/meta');

// Core Role System
const { is_root_role, is_root_user, check_user_role, get_user_role_right, get_session_user } = require('./core/role');

// Core Utilities
const { url } = require('./core/url');
const array = require('./core/array');
const bash = require('./core/bash');
const chart = require('./core/chart');
const cron = require('./core/cron');
const date = require('./core/date');
const file = require('./core/file');
const lhs = require('./core/lhs');
const msg = require('./core/msg');
const number = require('./core/number');
const obj = require('./core/obj');
const random = require('./core/random');
const thread = require('./core/thread');
const validate = require('./core/validate');

// Tools
const { gen_i18n } = require('./tool/gen_i18n');

module.exports = {
    // Settings
    init_settings,

    // Express Server
    init_express_server,
    init_router,

    // Database
    get_db,
    Entity,
    oid_queries,
    oid_query,
    gridfs,

    // Logging
    log_debug,
    log_info,
    log_warn,
    log_error,
    is_log_debug,
    is_log_info,
    is_log_warn,
    is_log_error,

    // Type System
    register_type,
    get_type,
    EntityMeta,
    get_entity_meta,

    // Role & Auth
    is_root_role,
    is_root_user,
    check_user_role,
    get_user_role_right,
    get_session_user,
    get_session_user_id,

    // HTTP Utilities
    url,
    code,
    err,
    params,
    context,

    // Core Utilities
    array,
    bash,
    chart,
    cron,
    date,
    file,
    lhs,
    msg,
    number,
    obj,
    random,
    thread,
    validate,

    // Tools
    gen_i18n
};
