/**
 * @fileoverview Database utilities for MongoDB using mongoist.
 * @module db/db
 */

const mongoist = require("mongoist");

const { get_settings } = require("../setting");
const { get_context_value } = require("../http/context");
const { format_date_time } = require("../core/date");

// Log level constants
const LOG_LEVEL_DEBUG = 0;
const LOG_LEVEL_INFO = 1;
const LOG_LEVEL_WARN = 2;
const LOG_LEVEL_ERROR = 3;

// Log category constants
const LOG_DB = "database";
const LOG_ENTITY = "entity";
const LOG_SYSTEM = "system";

/**
 * Resolve user id from request context if available.
 * @returns {string} user id or empty string when unauthenticated
 */
const get_session_user_id = () => get_context_value("req")?.session?.user?.id || "";

/**
 * Check if logging is enabled for the given level.
 * @param {number} level - Log level to check
 * @returns {boolean} true if logging is enabled
 */
const is_log_enabled = (level) => {
  const { save_db, log_level } = get_settings().log;
  return save_db && log_level <= level;
};

// Log level checkers using the unified helper
const is_log_debug = () => is_log_enabled(LOG_LEVEL_DEBUG);
const is_log_info = () => is_log_enabled(LOG_LEVEL_INFO);
const is_log_warn = () => is_log_enabled(LOG_LEVEL_WARN);
const is_log_error = () => is_log_enabled(LOG_LEVEL_ERROR);

/**
 * Write a log entry to the database.
 * @param {string} category - Log category
 * @param {number} level - Log level
 * @param {string} message - Log message
 * @param {Object} extra - Additional data
 */
const log_message = (category, level, message, extra = {}) => {
  const req = get_context_value("req");
  const entry = {
    time: format_date_time(new Date()),
    category,
    level,
    msg: message,
    user: req?.session?.user?.id || "",
    path: req?.originalUrl || "",
    ...extra
  };

  get_db().create(get_settings().log.col_log, entry).catch(() => { });
};

/**
 * Create a log function for a specific level.
 * @param {number} level - Log level
 * @param {Function} check_fn - Function to check if logging is enabled
 * @returns {Function} Log function
 */
const create_log_fn = (level, check_fn) => (category, msg, extra) => {
  if (check_fn()) {
    log_message(category, level, msg, extra);
  }
};

const log_debug = create_log_fn(LOG_LEVEL_DEBUG, is_log_debug);
const log_info = create_log_fn(LOG_LEVEL_INFO, is_log_info);
const log_warn = create_log_fn(LOG_LEVEL_WARN, is_log_warn);
const log_error = create_log_fn(LOG_LEVEL_ERROR, is_log_error);

/**
 * Construct mongodb ObjectId
 * @param {string} id - String value of the id
 * @returns {ObjectId} MongoDB ObjectId
 */
const oid = (id) => mongoist.ObjectId(id);

/**
 * Construct objectId query object
 * @param {string} id - String value of the id
 * @returns {Object|null} id query if id is valid, otherwise null
 */
const oid_query = (id) => {
  try {
    return { _id: oid(id) };
  } catch {
    return null;
  }
};

/**
 * Construct $in query of ObjectId array
 * @param {string[]} ids - Array of string ids
 * @returns {Object|null} id $in query if valid, otherwise null
 */
const oid_queries = (ids) => {
  try {
    return { _id: { $in: ids.map(oid) } };
  } catch {
    return null;
  }
};

/**
 * Execute bulk update using the items
 * @param {Object} col - MongoDB collection
 * @param {Object[]} items - Items to execute bulk update
 * @param {string[]} attrs - Attributes used as search criteria
 * @returns {Promise} Bulk operation result
 */
const bulk_update = async (col, items, attrs) => {
  const bulk = col.initializeOrderedBulkOp();
  for (const item of items) {
    const query = attrs.reduce((acc, attr) => ({ ...acc, [attr]: item[attr] }), {});
    const { _id, ...without_id } = item;
    bulk.find(query).upsert().update({ $set: without_id }, true);
  }
  return bulk.execute();
};

/**
 * Log debug message for DB operations.
 * @param {string} operation - Operation name
 * @param {string} code - Collection name
 * @param {Object} params - Operation parameters
 */
const debug_log = (operation, code, params = {}) => {
  if (!is_log_debug()) return;

  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`);

  log_debug(LOG_DB, `${operation} for [${code}]${parts.length ? ` with ${parts.join(", ")}` : ""}`);
};

class DB {
  constructor(url, options, callback) {
    if (!url) {
      throw new Error("Mongo url is required to initialize DB");
    }

    this.db = mongoist(url, options);
    this.closed = false;

    this.db.on("error", (err) => log_error(LOG_DB, err));
    this.db.on("close", () => { this.closed = true; });
    this.db.on("connect", () => {
      this.closed = false;
      callback?.();
    });
  }

  /**
   * Get db collection
   * @param {string} code - Collection name
   * @returns {Object} MongoDB collection
   */
  col(code) {
    return this.db[code];
  }

  /**
   * Insert object to db
   * @param {string} code - Collection name
   * @param {Object} obj - Object to insert
   * @returns {Promise} Insert result
   */
  create(code, obj) {
    delete obj["_id"];
    return this.col(code).insert(obj, { checkKeys: false });
  }

  /**
   * Update objects with upsert and multi enabled
   * @param {string} code - Collection name
   * @param {Object} query - Query criteria
   * @param {Object} obj - Object to update
   * @returns {Promise} Update result
   */
  update(code, query, obj) {
    debug_log("updating", code, { query, obj });
    delete obj["_id"];
    return this.col(code).update(query, { $set: obj }, { upsert: true, multi: true });
  }

  /**
   * Remove records from mongodb
   * @param {string} code - Collection name
   * @param {Object} query - Query to execute delete
   * @returns {Promise} Delete result
   */
  delete(code, query) {
    debug_log("deleting", code, { query });
    return this.col(code).remove(query);
  }

  /**
   * Find records by query
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @param {Object} attr - Attributes to load
   * @returns {Promise} Query result
   */
  find(code, query, attr) {
    debug_log("find", code, { query, attr });
    return this.col(code).find(query, attr);
  }

  /**
   * Find one record
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @param {Object} attr - Attributes to load
   * @returns {Promise} Single record or null
   */
  find_one(code, query, attr) {
    debug_log("find_one", code, { query, attr });
    return this.col(code).findOne(query, attr);
  }

  /**
   * Find records with sorting
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @param {Object} sort - Sort specification
   * @param {Object} attr - Attributes to load
   * @returns {Promise} Sorted query result
   */
  find_sort(code, query, sort, attr) {
    debug_log("find_sort", code, { query, attr, sort });
    return this.col(code).find(query, attr, { sort });
  }

  /**
   * Find paginated records
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @param {Object} sort - Sort specification
   * @param {number} page - Page index (1-based)
   * @param {number} limit - Page size
   * @param {Object} attr - Attributes to load
   * @returns {Promise} Paginated query result
   */
  find_page(code, query, sort, page, limit, attr) {
    debug_log("find_page", code, { query, attr, sort, page, limit });
    const skip = Math.max((page - 1) * limit, 0);
    return this.col(code).find(query, attr, { sort, skip, limit });
  }

  /**
   * Count records matching query
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @returns {Promise<number>} Count result
   */
  count(code, query) {
    debug_log("count", code, { query });
    return this.col(code).count(query);
  }

  /**
   * Calculate sum of a field
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @param {string} field - Field name to sum
   * @returns {Promise<number>} Sum result
   */
  sum(code, query, field) {
    debug_log("sum", code, { query, field });
    return this.col(code)
      .aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: `$${field}` } } }])
      .then((result) => result[0]?.total ?? 0);
  }

  /**
   * Pull element from array field
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @param {Object} ele - Element to pull
   * @returns {Promise} Update result
   */
  pull(code, query, ele) {
    debug_log("pull", code, { query, ele });
    return this.col(code).update(query, { $pull: ele }, { multi: true });
  }

  /**
   * Push element to array field
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @param {Object} ele - Element to push
   * @returns {Promise} Update result
   */
  push(code, query, ele) {
    debug_log("push", code, { query, ele });
    return this.col(code).update(query, { $push: ele });
  }

  /**
   * Add element to set field
   * @param {string} code - Collection name
   * @param {Object} query - Search criteria
   * @param {Object} ele - Element to add
   * @returns {Promise} Update result
   */
  add_to_set(code, query, ele) {
    return this.col(code).update(query, { $addToSet: ele }, { upsert: true });
  }

  /**
   * Close the underlying Mongo connection
   */
  async close() {
    if (!this.db || this.closed) return;
    if (typeof this.db.close === "function") {
      await this.db.close();
    }
    this.closed = true;
  }
}

let db_instance = null;

/**
 * Get or create the database instance
 * @param {Function} callback - Called when connected
 * @returns {DB} Database instance
 */
const get_db = (callback) => {
  if (db_instance?.db && !db_instance.closed) {
    return db_instance;
  }

  const { url, options } = get_settings().mongo || {};
  if (!url) {
    throw new Error("Mongo settings are missing url");
  }

  db_instance = new DB(url, options, callback);
  return db_instance;
};

/**
 * Close the database connection
 */
const close_db = async () => {
  if (db_instance) {
    await db_instance.close();
    db_instance = null;
  }
};

module.exports = {
  // ObjectId utilities
  oid,
  oid_query,
  oid_queries,
  bulk_update,

  // Database access
  get_db,
  close_db,

  // Logging functions
  log_debug,
  log_info,
  log_warn,
  log_error,
  is_log_debug,
  is_log_info,
  is_log_warn,
  is_log_error,

  // Log categories
  LOG_DB,
  LOG_SYSTEM,
  LOG_ENTITY,

  // Session
  get_session_user_id
};
