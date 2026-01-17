/**
 * Hola Server - Main entry point and public API.
 * 
 * @module hola-server
 * 
 * @example
 * ```typescript
 * import { plugins, errors, db, meta, config } from 'hola-server';
 * 
 * const app = new Elysia()
 *     .use(plugins.holaCors({ origin: ['http://localhost:5173'] }))
 *     .use(plugins.holaBody({ limit: '10mb' }))
 *     .use(plugins.holaAuth({ secret: 'your-secret' }))
 *     .use(plugins.holaError())
 *     .use(userRouter)
 *     .onStart(async () => {
 *         await db.get_db();
 *         meta.validate_all_metas();
 *     })
 *     .listen(3000);
 * ```
 */

// Namespaced exports
export * as plugins from './plugins/index.js';
export * as errors from './errors/index.js';
export * as db from './db/index.js';
export * as meta from './meta/index.js';
export * as config from './config/index.js';

// Commonly used items at top level for convenience
export { EntityMeta, init_router, validate_all_metas } from './meta/index.js';
export type { MetaDefinition, FieldDefinition, CallbackFunction, RouteCallback } from './meta/index.js';
export { Entity } from './db/entity.js';
export { get_db, close_db } from './db/db.js';

// Core Type System
export { register_type, get_type, convert_type, convert_update_type, int_enum_type } from './core/type.js';
export type { TypeDefinition, TypeResult, Field } from './core/type.js';
export { get_entity_meta, get_all_metas, DELETE_MODE } from './core/meta.js';

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

// HTTP utilities
export * as code from './http/code.js';


// Tools
export { gen_i18n } from './tool/gen_i18n.js';
