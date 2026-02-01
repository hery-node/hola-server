/**
 * Entity-level CRUD helpers and metadata-driven operations.
 * @module db/entity
 */

import { Document, Filter, Sort } from "mongodb";
import { SUCCESS, ERROR, NO_PARAMS, INVALID_PARAMS, DUPLICATE_UNIQUE, NOT_FOUND, REF_NOT_FOUND, REF_NOT_UNIQUE, HAS_REF } from "../http/code.js";
import { validate_required_fields, has_value } from "../core/validate.js";

import { convert_type, convert_update_type, get_type } from "../core/type.js";
import { get_entity_meta, EntityMeta, MetaDefinition, DELETE_MODE, FieldDefinition, FieldValue, QueryValue, filter_fields_by_role } from "../core/meta.js";
import { unique, map_array_to_obj } from "../core/array.js";
import { LOG_ENTITY, get_db, oid_query, oid_queries, log_debug, log_error, bulk_update, DB } from "./db.js";


// Comparison operator mapping for search queries
const COMPARISON_OPERATORS = [
  { prefix: ">=", op: "$gte", len: 2 },
  { prefix: "<=", op: "$lte", len: 2 },
  { prefix: ">", op: "$gt", len: 1 },
  { prefix: "<", op: "$lt", len: 1 },
];

export interface EntityResult {
  code: number;
  err?: string | string[];
  total?: number;
  data?: Document | Document[];
}

// Numeric types where "0" should be treated as "no search value" (default empty state)
// Note: int_enum types are NOT included here because 0 is often a valid enum value (e.g., ACTIVE, ADMIN)
const NUMERIC_TYPES = ["number", "int", "uint", "float", "ufloat", "decimal", "percentage", "currency"];

/** Parameters for list_entity query */
export interface ListQueryParams {
  attr_names: string;
  sort_by: string;
  desc: string;
  page: number;
  limit: number;
  [key: string]: string | number | boolean | null | undefined;
}

/** Check if a search value should be included in the query */
const has_search_value = (value: unknown, type_name: string): boolean => {
  if (!has_value(value)) return false;
  // For numeric types (but not enums), "0" or 0 without comparison operators means no search value
  if (NUMERIC_TYPES.includes(type_name)) {
    const raw = `${value}`.trim();
    // Include if it has comparison operators or is not just "0"
    if (raw === "0") return false;
  }
  return true;
};

/** Convert search value type, keeping original on error. */
const convert_search_value = (type_name: string, search_value: QueryValue): QueryValue => {
  const { value, err } = get_type(type_name).convert(search_value);
  return err ? search_value : value as QueryValue;
};

/** Create search object based on field type and value. */
const parse_search_value = (name: string, type_name: string, search_value: QueryValue): Record<string, QueryValue> => {
  const raw = `${search_value}`;

  if (raw.includes(",")) {
    const values = raw.split(",").map((v) => convert_search_value(type_name, v));
    const op = type_name === "array" ? "$all" : "$in";
    return { [name]: { [op]: values } };
  }

  for (const { prefix, op, len } of COMPARISON_OPERATORS) {
    if (raw.startsWith(prefix)) {
      return { [name]: { [op]: convert_search_value(type_name, raw.substring(len)) } };
    }
  }

  if (type_name === "array") return { [name]: { $in: [raw] } };

  let value: QueryValue = convert_search_value(type_name, raw);
  if (typeof value === "string") value = new RegExp(value, "i");
  return { [name]: value };
};

/** Apply ref_filter to query based on entity context. */
const apply_ref_filter = (query: Record<string, QueryValue>, ref_filter: Record<string, QueryValue> | undefined, ref_by_entity: string): Record<string, QueryValue> => {
  if (!ref_filter) return query;
  const filter = (ref_by_entity && ref_filter[ref_by_entity]) || ref_filter["*"] || (typeof ref_filter === "object" ? ref_filter : null);
  return filter ? { ...query, ...(filter as Record<string, QueryValue>) } : query;
};

/** Log error with formatted message. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log_err = (msg: string, data: Record<string, any> = {}): void => {
  const parts = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`);
  log_error(LOG_ENTITY, parts.length ? `${msg} - ${parts.join(", ")}` : msg);
};

/** Hook context type - can contain Entity and other non-field types */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HookContext = Record<string, any>;

/** Execute a lifecycle hook and return error result if failed. */
const run_hook = async <T extends HookContext>(hook: ((ctx: T) => Promise<EntityResult> | EntityResult) | undefined, hook_name: string, ctx: T): Promise<EntityResult | null> => {
  if (!hook) return null;
  const { code, err } = await hook(ctx);
  if (err || code !== SUCCESS) {
    log_err(`${hook_name} error`, { err, code });
    return { code, err };
  }
  return null;
};

/** Validate reference and return error result if failed. */
const validate_refs = async (entity: Entity, obj: Record<string, FieldValue>): Promise<EntityResult | null> => {
  if (!entity.meta.ref_fields) return null;
  const { code, err } = await entity.validate_ref(obj);
  if (err || code !== SUCCESS) {
    log_err("validate_ref error", { err, code });
    return { code, err };
  }
  return null;
};

/** Parse positive integer with default. */
const parse_int = (value: unknown, defaultVal: number): number => {
  const parsed = parseInt(String(value));
  return isNaN(parsed) || parsed <= 0 ? defaultVal : parsed;
};

interface FieldInfo {
  attrs: Record<string, number>;
  ref_fields: FieldDefinition[];
  link_fields: FieldDefinition[];
}

/** Extract ref and link fields from field map. */
const extract_field_info = (fields_map: Record<string, FieldDefinition>, attr_names: string, allowed_names: string[]): FieldInfo => {
  const attrs: Record<string, number> = { _id: 1 };
  const ref_fields: FieldDefinition[] = [];
  const link_fields: FieldDefinition[] = [];

  attr_names.split(",").forEach((attr) => {
    if (!allowed_names.includes(attr)) return;
    attrs[attr] = 1;
    const field = fields_map[attr];
    if (field.link) {
      link_fields.push(field);
      attrs[field.link] = 1;
    } else if (field.ref) {
      ref_fields.push(field);
    }
  });

  return { attrs, ref_fields, link_fields };
};

export class Entity {
  meta: EntityMeta;
  private _db: DB | null = null;

  constructor(meta: string) {
    this.meta = get_entity_meta(meta)!;
  }

  /** Get db instance lazily - ensures connection is established */
  private get db(): DB {
    if (!this._db) {
      this._db = get_db();
    }
    return this._db;
  }

  col() {
    return this.db.col(this.meta.collection);
  }

  async bulk_update(items: Document[], attrs: string[]): Promise<void> {
    await bulk_update(this.col(), items, attrs);
  }

  async validate_ref(param_obj: Record<string, FieldValue>): Promise<EntityResult> {
    const ref_fields = this.meta.ref_fields;
    if (!ref_fields) return { code: SUCCESS };

    for (const field of ref_fields) {
      const value = param_obj[field.name];
      const ref_entity = new Entity(field.ref!);

      const resolve_ref = async (v: string): Promise<{ code?: number; err?: string[]; id?: string }> => {
        const refs = await ref_entity.find_by_ref_value(v, { _id: 1 }, this.meta.collection);
        if (refs.length === 0) return { code: REF_NOT_FOUND, err: [field.name] };
        if (refs.length > 1) return { code: REF_NOT_UNIQUE, err: [field.name] };
        return { id: `${refs[0]._id}` };
      };

      if (Array.isArray(value)) {
        const ids: string[] = [];
        for (const v of value) {
          const result = await resolve_ref(v as string);
          if (result.code) return result as EntityResult;
          ids.push(result.id!);
        }
        param_obj[field.name] = ids;
      } else if (has_value(value)) {
        const result = await resolve_ref(value as string);
        if (result.code) return result as EntityResult;
        param_obj[field.name] = result.id;
      }
    }
    return { code: SUCCESS };
  }

  async get_search_query(param_obj: Record<string, QueryValue>): Promise<Record<string, QueryValue> | null> {
    const { search_fields } = this.meta;
    if (!search_fields?.length) return null;

    const ref_names = this.meta.ref_fields.map((f) => f.name);
    const and_array: Record<string, QueryValue>[] = [];

    for (const field of search_fields) {
      const value = param_obj[field.name];
      const type_name = field.type || "string";
      if (!has_search_value(value, type_name)) continue;

      if (ref_names.includes(field.name)) {
        const ref_entity = new Entity(field.ref!);
        const oids = await ref_entity.find_by_ref_value(value as string | string[], { _id: 1 }, this.meta.collection);
        if (oids.length > 0) {
          const ids = oids.map((o) => `${o._id}`);
          const op = oids.length === 1 ? null : `${value}`.includes(",") ? "$all" : "$in";
          and_array.push(op ? { [field.name]: { [op]: ids } } : { [field.name]: ids[0] });
        }
      } else {
        and_array.push(parse_search_value(field.name, field.type || "string", value as QueryValue));
      }
    }

    const id_param = (param_obj._id as string)?.trim();
    if (id_param) {
      const ids = id_param.split(",");
      and_array.push(ids.length === 1 ? oid_query(ids[0])! : oid_queries(ids)!);
    }

    if (and_array.length > 0) {
      const query = { $and: and_array };
      log_debug(LOG_ENTITY, `search query:${JSON.stringify(query)}`);
      return query;
    }
    return {};
  }

  async list_entity(query_params: ListQueryParams, query: Record<string, QueryValue>, param_obj: Record<string, QueryValue>, role: string): Promise<EntityResult> {
    const { attr_names, page, limit, sort_by, desc } = query_params;
    const sorts = sort_by.split(",");
    const descs = desc.split(",");
    const sort: Sort = sorts.reduce((s, field, i) => ({ ...s, [field]: descs[i] === "false" ? 1 : -1 }), {});

    const list_fields = filter_fields_by_role(this.meta.list_fields, role);
    const { attrs, ref_fields, link_fields } = extract_field_info(this.meta.fields_map, attr_names, list_fields.map((f) => f.name));

    const search_query = await this.get_search_query(param_obj);
    if (search_query === null) {
      log_err("no search query", { param_obj });
      return { code: INVALID_PARAMS, err: "no search query is set" };
    }

    const merged: Record<string, QueryValue> = { ...(query || {}), ...search_query } as Record<string, QueryValue>;
    const total = await this.count(merged);
    const list = await this.find_page(merged, sort, page, limit, attrs);
    const with_links = await this.read_link_attrs(list, link_fields);
    const data = await this.convert_ref_attrs(with_links, ref_fields);

    log_debug(LOG_ENTITY, `total:${total},data:${JSON.stringify(data)}`);
    return { code: SUCCESS, total, data };
  }

  private async _save_entity(param_obj: Record<string, FieldValue>, role: string, options: { fields_key: keyof EntityMeta; before_hook: keyof MetaDefinition; main_hook: keyof MetaDefinition; after_hook: keyof MetaDefinition; id_for_hook?: string }): Promise<EntityResult> {
    const { fields_key, before_hook, main_hook, after_hook, id_for_hook } = options;
    const def = this.meta as unknown as MetaDefinition;

    const fields = filter_fields_by_role(this.meta[fields_key] as FieldDefinition[], role);
    const { obj, error_field_names } = convert_update_type(param_obj, fields);
    if (error_field_names.length > 0) {
      log_err("invalid fields", { fields: error_field_names });
      return { code: INVALID_PARAMS, err: error_field_names };
    }

    // Preserve _user context for hooks to access (e.g., for setting ownership fields)
    if (param_obj._user) {
      obj._user = param_obj._user as FieldValue;
      // Auto-set user_field from session user (works even if field has create: false)
      if (this.meta.user_field && (param_obj._user as { sub?: string }).sub) {
        obj[this.meta.user_field] = (param_obj._user as { sub: string }).sub;
      }
    }

    // Build hook context based on whether we have an id (clone) or not (create)
    const hookCtx = id_for_hook ? { id: id_for_hook, entity: this, data: obj } : { entity: this, data: obj };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const before_err = await run_hook(def[before_hook] as any, before_hook as string, hookCtx);
    if (before_err) return before_err;

    const missing = validate_required_fields(obj, this.meta.required_field_names);
    if (missing.length > 0) {
      log_err("missing required fields", { fields: missing });
      return { code: NO_PARAMS, err: missing };
    }

    if ((await this.count_by_primary_keys(obj)) > 0) {
      return { code: DUPLICATE_UNIQUE, err: "entity already exist in db" };
    }

    const ref_err = await validate_refs(this, obj);
    if (ref_err) return ref_err;

    if (def[main_hook]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const main_err = await run_hook(def[main_hook] as any, main_hook as string, hookCtx);
      if (main_err) return main_err;
    } else {
      // Clean up _user context before saving to DB
      delete obj._user;
      const db_obj = await this.create(obj);
      if (!db_obj._id) {
        log_err("create failed");
        return { code: ERROR, err: "creating record is failed" };
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const after_err = await run_hook(def[after_hook] as any, after_hook as string, hookCtx);
    if (after_err) return after_err;

    return { code: SUCCESS };
  }

  async create_entity(param_obj: Record<string, FieldValue>, role: string): Promise<EntityResult> {
    return this._save_entity(param_obj, role, { fields_key: "create_fields", before_hook: "before_create", main_hook: "create", after_hook: "after_create" });
  }

  async clone_entity(_id: string, param_obj: Record<string, FieldValue>, role: string): Promise<EntityResult> {
    return this._save_entity(param_obj, role, { fields_key: "clone_fields", before_hook: "before_clone", main_hook: "clone", after_hook: "after_clone", id_for_hook: _id });
  }

  async update_entity(_id: string | null, param_obj: Record<string, FieldValue>, role: string): Promise<EntityResult> {
    const fields = filter_fields_by_role(this.meta.update_fields, role);
    const { obj, error_field_names } = convert_update_type(param_obj, fields);
    if (error_field_names.length > 0) {
      log_err("update_entity invalid fields", { fields: error_field_names });
      return { code: INVALID_PARAMS, err: error_field_names };
    }

    const updateCtx = { id: _id, entity: this, data: obj };
    const before_err = await run_hook((this.meta as any).before_update, "before_update", updateCtx);
    if (before_err) return before_err;

    const query = _id ? oid_query(_id) : this.primary_key_query(obj);
    if (!query) {
      log_err("invalid query", { _id, obj });
      return { code: INVALID_PARAMS, err: _id ? ["_id"] : this.meta.primary_keys };
    }

    if ((await this.count(query)) !== 1) {
      log_err("entity not found", { query });
      return { code: NOT_FOUND, err: _id ? ["_id"] : this.meta.primary_keys };
    }

    const ref_err = await validate_refs(this, obj);
    if (ref_err) return ref_err;

    if ((this.meta as any).update) {
      const update_err = await run_hook((this.meta as any).update, "update", updateCtx);
      if (update_err) return update_err;
    } else {
      await this.update(query, obj);
    }

    const after_err = await run_hook((this.meta as any).after_update, "after_update", updateCtx);
    if (after_err) return after_err;

    return { code: SUCCESS };
  }

  async batch_update_entity(_ids: string[], param_obj: Record<string, FieldValue>, role: string): Promise<EntityResult> {
    const fields = filter_fields_by_role(this.meta.update_fields, role);
    const { obj, error_field_names } = convert_update_type(param_obj, fields);
    if (error_field_names.length > 0) {
      log_err("batch_update invalid fields", { fields: error_field_names });
      return { code: INVALID_PARAMS, err: error_field_names };
    }

    const query = oid_queries(_ids);
    if (!query) {
      log_err("batch_update invalid ids", { _ids });
      return { code: INVALID_PARAMS, err: ["_ids"] };
    }

    const ref_err = await validate_refs(this, obj);
    if (ref_err) return ref_err;

    const batchCtx = { ids: _ids, entity: this, data: obj };
    if ((this.meta as any).batch_update) {
      const batch_err = await run_hook((this.meta as any).batch_update, "batch_update", batchCtx);
      if (batch_err) return batch_err;
    } else {
      const result = await this.update(query, obj);
      if ((result as any).ok !== 1) {
        log_err("batch update failed", { query, obj, result });
        return { code: ERROR, err: "batch update record is failed" };
      }
    }

    const after_err = await run_hook((this.meta as any).after_batch_update, "after_batch_update", batchCtx);
    if (after_err) return after_err;

    return { code: SUCCESS };
  }

  async delete_entity(id_array: string[]): Promise<EntityResult> {
    const query = oid_queries(id_array);
    if (!query) {
      log_err("delete_entity invalid ids", { id_array });
      return { code: INVALID_PARAMS, err: ["ids"] };
    }

    const deleteCtx = { entity: this, ids: id_array };
    const before_err = await run_hook((this.meta as any).before_delete, "before_delete", deleteCtx);
    if (before_err) return before_err;

    if ((this.meta as any).delete) {
      const delete_err = await run_hook((this.meta as any).delete, "delete", deleteCtx);
      if (delete_err) return delete_err;
    } else {
      const refs = await this.check_refer_entity(id_array);
      if (refs.length > 0) {
        const unique_refs = [...new Set(refs)];
        log_err("has references", { refs: unique_refs });
        return { code: HAS_REF, err: unique_refs };
      }

      await this.delete(query);

      for (const ref_by_meta of this.meta.ref_by_metas) {
        const ref_fields = ref_by_meta.ref_fields.filter((f) => f.ref === this.meta.collection);
        for (const field of ref_fields) {
          if (field.delete === DELETE_MODE.cascade) {
            const ref_entity = new Entity(ref_by_meta.collection);
            await ref_entity.delete_refer_entity(field.name, id_array);
          }
        }
      }
    }

    const after_err = await run_hook((this.meta as any).after_delete, "after_delete", deleteCtx);
    if (after_err) return after_err;

    return { code: SUCCESS };
  }



  async read_property(_id: string, attr_names: string, role: string): Promise<EntityResult> {
    const query = oid_query(_id);
    if (!query) {
      log_err("read_property invalid id", { _id });
      return { code: INVALID_PARAMS, err: ["_id"] };
    }

    const property_fields = filter_fields_by_role(this.meta.property_fields, role);
    const field_names = property_fields.map((f) => f.name);
    const attrs: Record<string, number> = { _id: 1 };
    attr_names.split(",").forEach((attr) => {
      if (field_names.includes(attr)) attrs[attr] = 1;
    });

    const results = await this.find(query, attrs);
    if (results?.length === 1) {
      log_debug(LOG_ENTITY, `read_property query:${JSON.stringify(query)},result:${JSON.stringify(results[0])}`);
      return { code: SUCCESS, data: results[0] };
    }
    return { code: NOT_FOUND, err: ["_id"] };
  }

  async read_entity(_id: string, attr_names: string, role: string): Promise<EntityResult> {
    const query = oid_query(_id);
    if (!query) {
      log_err("read_entity invalid id", { _id });
      return { code: INVALID_PARAMS, err: ["_id"] };
    }

    if (!attr_names) {
      log_err("read_entity invalid attr_names", { attr_names });
      return { code: INVALID_PARAMS, err: ["attr_names"] };
    }

    const property_fields = filter_fields_by_role(this.meta.property_fields, role);
    const { attrs, ref_fields, link_fields } = extract_field_info(
      this.meta.fields_map,
      attr_names,
      property_fields.map((f) => f.name),
    );

    const results = await this.find(query, attrs);
    if (results?.length !== 1) return { code: NOT_FOUND, err: ["_id"] };

    const readCtx = { id: _id, entity: this, attrNames: attr_names, result: results[0] };
    const after_err = await run_hook((this.meta as any).after_read, "after_read", readCtx);
    if (after_err) return after_err;

    const with_links = await this.read_link_attrs(results, link_fields);
    const converted = await this.convert_ref_attrs(with_links, ref_fields);

    if (converted?.length === 1) {
      log_debug(LOG_ENTITY, `read_entity query:${JSON.stringify(query)},result:${JSON.stringify(converted[0])}`);
      return { code: SUCCESS, data: converted[0] };
    }
    return { code: NOT_FOUND, err: ["_id"] };
  }

  primary_key_query(param_obj: Record<string, FieldValue>): Record<string, QueryValue> | null {
    if (!this.meta.primary_keys.every((key) => has_value(param_obj[key]))) return null;
    const { obj, error_field_names } = convert_type(param_obj, this.meta.primary_key_fields);
    if (error_field_names.length > 0) return null;
    return this.meta.primary_keys.reduce((q, key) => ({ ...q, [key]: obj[key] }), {});
  }

  count_by_primary_keys(obj: Record<string, FieldValue>): Promise<number> {
    return this.count(this.primary_key_query(obj)!);
  }

  // Database operations
  create(obj: Record<string, FieldValue>) {
    return this.db.create(this.meta.collection, obj as Document);
  }
  update(query: Record<string, QueryValue>, obj: Record<string, FieldValue>) {
    return this.db.update(this.meta.collection, query as Filter<Document>, obj);
  }
  delete(query: Record<string, QueryValue>) {
    return this.db.delete(this.meta.collection, query as Filter<Document>);
  }
  find(query: Record<string, QueryValue>, attr?: Record<string, number>) {
    return this.db.find(this.meta.collection, query as Filter<Document>, attr as Document);
  }
  find_one(query: Record<string, QueryValue>, attr?: Record<string, number>) {
    return this.db.find_one(this.meta.collection, query as Filter<Document>, attr as Document);
  }
  find_sort(query: Record<string, QueryValue>, sort: Sort, attr?: Record<string, number>) {
    return this.db.find_sort(this.meta.collection, query as Filter<Document>, sort, attr as Document);
  }
  find_page(query: Record<string, QueryValue>, sort: Sort, page: number, limit: number, attr?: Record<string, number>) {
    return this.db.find_page(this.meta.collection, query as Filter<Document>, sort, page, limit, attr as Document);
  }
  count(query: Record<string, QueryValue>) {
    return this.db.count(this.meta.collection, query as Filter<Document>);
  }
  sum(query: Record<string, QueryValue>, field: string) {
    return this.db.sum(this.meta.collection, query as Filter<Document>, field);
  }
  pull(query: Record<string, QueryValue>, ele: Record<string, FieldValue>) {
    return this.db.pull(this.meta.collection, query as Filter<Document>, ele as Document);
  }
  push(query: Record<string, QueryValue>, ele: Record<string, FieldValue>) {
    return this.db.push(this.meta.collection, query as Filter<Document>, ele as Document);
  }
  add_to_set(query: Record<string, QueryValue>, ele: Record<string, FieldValue>) {
    return this.db.add_to_set(this.meta.collection, query as Filter<Document>, ele as Document);
  }

  delete_by_id(id: string | string[]) {
    const query = Array.isArray(id) ? oid_queries(id) : oid_query(id);
    return this.db.delete(this.meta.collection, query as Filter<Document>);
  }

  find_by_ref_value(value: string | string[], attr: Record<string, number>, ref_by_entity: string): Promise<Document[]> {
    let query: Record<string, QueryValue> | null = Array.isArray(value) ? oid_queries(value as string[]) : oid_query(value as string);
    if (!query) {
      const ref_label = this.meta.ref_label!;
      if (Array.isArray(value)) {
        query = { [ref_label]: { $in: value } };
      } else if (String(value).includes(",")) {
        query = { [ref_label]: { $in: String(value).split(",") } };
      } else {
        query = { [ref_label]: value };
      }
    }
    return this.find(apply_ref_filter(query, this.meta.ref_filter as Record<string, QueryValue>, ref_by_entity), attr);
  }

  async check_refer_entity(id_array: string[]): Promise<string[]> {
    const refs: string[] = [];
    for (const ref_by_meta of this.meta.ref_by_metas) {
      const ref_entity = new Entity(ref_by_meta.collection);
      const ref_fields = ref_by_meta.ref_fields.filter((f) => f.ref === this.meta.collection);
      for (const field of ref_fields) {
        if (field.delete === DELETE_MODE.keep) continue;
        const attr = ref_by_meta.ref_label ? { [ref_by_meta.ref_label]: 1 } : {};
        const entities = await ref_entity.get_refer_entities(field.name, id_array, attr);
        if (!entities?.length) continue;
        if (field.delete === DELETE_MODE.cascade) {
          const cascade_refs = await ref_entity.check_refer_entity(entities.map((o) => `${o._id}`));
          if (cascade_refs?.length) refs.push(...cascade_refs);
        } else {
          const label_key = ref_by_meta.ref_label || "_id";
          refs.push(...entities.map((o) => `${this.meta.collection}<-${ref_by_meta.collection}:${o[label_key]}`));
        }
      }
    }
    return refs;
  }

  async get_refer_entities(field_name: string, id_array: string[], attr: Record<string, number>): Promise<Document[]> {
    return this.find({ [field_name]: { $in: id_array } }, attr);
  }

  async delete_refer_entity(field_name: string, id_array: string[]): Promise<void> {
    const entities = await this.get_refer_entities(field_name, id_array, {});
    await this.delete_entity(entities.map((o) => `${o._id}`));
  }

  async convert_ref_attrs(elements: Document[], ref_fields: FieldDefinition[] = this.meta.ref_fields): Promise<Document[]> {
    if (!elements?.length || !ref_fields?.length) return elements;

    for (const field of ref_fields) {
      let ids: string[] = [];
      for (const obj of elements) {
        const value = obj[field.name];
        if (Array.isArray(value)) ids.push(...value);
        else if (value) ids.push(value);
      }
      ids = unique(ids);

      const ref_entity = new Entity(field.ref!);
      const labels = await ref_entity.get_ref_labels(ids);
      const label_map = map_array_to_obj(labels as Record<string, FieldValue>[], "_id", ref_entity.meta.ref_label!);

      for (const obj of elements) {
        const value = obj[field.name];
        obj[`${field.name}_id`] = value;
        obj[field.name] = Array.isArray(value) ? value.map((v) => label_map[v]) : value ? label_map[value as string] : value;
      }
    }
    return elements;
  }

  async read_link_attrs(elements: Document[], link_fields: FieldDefinition[]): Promise<Document[]> {
    if (!elements?.length || !link_fields?.length) return elements;

    const entity_info: Record<string, { attrs: string[]; filters: string[] }> = {};
    for (const field of link_fields) {
      const link_field = this.meta.fields_map[field.link!];
      const entity = link_field.ref!;
      if (!entity_info[entity]) entity_info[entity] = { attrs: [], filters: [] };
      entity_info[entity].attrs.push(field.name);
      if (!entity_info[entity].filters.includes(link_field.name)) {
        entity_info[entity].filters.push(link_field.name);
      }
    }

    for (const [entity_name, { attrs, filters }] of Object.entries(entity_info)) {
      const entity = new Entity(entity_name);
      const ids = unique(elements.flatMap((o) => filters.map((f) => o[f])).filter(Boolean)) as string[];
      const query = oid_queries(ids);
      if (!query) continue;

      const attr_obj: Record<string, number> = {};
      const ref_fields: FieldDefinition[] = [];
      for (const attr of attrs) {
        attr_obj[attr] = 1;
        const field = entity.meta.fields_map[attr];
        if (!field.link && field.ref) ref_fields.push(field);
      }

      const items = await entity.find(query, attr_obj);
      if (!items?.length) continue;
      await entity.convert_ref_attrs(items, ref_fields);

      for (let i = 0; i < elements.length; i++) {
        for (const filter of filters) {
          const id = elements[i][filter];
          const link_item = items.find((o) => `${o._id}` === `${id}`);
          if (link_item) {
            const { _id, ...data } = link_item;
            elements[i] = { ...elements[i], ...data };
          }
        }
      }
    }
    return elements;
  }

  get_filtered_ref_labels(ref_by_entity: string, client_query?: string, user_id?: string): Promise<Document[]> {
    let query: Record<string, QueryValue> = {};
    if (this.meta.user_field && user_id) query[this.meta.user_field] = user_id;

    let search_query: Record<string, QueryValue> = {};
    if (client_query?.trim() && this.meta.search_fields?.length) {
      for (const part of client_query.split(",")) {
        const [field_name, value] = part.split(":");
        if (field_name && value) {
          const field = this.meta.search_fields.find((f) => f.name === field_name);
          if (field) search_query = parse_search_value(field_name, field.type || "string", value);
        }
      }
    }

    query = apply_ref_filter(query, this.meta.ref_filter, ref_by_entity);
    const ref_label = this.meta.ref_label!;
    return this.find_sort({ ...search_query, ...query } as Record<string, QueryValue>, { [ref_label]: 1 }, { [ref_label]: 1 });
  }

  get_ref_labels(id_array: string[]): Promise<Document[]> {
    return this.find(oid_queries(id_array)!, { [this.meta.ref_label!]: 1 });
  }

  find_by_oid(id: string, attr?: Record<string, number>): Promise<Document | null> {
    const query = oid_query(id);
    return query ? this.find_one(query, attr) : Promise.resolve(null);
  }

  find_one_ref_entity(field_name: string, value: string, attr?: Record<string, number>): Promise<Document | null> {
    const field = this.meta.fields.find((f) => f.name === field_name);
    if (!field) {
      throw new Error(`field not found: ${field_name} in ${this.meta.collection}`);
    }
    if (!field.ref) {
      throw new Error(`field is not ref: ${field_name} in ${this.meta.collection}`);
    }

    const ref_entity = new Entity(field.ref!);
    const query = oid_query(value) || { [ref_entity.meta.ref_label!]: value };
    return ref_entity.find_one(query as Record<string, QueryValue>, attr);
  }

  oid_query(_id: string) {
    return oid_query(_id);
  }
  oid_queries(_ids: string[]) {
    return oid_queries(_ids);
  }
}
