/**
 * Database utilities for MongoDB using native driver.
 * @module db/db
 */

import { MongoClient, Db, Collection, ObjectId, Document, Sort, UpdateResult, DeleteResult, BulkWriteResult } from "mongodb";
import { get_settings } from "../setting.js";
import { format_date_time } from "../core/date.js";
import type { LogValue } from "../core/bash.js";

// Log level constants
export const LOG_LEVEL_DEBUG = 0;
export const LOG_LEVEL_INFO = 1;
export const LOG_LEVEL_WARN = 2;
export const LOG_LEVEL_ERROR = 3;

// Log category constants
export const LOG_DB = "database";
export const LOG_ENTITY = "entity";
export const LOG_SYSTEM = "system";

/** Check if logging is enabled for the given level. */
const is_log_enabled = (level: number): boolean => {
  const { save_db, log_level } = get_settings().log;
  return save_db && log_level <= level;
};

export const is_log_debug = (): boolean => is_log_enabled(LOG_LEVEL_DEBUG);
export const is_log_info = (): boolean => is_log_enabled(LOG_LEVEL_INFO);
export const is_log_warn = (): boolean => is_log_enabled(LOG_LEVEL_WARN);
export const is_log_error = (): boolean => is_log_enabled(LOG_LEVEL_ERROR);

/** Write a log entry to the database. */
const log_message = (category: string, level: number, message: string, extra: Record<string, LogValue> = {}): void => {
  const entry = { time: format_date_time(new Date()), category, level, msg: message, ...extra };

  get_db()
    .create(get_settings().log.col_log, entry)
    .catch(() => { });
};

/** Create a log function for a specific level. */
const create_log_fn = (level: number, check_fn: () => boolean) => {
  return (category: string, msg: string, extra?: Record<string, LogValue>): void => {
    if (check_fn()) log_message(category, level, msg, extra);
  };
};

export const log_debug = create_log_fn(LOG_LEVEL_DEBUG, is_log_debug);
export const log_info = create_log_fn(LOG_LEVEL_INFO, is_log_info);
export const log_warn = create_log_fn(LOG_LEVEL_WARN, is_log_warn);
export const log_error = create_log_fn(LOG_LEVEL_ERROR, is_log_error);

/** Construct mongodb ObjectId. */
export const oid = (id: string): ObjectId => new ObjectId(id);

/** Construct objectId query object. */
export const oid_query = (id: string): { _id: ObjectId } | null => {
  try {
    return { _id: oid(id) };
  } catch {
    return null;
  }
};

/** Construct $in query of ObjectId array. */
export const oid_queries = (ids: string[]): { _id: { $in: ObjectId[] } } | null => {
  try {
    return { _id: { $in: ids.map(oid) } };
  } catch {
    return null;
  }
};

/** Execute bulk update using the items. */
export const bulk_update = async (col: Collection, items: Document[], attrs: string[]): Promise<BulkWriteResult | null> => {
  if (!items || items.length === 0) {
    return null;
  }
  const operations = items.map((item) => {
    const query = attrs.reduce((acc, attr) => ({ ...acc, [attr]: item[attr] }), {} as Document);
    const { _id, ...without_id } = item;
    return { updateOne: { filter: query, update: { $set: without_id }, upsert: true } };
  });
  return col.bulkWrite(operations);
};

/** Log debug message for DB operations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debug_log = (operation: string, code: string, params: Record<string, any> = {}): void => {
  if (!is_log_debug()) return;
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`);
  log_debug(LOG_DB, `${operation} for [${code}]${parts.length ? ` with ${parts.join(", ")}` : ""}`);
};

export class DB {
  private client: MongoClient;
  private db!: Db;
  private connected: boolean = false;
  private pending_callbacks: (() => void)[] = [];
  public closed: boolean = false;

  constructor(url: string, options?: { maxPoolSize?: number }) {
    if (!url) throw new Error("Mongo url is required to initialize DB");
    this.client = new MongoClient(url, options);
  }

  async connect(callback?: () => void): Promise<void> {
    if (callback) this.pending_callbacks.push(callback);
    try {
      await this.client.connect();
      this.db = this.client.db();
      this.closed = false;
      this.connected = true;
      // Invoke all pending callbacks
      for (const cb of this.pending_callbacks) {
        cb();
      }
      this.pending_callbacks = [];
    } catch (err) {
      log_error(LOG_DB, `Connection error: ${err}`);
      throw err;
    }
  }

  /** Register a callback to be called when connected. Invokes immediately if already connected. */
  on_connected(callback: () => void): void {
    if (this.connected) {
      callback();
    } else {
      this.pending_callbacks.push(callback);
    }
  }

  col(code: string): Collection {
    return this.db.collection(code);
  }
  get_col(code: string): Collection {
    return this.db.collection(code);
  }

  async create(code: string, obj: Document): Promise<Document & { _id: ObjectId }> {
    const { _id, ...without_id } = obj;
    const result = await this.col(code).insertOne(without_id);
    return { ...without_id, _id: result.insertedId };
  }

  async update(code: string, query: Document, obj: Document): Promise<UpdateResult> {
    debug_log("updating", code, { query, obj });
    const { _id, ...without_id } = obj;
    return this.col(code).updateMany(query, { $set: without_id });
  }

  async delete(code: string, query: Document): Promise<DeleteResult> {
    debug_log("deleting", code, { query });
    return this.col(code).deleteMany(query);
  }

  async find(code: string, query: Document, attr?: Document): Promise<Document[]> {
    debug_log("find", code, { query, attr });
    return this.col(code).find(query, { projection: attr }).toArray();
  }

  async find_one(code: string, query: Document, attr?: Document): Promise<Document | null> {
    debug_log("find_one", code, { query, attr });
    return this.col(code).findOne(query, { projection: attr });
  }

  async find_sort(code: string, query: Document, sort: Sort, attr?: Document): Promise<Document[]> {
    debug_log("find_sort", code, { query, attr, sort });
    return this.col(code).find(query, { projection: attr, sort }).toArray();
  }

  async find_page(code: string, query: Document, sort: Sort, page: number, limit: number, attr?: Document): Promise<Document[]> {
    debug_log("find_page", code, { query, attr, sort, page, limit });
    const skip = Math.max((page - 1) * limit, 0);
    return this.col(code).find(query, { projection: attr, sort, skip, limit }).toArray();
  }

  async count(code: string, query: Document): Promise<number> {
    debug_log("count", code, { query });
    return this.col(code).countDocuments(query);
  }

  async sum(code: string, query: Document, field: string): Promise<number> {
    debug_log("sum", code, { query, field });
    const result = await this.col(code)
      .aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: `$${field}` } } }])
      .toArray();
    return result[0]?.total ?? 0;
  }

  async pull(code: string, query: Document, ele: Document): Promise<UpdateResult> {
    debug_log("pull", code, { query, ele });
    return this.col(code).updateMany(query, { $pull: ele } as any);
  }

  async push(code: string, query: Document, ele: Document): Promise<UpdateResult> {
    debug_log("push", code, { query, ele });
    return this.col(code).updateOne(query, { $push: ele } as any);
  }

  async add_to_set(code: string, query: Document, ele: Document): Promise<UpdateResult> {
    return this.col(code).updateOne(query, { $addToSet: ele } as any, { upsert: true });
  }

  async close(): Promise<void> {
    if (!this.client || this.closed) return;
    await this.client.close();
    this.closed = true;
  }
}

let db_instance: DB | null = null;

/** Initialize the database connection. Must be called and awaited before using get_db(). */
export const init_db = async (): Promise<DB> => {
  if (db_instance && !db_instance.closed) {
    return db_instance;
  }
  const { url, pool } = get_settings().mongo;
  if (!url) throw new Error("Mongo settings are missing url");
  db_instance = new DB(url, { maxPoolSize: pool });
  await db_instance.connect();
  return db_instance;
};

/** Get the database instance. Call init_db() first to ensure connection is established. */
export const get_db = (callback?: () => void): DB => {
  if (db_instance && !db_instance.closed) {
    if (callback) db_instance.on_connected(callback);
    return db_instance;
  }
  const { url, pool } = get_settings().mongo;
  if (!url) throw new Error("Mongo settings are missing url");
  db_instance = new DB(url, { maxPoolSize: pool });
  db_instance.connect(callback);
  return db_instance;
};

/** Close the database connection. */
export const close_db = async (): Promise<void> => {
  if (db_instance) {
    await db_instance.close();
    db_instance = null;
  }
};
