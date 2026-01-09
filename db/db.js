/**
 * @fileoverview Database utilities for MongoDB using mongoist.
 * @module db/db
 */

const mongoist = require("mongoist");

const { get_settings } = require("../setting");
const { get_context_value } = require("../http/context");
const { format_date_time } = require("../core/date");

const LOG_LEVEL_DEBUG = 0;
const LOG_LEVEL_INFO = 1;
const LOG_LEVEL_WARN = 2;
const LOG_LEVEL_ERROR = 3;

const LOG_DB = "database";
const LOG_ENTITY = "entity";
const LOG_SYSTEM = "system";

/**
 * Resolve user id from request context if available.
 * @returns {string} user id or empty string when unauthenticated
 */
const get_session_user_id = () => {
  const req = get_context_value("req");
  return req && req.session && req.session.user ? req.session.user.id : "";
};

const log_message = (category, level, message, extra = {}) => {
  const time = format_date_time(new Date());
  const db = get_db();
  const { col_log } = get_settings().log;

  const req = get_context_value("req");
  const path = req?.originalUrl || "";
  const user_id = req?.session?.user?.id || "";

  db.create(col_log, { time, category, level, msg: message, user: user_id, path, ...extra }).catch(() => { });
};

const is_log_debug = () => {
  const { save_db, log_level } = get_settings().log;
  return save_db && log_level <= LOG_LEVEL_DEBUG;
};

const is_log_info = () => {
  const { save_db, log_level } = get_settings().log;
  return save_db && log_level <= LOG_LEVEL_INFO;
};

const is_log_warn = () => {
  const { save_db, log_level } = get_settings().log;
  return save_db && log_level <= LOG_LEVEL_WARN;
};

const is_log_error = () => {
  const { save_db, log_level } = get_settings().log;
  return save_db && log_level <= LOG_LEVEL_ERROR;
};

const log_debug = (category, msg, extra) => {
  if (is_log_debug()) {
    log_message(category, LOG_LEVEL_DEBUG, msg, extra);
  }
};

const log_info = (category, msg, extra) => {
  if (is_log_info()) {
    log_message(category, LOG_LEVEL_INFO, msg, extra);
  }
};

const log_warn = (category, msg, extra) => {
  if (is_log_warn()) {
    log_message(category, LOG_LEVEL_WARN, msg, extra);
  }
};

const log_error = (category, msg, extra) => {
  if (is_log_error()) {
    log_message(category, LOG_LEVEL_ERROR, msg, extra);
  }
};

/**
 * Construct mongodb ObjectId
 * @param {string value of the id} id
 * @returns
 */
const oid = (id) => {
  return mongoist.ObjectId(id);
};

/**
 * Construct objectId query object
 * @param {string value of the id} id
 * @returns id query if id is valid otherwise return null
 */
const oid_query = (id) => {
  try {
    return { _id: oid(id) };
  } catch (e) {
    return null;
  }
};

/**
 * Construct in query of ObjectId array
 * @param {string value of the id} ids
 * @returns id in query if id is valid otherwise return null
 */
const oid_queries = (ids) => {
  try {
    const id_array = ids.map((id) => oid(id));
    return { _id: { $in: id_array } };
  } catch (e) {
    return null;
  }
};

/**
 * Execute bulk update using the items
 * @param {mongodb collection} col
 * @param {the items to execute bulk update} items
 * @param {the attributes used as search criteria} attrs
 * @returns
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

class DB {
  constructor(url, options, callback) {
    if (!url) {
      return;
    }

    this.db = mongoist(url, options);

    this.db.on("error", (err) => {
      if (is_log_error()) {
        log_error(LOG_DB, err);
      }
    });

    this.db.on('connect', () => {
      if (callback) {
        callback();
      }
    });
  }

  /**
   * get db collection
   * @param {mongodb collection name} code
   * @returns 
   */
  get_col(code) {
    return this.db[code];
  }

  /**
   * Insert Object to db
   * @param {mongodb collection name} code
   * @param {inserted object} obj
   * @returns
   */
  create(code, obj) {
    const col = this.db[code];
    delete obj["_id"];
    return col.insert(obj, { checkKeys: false });
  }

  /**
   * Update the object, upsert:true, multi:true
   * @param {mongodb collection name} code
   * @param {*} query
   * @param {*} obj
   * @returns
   */
  update(code, query, obj) {
    if (is_log_debug()) {
      log_debug(LOG_DB, `updating obj:${JSON.stringify(obj)}, for [${code}] with query:${JSON.stringify(query)}`);
    }

    const col = this.db[code];
    delete obj["_id"];
    return col.update(query, { $set: obj }, { upsert: true, multi: true });
  }

  /**
   * Remove the records from mongodb
   * @param {mongodb collection name} code
   * @param {query to execute delete op} query
   * @returns
   */
  delete(code, query) {
    if (is_log_debug()) {
      log_debug(LOG_DB, `deleting objects for [${code}] with query:${JSON.stringify(query)}`);
    }

    const col = this.db[code];
    return col.remove(query);
  }

  /**
   * Search the db using query
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @param {the attributes to load from db} attr
   * @returns
   */
  find(code, query, attr) {
    if (is_log_debug()) {
      log_debug(LOG_DB, `find objects for [${code}] with query:${JSON.stringify(query)} and attr:${JSON.stringify(attr)}`);
    }

    const col = this.db[code];
    return col.find(query, attr);
  }

  /**
   * Find one record from db
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @param {the attributes to load from db} attr
   * @returns
   */
  find_one(code, query, attr) {
    if (is_log_debug()) {
      log_debug(LOG_DB, `find_one for [${code}] with query:${JSON.stringify(query)} and attr:${JSON.stringify(attr)}`);
    }

    const col = this.db[code];
    return col.findOne(query, attr);
  }

  /**
   * Find the records from db using sort to do sorting
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @param {sort object to sort the result} sort
   * @param {the attributes of the object to load from db} attr
   * @returns
   */
  find_sort(code, query, sort, attr) {
    if (is_log_debug()) {
      log_debug(LOG_DB, `find_sort for [${code}] with query:${JSON.stringify(query)} and attr:${JSON.stringify(attr)} and sort:${JSON.stringify(sort)}`);
    }

    const col = this.db[code];
    return col.find(query, attr, { sort: sort });
  }

  /**
   * Find the page records
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @param {sort object to sort the results} sort
   * @param {the page index to load} page
   * @param {page size } limit
   * @param {the attributes of the object to load from db} attr
   * @returns
   */
  find_page(code, query, sort, page, limit, attr) {
    if (is_log_debug()) {
      log_debug(LOG_DB, `find_page for [${code}] with query:${JSON.stringify(query)} and attr:${JSON.stringify(attr)} and sort:${JSON.stringify(sort)}, page:${page},limit:${limit}`);
    }

    const skip = (page - 1) * limit > 0 ? (page - 1) * limit : 0;
    const col = this.db[code];
    return col.find(query, attr, { sort: sort, skip: skip, limit: limit });
  }

  /**
   * The count number of the query
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @returns
   */
  count(code, query) {
    if (is_log_debug()) {
      log_debug(LOG_DB, `count for [${code}] with query:${JSON.stringify(query)}`);
    }

    const col = this.db[code];
    return col.count(query);
  }

  /**
   * Calculate the sum value based on the field and query criteria
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @param {field name to calculate sum} field
   * @returns
   */
  sum(code, query, field) {
    if (is_log_debug()) {
      log_debug(LOG_DB, `sum for [${code}] with query:${JSON.stringify(query)}, and field:${JSON.stringify(field)}`);
    }

    const col = this.db[code];
    return col.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: `$${field}` } } }]).then((result) => (result.length > 0 ? result[0].total : 0));
  }

  /**
   * Pull the object from array
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @param {object pulled from the array} ele
   * @returns
   */
  pull(code, query, ele) {
    if (is_log_debug()) {
      log_debug(LOG_DB, "pull ele [" + JSON.stringify(ele) + "] with query:" + JSON.stringify(query) + ",code:" + code);
    }

    const col = this.db[code];
    return col.update(query, { $pull: ele }, { multi: true });
  }

  /**
   * Push the object to array
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @param {object push to the array} ele
   * @returns
   */
  push(code, query, ele) {
    if (is_log_debug()) {
      log_debug(LOG_DB, "push ele [" + JSON.stringify(ele) + "] with query:" + JSON.stringify(query) + ",code:" + code);
    }

    const col = this.db[code];
    return col.update(query, { $push: ele });
  }

  /**
   * add the object to set
   * @param {mongodb collection name} code
   * @param {search criteria} query
   * @param {object added to the set} ele
   * @returns
   */
  add_to_set(code, query, ele) {
    const col = this.db[code];
    return col.update(query, { $addToSet: ele }, { upsert: true });
  }

  /**
   * Get the mongodb collection
   * @param {mongodb collection name} code
   * @returns
   */
  col(code) {
    return this.db[code];
  }

  /**
   * Close the underlying Mongo connection
   */
  async close() {
    if (this.db && typeof this.db.close === "function") {
      await this.db.close();
    }
  }
}

let db_instance = null;

/**
 *
 * @returns db instance of mongodb
 */
const get_db = (callback) => {
  if (db_instance && db_instance.db) {
    return db_instance;
  }

  const mongo = get_settings().mongo;
  db_instance = new DB(mongo.url, mongo.options, callback);
  return db_instance;
};

const close_db = async () => {
  if (db_instance) {
    await db_instance.close();
    db_instance = null;
  }
};
module.exports = { oid, oid_query, oid_queries, bulk_update, get_db, close_db, log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info, is_log_warn, is_log_error, LOG_DB, LOG_SYSTEM, LOG_ENTITY, get_session_user_id };
