const { get_db } = require('./db/db');
const { Entity } = require('./db/entity');
const { init_settings } = require('./setting');
const { init_router } = require('./http/router');
const { init_express_server } = require('./http/express');
const { register_type, get_type } = require('./core/type');
const { EntityMeta, get_entity_meta } = require('./core/meta');


const array = require('./core/array');
const date = require('./core/date');
const file = require('./core/file');
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
const { log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info, is_log_warn, is_log_error, get_session_userid, oid_queries, oid_query } = require('./db/db');

module.exports = {
    init_settings, init_express_server, init_router, register_type, get_type, get_db,
    Entity, EntityMeta, get_entity_meta, array, date, file, number, obj, random, thread, validate, code, err, params, context, gridfs, gen_i18n,
    log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info, is_log_warn, is_log_error, get_session_userid, oid_queries, oid_query
};
