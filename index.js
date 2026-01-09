const { get_db } = require('./db/db');
const { Entity } = require('./db/entity');
const { init_settings } = require('./setting');
const { init_router } = require('./http/router');
const { init_express_server } = require('./http/express');
const { register_type, get_type } = require('./core/type');
const { EntityMeta, get_entity_meta } = require('./core/meta');
const { is_root_role, is_root_user, check_user_role, get_user_role_right, get_session_user } = require('./core/role');
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
const code = require('./http/code');
const err = require('./http/error');
const params = require('./http/params');
const context = require('./http/context');
const gridfs = require('./db/gridfs');

const { gen_i18n } = require('./tool/gen_i18n');
const { log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info, is_log_warn, is_log_error, get_session_user_id, oid_queries, oid_query } = require('./db/db');

module.exports = {
    init_settings, is_root_role, is_root_user, check_user_role, get_user_role_right, get_session_user, init_express_server, init_router, register_type, get_type, get_db, url,
    Entity, EntityMeta, get_entity_meta, array, bash, chart, cron, date, file, lhs, msg, number, obj, random, thread, validate, code, err, params, context, gridfs, gen_i18n,
    log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info, is_log_warn, is_log_error, get_session_user_id, oid_queries, oid_query
};
