/**
 * Database module index - exports Entity, DB, and GridFS utilities.
 * @module db
 */

export {
    get_db,
    log_debug,
    log_info,
    log_warn,
    log_error,
    is_log_debug,
    is_log_info,
    is_log_warn,
    is_log_error,
    get_session_user_id,
    oid_queries,
    oid_query,
    close_db
} from './db.js';

export { Entity } from './entity.js';

export * as gridfs from './gridfs.js';
