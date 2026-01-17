/**
 * Hola Server - Main entry point and public API.
 * @module index
 */

// Database
export { get_db, log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info, is_log_warn, is_log_error, get_session_user_id, oid_queries, oid_query, close_db } from './db/db.js';
export { Entity } from './db/entity.js';
export * as gridfs from './db/gridfs.js';

// Settings and Configuration
export { init_settings, get_settings } from './setting.js';
export type { Settings, ServerSettings, Role } from './setting.js';

// HTTP Layer
export { init_router } from './http/router.js';
export { init_elysia_server, get_app } from './http/server.js';
// Backward compatibility alias
export { init_elysia_server as init_express_server } from './http/server.js';
export * as code from './http/code.js';
export * as err from './http/error.js';
export * as params from './http/params.js';
export * as context from './http/context.js';

// Core Type System
export { register_type, get_type, convert_type, convert_update_type, int_enum_type } from './core/type.js';
export type { TypeDefinition, TypeResult, Field } from './core/type.js';
export { EntityMeta, get_entity_meta, get_all_metas, validate_all_metas, DELETE_MODE } from './core/meta.js';
export type { MetaDefinition, FieldDefinition, CallbackFunction, RouteCallback } from './core/meta.js';

// Core Role System
export { is_root_role, is_root_user, check_user_role, get_user_role_right, get_session_user, validate_meta_role } from './core/role.js';

// Core Utilities
export { url } from './core/url.js';
export * as array from './core/array.js';
export * as bash from './core/bash.js';
export * as chart from './core/chart.js';
export * as cron from './core/cron.js';
export * as date from './core/date.js';
export * as file from './core/file.js';
export * as lhs from './core/lhs.js';
export * as number from './core/number.js';
export * as obj from './core/obj.js';
export * as random from './core/random.js';
export * as thread from './core/thread.js';
export * as validate from './core/validate.js';
export { encrypt_pwd, md5 } from './core/encrypt.js';

// Tools
export { gen_i18n } from './tool/gen_i18n.js';
