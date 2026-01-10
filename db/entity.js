/**
 * @fileoverview Entity-level CRUD helpers and metadata-driven operations.
 * @module db/entity
 */

const { SUCCESS, ERROR, NO_PARAMS, INVALID_PARAMS, DUPLICATE_KEY, NOT_FOUND, REF_NOT_FOUND, REF_NOT_UNIQUE, HAS_REF } = require('../http/code');
const { validate_required_fields, has_value } = require('../core/validate');
const { required_params } = require('../http/params');
const { convert_type, convert_update_type, get_type } = require('../core/type');
const { get_entity_meta, DELETE_MODE } = require('../core/meta');
const { unique, map_array_to_obj } = require('../core/array');
const { LOG_ENTITY, get_db, oid_query, oid_queries, log_debug, log_error, get_session_user_id, bulk_update } = require('./db');

// Comparison operator mapping for search queries
const COMPARISON_OPERATORS = [
    { prefix: '>=', op: '$gte', len: 2 },
    { prefix: '<=', op: '$lte', len: 2 },
    { prefix: '>', op: '$gt', len: 1 },
    { prefix: '<', op: '$lt', len: 1 }
];

/**
 * Convert search value type, keeping original on error.
 * @param {string} type_name - Field type
 * @param {*} search_value - Search value
 * @returns {*} Converted value or original on error
 */
const convert_search_value = (type_name, search_value) => {
    const { value, err } = get_type(type_name).convert(search_value);
    return err ? search_value : value;
};

/**
 * Create search object based on field type and value.
 * @param {string} name - Field name
 * @param {string} type_name - Field type name
 * @param {*} search_value - Search value
 * @returns {Object} MongoDB query object
 */
const parse_search_value = (name, type_name, search_value) => {
    const raw = `${search_value}`;

    // Handle comma-separated values
    if (raw.includes(',')) {
        const values = raw.split(',').map(v => convert_search_value(type_name, v));
        const op = type_name === 'array' ? '$all' : '$in';
        return { [name]: { [op]: values } };
    }

    // Handle comparison operators
    for (const { prefix, op, len } of COMPARISON_OPERATORS) {
        if (raw.startsWith(prefix)) {
            return { [name]: { [op]: convert_search_value(type_name, raw.substring(len)) } };
        }
    }

    // Handle array type
    if (type_name === 'array') {
        return { [name]: { $in: [raw] } };
    }

    // Default: convert value, use regex for strings
    let value = convert_search_value(type_name, raw);
    if (typeof value === 'string') {
        value = new RegExp(value, 'i');
    }
    return { [name]: value };
};

/**
 * Apply ref_filter to query based on entity context.
 * @param {Object} query - Existing query
 * @param {Object} ref_filter - Filter configuration
 * @param {string} ref_by_entity - Referring entity name
 * @returns {Object} Query with filter applied
 */
const apply_ref_filter = (query, ref_filter, ref_by_entity) => {
    if (!ref_filter) return query;

    const filter = (ref_by_entity && ref_filter[ref_by_entity])
        || ref_filter['*']
        || (typeof ref_filter === 'object' ? ref_filter : null);

    return filter ? { ...query, ...filter } : query;
};

/**
 * Log error with formatted message.
 * @param {string} msg - Error message
 * @param {Object} data - Additional data to log
 */
const log_err = (msg, data = {}) => {
    const parts = Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}:${JSON.stringify(v)}`);
    log_error(LOG_ENTITY, parts.length ? `${msg} - ${parts.join(', ')}` : msg);
};

/**
 * Execute a lifecycle hook and return error result if failed.
 * @param {Function} hook - Hook function to execute
 * @param {string} hook_name - Name for logging
 * @param  {...any} args - Arguments to pass to hook
 * @returns {Object|null} Error result or null if successful
 */
const run_hook = async (hook, hook_name, ...args) => {
    if (!hook) return null;
    const { code, err } = await hook(...args);
    if (err || code !== SUCCESS) {
        log_err(`${hook_name} error`, { err, code });
        return { code, err };
    }
    return null;
};

/**
 * Validate reference and return error result if failed.
 * @param {Entity} entity - Entity instance
 * @param {Object} obj - Object to validate
 * @returns {Object|null} Error result or null if successful
 */
const validate_refs = async (entity, obj) => {
    if (!entity.meta.ref_fields) return null;
    const { code, err } = await entity.validate_ref(obj);
    if (err || code !== SUCCESS) {
        log_err('validate_ref error', { err, code });
        return { code, err };
    }
    return null;
};

/**
 * Parse positive integer with default.
 * @param {*} value - Value to parse
 * @param {number} defaultVal - Default value
 * @returns {number} Parsed integer or default
 */
const parse_int = (value, defaultVal) => {
    const parsed = parseInt(value);
    return isNaN(parsed) || parsed <= 0 ? defaultVal : parsed;
};

/**
 * Extract ref and link fields from field map based on allowed names.
 * @param {Object} fields_map - Map of field name to field config
 * @param {string[]} attr_names - Attribute names to check
 * @param {string[]} allowed_names - Allowed field names
 * @returns {Object} Object with attrs, ref_fields, and link_fields
 */
const extract_field_info = (fields_map, attr_names, allowed_names) => {
    const attrs = { _id: 1 };
    const ref_fields = [];
    const link_fields = [];

    attr_names.split(',').forEach(attr => {
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

class Entity {
    /**
     * @param {Object|string} meta - Entity meta object or collection name
     */
    constructor(meta) {
        this.meta = typeof meta === 'string' ? get_entity_meta(meta) : meta;
        this.db = get_db();
    }

    /** @returns {Object} MongoDB collection */
    col() {
        return this.db.col(this.meta.collection);
    }

    /**
     * Execute bulk update using the items.
     * @param {Object[]} items - Items to update
     * @param {string[]} attrs - Attributes for search criteria
     */
    async bulk_update(items, attrs) {
        await bulk_update(this.col(), items, attrs);
    }

    /**
     * Validate ref value and convert ref_label to objectid.
     * @param {Object} param_obj - Parameter object
     * @returns {Object} Result with code and optional err
     */
    async validate_ref(param_obj) {
        const ref_fields = this.meta.ref_fields;
        if (!ref_fields) return { code: SUCCESS };

        for (const field of ref_fields) {
            const value = param_obj[field.name];
            const ref_entity = new Entity(get_entity_meta(field.ref));

            const resolve_ref = async (v) => {
                const refs = await ref_entity.find_by_ref_value(v, { _id: 1 }, this.meta.collection);
                if (refs.length === 0) return { code: REF_NOT_FOUND, err: [field.name] };
                if (refs.length > 1) return { code: REF_NOT_UNIQUE, err: [field.name] };
                return { id: `${refs[0]._id}` };
            };

            if (Array.isArray(value)) {
                const ids = [];
                for (const v of value) {
                    const result = await resolve_ref(v);
                    if (result.code) return result;
                    ids.push(result.id);
                }
                param_obj[field.name] = ids;
            } else if (has_value(value)) {
                const result = await resolve_ref(value);
                if (result.code) return result;
                param_obj[field.name] = result.id;
            }
        }
        return { code: SUCCESS };
    }

    /**
     * Create search query from client params.
     * @param {Object} param_obj - Search parameters
     * @returns {Object|null} Query object or null if no search fields
     */
    async get_search_query(param_obj) {
        const { search_fields } = this.meta;
        if (!search_fields?.length) return null;

        const ref_names = this.meta.ref_fields.map(f => f.name);
        const and_array = [];

        for (const field of search_fields) {
            const value = param_obj[field.name];
            if (!has_value(value)) continue;

            if (ref_names.includes(field.name)) {
                const ref_entity = new Entity(get_entity_meta(field.ref));
                const oids = await ref_entity.find_by_ref_value(value, { _id: 1 }, this.meta.collection);
                if (oids.length > 0) {
                    const ids = oids.map(o => `${o._id}`);
                    const op = oids.length === 1 ? null : (`${value}`.includes(',') ? '$all' : '$in');
                    and_array.push(op ? { [field.name]: { [op]: ids } } : { [field.name]: ids[0] });
                }
            } else {
                and_array.push(parse_search_value(field.name, field.type, value));
            }
        }

        // Handle _id parameter
        const id_param = param_obj._id?.trim();
        if (id_param) {
            const ids = id_param.split(',');
            and_array.push(ids.length === 1 ? oid_query(ids[0]) : oid_queries(ids));
        }

        if (and_array.length > 0) {
            const query = { $and: and_array };
            log_debug(LOG_ENTITY, `search query:${JSON.stringify(query)}`);
            return query;
        }
        return {};
    }

    /**
     * List entities with pagination.
     * @param {Object} query_params - Query parameters
     * @param {Object} query - Additional query filter
     * @param {Object} param_obj - Search parameters
     * @param {string} view - View filter
     * @returns {Object} Result with code, total, and data
     */
    async list_entity(query_params, query, param_obj, view) {
        const missing = validate_required_fields(query_params, ['attr_names', 'sort_by', 'desc']);
        if (missing.length > 0) {
            log_err('missing required fields', { fields: missing });
            return { code: NO_PARAMS, err: missing };
        }

        const { attr_names, page, limit, sort_by, desc } = query_params;

        // Build sort object
        const sorts = sort_by.split(',');
        const descs = desc.split(',');
        const sort = sorts.reduce((s, field, i) => ({ ...s, [field]: descs[i] === 'false' ? 1 : -1 }), {});

        const list_fields = this.filter_fields_by_view(this.meta.list_fields, view);
        const { attrs, ref_fields, link_fields } = extract_field_info(
            this.meta.fields_map,
            attr_names,
            list_fields.map(f => f.name)
        );

        const page_int = parse_int(page, 1);
        const page_limit = parse_int(limit, 10);

        const search_query = await this.get_search_query(param_obj);
        if (search_query === null) {
            log_err('no search query', { param_obj });
            return { code: INVALID_PARAMS, err: 'no search query is set' };
        }

        const merged = { ...(query || {}), ...search_query };
        const total = await this.count(merged);
        const list = await this.find_page(merged, sort, page_int, page_limit, attrs);
        const with_links = await this.read_link_attrs(list, link_fields);
        const data = await this.convert_ref_attrs(with_links, ref_fields);

        log_debug(LOG_ENTITY, `total:${total},data:${JSON.stringify(data)}`);
        return { code: SUCCESS, total, data };
    }

    /**
     * Common logic for create/clone entity operations.
     * @private
     */
    async _save_entity(param_obj, view, options) {
        const { fields_key, before_hook, main_hook, after_hook, id_for_hook } = options;

        const fields = this.filter_fields_by_view(this.meta[fields_key], view);
        const { obj, error_field_names } = convert_type(param_obj, fields);
        if (error_field_names.length > 0) {
            log_err('invalid fields', { fields: error_field_names });
            return { code: INVALID_PARAMS, err: error_field_names };
        }

        // Before hook
        const before_args = id_for_hook ? [id_for_hook, this, obj] : [this, obj];
        const before_err = await run_hook(this.meta[before_hook], before_hook, ...before_args);
        if (before_err) return before_err;

        // Validate required fields
        const missing = validate_required_fields(obj, this.meta.required_field_names);
        if (missing.length > 0) {
            log_err('missing required fields', { fields: missing });
            return { code: NO_PARAMS, err: missing };
        }

        // Check for duplicates
        if (await this.count_by_primary_keys(obj) > 0) {
            return { code: DUPLICATE_KEY, err: 'entity already exist in db' };
        }

        // Validate refs
        const ref_err = await validate_refs(this, obj);
        if (ref_err) return ref_err;

        // Main operation
        if (this.meta[main_hook]) {
            const main_args = id_for_hook ? [id_for_hook, this, obj] : [this, obj];
            const main_err = await run_hook(this.meta[main_hook], main_hook, ...main_args);
            if (main_err) return main_err;
        } else {
            const db_obj = await this.create(obj);
            if (!db_obj._id) {
                log_err('create failed');
                return { code: ERROR, err: 'creating record is failed' };
            }
        }

        // After hook
        const after_args = id_for_hook ? [id_for_hook, this, obj] : [this, obj];
        const after_err = await run_hook(this.meta[after_hook], after_hook, ...after_args);
        if (after_err) return after_err;

        return { code: SUCCESS };
    }

    /**
     * Create a new entity.
     * @param {Object} param_obj - Entity data
     * @param {string} view - View filter
     * @returns {Object} Result with code
     */
    async create_entity(param_obj, view) {
        return this._save_entity(param_obj, view, {
            fields_key: 'create_fields',
            before_hook: 'before_create',
            main_hook: 'create',
            after_hook: 'after_create'
        });
    }

    /**
     * Clone an existing entity.
     * @param {string} _id - Source entity ID
     * @param {Object} param_obj - New entity data
     * @param {string} view - View filter
     * @returns {Object} Result with code
     */
    async clone_entity(_id, param_obj, view) {
        return this._save_entity(param_obj, view, {
            fields_key: 'clone_fields',
            before_hook: 'before_clone',
            main_hook: 'clone',
            after_hook: 'after_clone',
            id_for_hook: _id
        });
    }

    /**
     * Update an existing entity.
     * @param {string} _id - Entity ID (null to use primary key)
     * @param {Object} param_obj - Update data
     * @param {string} view - View filter
     * @returns {Object} Result with code
     */
    async update_entity(_id, param_obj, view) {
        const fields = this.filter_fields_by_view(this.meta.update_fields, view);
        const { obj, error_field_names } = convert_update_type(param_obj, fields);
        if (error_field_names.length > 0) {
            log_err('update_entity invalid fields', { fields: error_field_names });
            return { code: INVALID_PARAMS, err: error_field_names };
        }

        const before_err = await run_hook(this.meta.before_update, 'before_update', _id, this, obj);
        if (before_err) return before_err;

        const query = _id ? oid_query(_id) : this.primary_key_query(obj);
        if (!query) {
            log_err('invalid query', { _id, obj });
            return { code: INVALID_PARAMS, err: _id ? ['_id'] : this.meta.primary_keys };
        }

        if (await this.count(query) !== 1) {
            log_err('entity not found', { query });
            return { code: NOT_FOUND, err: _id ? ['_id'] : this.meta.primary_keys };
        }

        const ref_err = await validate_refs(this, obj);
        if (ref_err) return ref_err;

        if (this.meta.update) {
            const update_err = await run_hook(this.meta.update, 'update', _id, this, obj);
            if (update_err) return update_err;
        } else {
            const result = await this.update(query, obj);
            if (result.ok !== 1) {
                log_err('update failed', { query, obj, result });
                return { code: ERROR, err: 'update record is failed' };
            }
        }

        const after_err = await run_hook(this.meta.after_update, 'after_update', _id, this, obj);
        if (after_err) return after_err;

        return { code: SUCCESS };
    }

    /**
     * Batch update multiple entities.
     * @param {string[]} _ids - Entity IDs
     * @param {Object} param_obj - Update data
     * @param {string} view - View filter
     * @returns {Object} Result with code
     */
    async batch_update_entity(_ids, param_obj, view) {
        const fields = this.filter_fields_by_view(this.meta.update_fields, view);
        const { obj, error_field_names } = convert_update_type(param_obj, fields);
        if (error_field_names.length > 0) {
            log_err('batch_update invalid fields', { fields: error_field_names });
            return { code: INVALID_PARAMS, err: error_field_names };
        }

        const query = oid_queries(_ids);
        if (!query) {
            log_err('batch_update invalid ids', { _ids });
            return { code: INVALID_PARAMS, err: ['_ids'] };
        }

        const ref_err = await validate_refs(this, obj);
        if (ref_err) return ref_err;

        if (this.meta.batch_update) {
            const batch_err = await run_hook(this.meta.batch_update, 'batch_update', _ids, this, obj);
            if (batch_err) return batch_err;
        } else {
            const result = await this.update(query, obj);
            if (result.ok !== 1) {
                log_err('batch update failed', { query, obj, result });
                return { code: ERROR, err: 'batch update record is failed' };
            }
        }

        const after_err = await run_hook(this.meta.after_batch_update, 'after_batch_update', _ids, this, obj);
        if (after_err) return after_err;

        return { code: SUCCESS };
    }

    /**
     * Filter fields by view.
     * @param {Object[]} fields - Fields to filter
     * @param {string} view - View name
     * @returns {Object[]} Filtered fields
     */
    filter_fields_by_view(fields, view) {
        if (!view || view === '*') return fields;

        return fields.filter(field => {
            const fv = field.view;
            if (Array.isArray(fv)) {
                return fv.includes('*') || fv.some(v => view.includes(v));
            }
            if (typeof fv === 'string') {
                return fv === '*' || view.includes(fv);
            }
            return true;
        });
    }

    /**
     * Read entity properties without ref conversion.
     * @param {string} _id - Entity ID
     * @param {string} attr_names - Comma-separated attribute names
     * @param {string} view - View filter
     * @returns {Object} Result with code and data
     */
    async read_property(_id, attr_names, view) {
        const query = oid_query(_id);
        if (!query) {
            log_err('read_property invalid id', { _id });
            return { code: INVALID_PARAMS, err: ['_id'] };
        }

        const property_fields = this.filter_fields_by_view(this.meta.property_fields, view);
        const field_names = property_fields.map(f => f.name);
        const attrs = { _id: 1 };
        attr_names.split(',').forEach(attr => {
            if (field_names.includes(attr)) attrs[attr] = 1;
        });

        const results = await this.find(query, attrs);
        if (results?.length === 1) {
            log_debug(LOG_ENTITY, `read_property query:${JSON.stringify(query)},result:${JSON.stringify(results[0])}`);
            return { code: SUCCESS, data: results[0] };
        }
        return { code: NOT_FOUND, err: ['_id'] };
    }

    /**
     * Read entity with ref conversion and links.
     * @param {string} _id - Entity ID
     * @param {string} attr_names - Comma-separated attribute names
     * @param {string} view - View filter
     * @returns {Object} Result with code and data
     */
    async read_entity(_id, attr_names, view) {
        const query = oid_query(_id);
        if (!query) {
            log_err('read_entity invalid id', { _id });
            return { code: INVALID_PARAMS, err: ['_id'] };
        }

        if (!attr_names) {
            log_err('read_entity invalid attr_names', { attr_names });
            return { code: INVALID_PARAMS, err: ['attr_names'] };
        }

        const property_fields = this.filter_fields_by_view(this.meta.property_fields, view);
        const { attrs, ref_fields, link_fields } = extract_field_info(
            this.meta.fields_map,
            attr_names,
            property_fields.map(f => f.name)
        );

        const results = await this.find(query, attrs);
        if (results?.length !== 1) {
            return { code: NOT_FOUND, err: ['_id'] };
        }

        const after_err = await run_hook(this.meta.after_read, 'after_read', _id, this, attr_names, results[0]);
        if (after_err) return after_err;

        const with_links = await this.read_link_attrs(results, link_fields);
        const converted = await this.convert_ref_attrs(with_links, ref_fields);

        if (converted?.length === 1) {
            log_debug(LOG_ENTITY, `read_entity query:${JSON.stringify(query)},result:${JSON.stringify(converted[0])}`);
            return { code: SUCCESS, data: converted[0] };
        }
        return { code: NOT_FOUND, err: ['_id'] };
    }

    /**
     * Delete entities by ID array.
     * @param {string[]} id_array - Entity IDs
     * @returns {Object} Result with code
     */
    async delete_entity(id_array) {
        const query = oid_queries(id_array);
        if (!query) {
            log_err('delete_entity invalid ids', { id_array });
            return { code: INVALID_PARAMS, err: ['ids'] };
        }

        const before_err = await run_hook(this.meta.before_delete, 'before_delete', this, id_array);
        if (before_err) return before_err;

        if (this.meta.delete) {
            const delete_err = await run_hook(this.meta.delete, 'delete', this, id_array);
            if (delete_err) return delete_err;
        } else {
            // Check references
            const refs = await this.check_refer_entity(id_array);
            if (refs.length > 0) {
                const unique_refs = [...new Set(refs)];
                log_err('has references', { refs: unique_refs });
                return { code: HAS_REF, err: unique_refs };
            }

            const result = await this.delete(query);
            if (result.ok !== 1) {
                log_err('delete failed', { query, result });
                return { code: ERROR, err: 'delete record is failed' };
            }

            // Cascade delete
            for (const ref_by_meta of this.meta.ref_by_metas) {
                const ref_fields = ref_by_meta.ref_fields.filter(f => f.ref === this.meta.collection);
                for (const field of ref_fields) {
                    if (field.delete === DELETE_MODE.cascade) {
                        const ref_entity = new Entity(ref_by_meta);
                        await ref_entity.delete_refer_entity(field.name, id_array);
                    }
                }
            }
        }

        const after_err = await run_hook(this.meta.after_delete, 'after_delete', this, id_array);
        if (after_err) return after_err;

        return { code: SUCCESS };
    }

    /**
     * Build primary key query.
     * @param {Object} param_obj - Parameters
     * @returns {Object|null} Query object or null
     */
    primary_key_query(param_obj) {
        if (!required_params(param_obj, this.meta.primary_keys)) return null;

        const { obj, error_field_names } = convert_type(param_obj, this.meta.primary_key_fields);
        if (error_field_names.length > 0) return null;

        return this.meta.primary_keys.reduce((q, key) => ({ ...q, [key]: obj[key] }), {});
    }

    /** Count by primary key. */
    count_by_primary_keys(obj) {
        return this.count(this.primary_key_query(obj));
    }

    // Database operations (delegate to db)
    create(obj) { return this.db.create(this.meta.collection, obj); }
    update(query, obj) { return this.db.update(this.meta.collection, query, obj); }
    delete(query) { return this.db.delete(this.meta.collection, query); }
    find(query, attr) { return this.db.find(this.meta.collection, query, attr); }
    find_one(query, attr) { return this.db.find_one(this.meta.collection, query, attr); }
    find_sort(query, sort, attr) { return this.db.find_sort(this.meta.collection, query, sort, attr); }
    find_page(query, sort, page, limit, attr) { return this.db.find_page(this.meta.collection, query, sort, page, limit, attr); }
    count(query) { return this.db.count(this.meta.collection, query); }
    sum(query, field) { return this.db.sum(this.meta.collection, query, field); }
    pull(query, ele) { return this.db.pull(this.meta.collection, query, ele); }
    push(query, ele) { return this.db.push(this.meta.collection, query, ele); }
    add_to_set(query, ele) { return this.db.add_to_set(this.meta.collection, query, ele); }

    /**
     * Delete by ID (single or array).
     * @param {string|string[]} id - ID or array of IDs
     */
    delete_by_id(id) {
        const query = Array.isArray(id) ? oid_queries(id) : oid_query(id);
        return this.db.delete(this.meta.collection, query);
    }

    /**
     * Find by ref value (objectid or ref_label).
     * @param {*} value - Ref value
     * @param {Object} attr - Attributes to load
     * @param {string} ref_by_entity - Referring entity
     * @returns {Promise<Object[]>} Found entities
     */
    find_by_ref_value(value, attr, ref_by_entity) {
        let query = Array.isArray(value) ? oid_queries(value) : oid_query(value);

        if (!query) {
            const ref_label = this.meta.ref_label;
            if (Array.isArray(value)) {
                query = { [ref_label]: { $in: value } };
            } else if (value.includes(',')) {
                query = { [ref_label]: { $in: value.split(',') } };
            } else {
                query = { [ref_label]: value };
            }
        }

        return this.find(apply_ref_filter(query, this.meta.ref_filter, ref_by_entity), attr);
    }

    /**
     * Find one ref entity by field name and value.
     * @param {string} field_name - Field name
     * @param {*} value - Value
     * @param {Object} attr - Attributes to load
     * @returns {Promise<Object>} Found entity
     */
    find_one_ref_entity(field_name, value, attr) {
        const field = this.meta.fields.find(f => f.name === field_name);
        if (!field) {
            throw new Error(`field not found: ${field_name} in ${this.meta.collection}`);
        }
        if (!field.ref) {
            throw new Error(`field is not ref: ${field_name} in ${this.meta.collection}`);
        }

        const ref_meta = get_entity_meta(field.ref);
        const ref_entity = new Entity(ref_meta);
        const query = oid_query(value) || { [ref_meta.ref_label]: value };
        return ref_entity.find_one(query, attr);
    }

    /**
     * Check for referring entities.
     * @param {string[]} id_array - Entity IDs
     * @returns {Promise<string[]>} Reference descriptions
     */
    async check_refer_entity(id_array) {
        const refs = [];

        for (const ref_by_meta of this.meta.ref_by_metas) {
            const ref_entity = new Entity(ref_by_meta);
            const ref_fields = ref_by_meta.ref_fields.filter(f => f.ref === this.meta.collection);

            for (const field of ref_fields) {
                if (field.delete === DELETE_MODE.keep) continue;

                const attr = ref_by_meta.ref_label ? { [ref_by_meta.ref_label]: 1 } : {};
                const entities = await ref_entity.get_refer_entities(field.name, id_array, attr);

                if (!entities?.length) continue;

                if (field.delete === DELETE_MODE.cascade) {
                    const cascade_refs = await ref_entity.check_refer_entity(entities.map(o => `${o._id}`));
                    if (cascade_refs?.length) refs.push(...cascade_refs);
                } else {
                    const label_key = ref_by_meta.ref_label || '_id';
                    refs.push(...entities.map(o => `${this.meta.collection}<-${ref_by_meta.collection}:${o[label_key]}`));
                }
            }
        }
        return refs;
    }

    /** Get entities referring to given IDs. */
    async get_refer_entities(field_name, id_array, attr) {
        return this.find({ [field_name]: { $in: id_array } }, attr);
    }

    /** Delete entities referring to given IDs. */
    async delete_refer_entity(field_name, id_array) {
        const entities = await this.get_refer_entities(field_name, id_array, {});
        await this.delete_entity(entities.map(o => `${o._id}`));
    }

    /**
     * Convert ref objectids to ref_labels.
     * @param {Object[]} elements - Elements to convert
     * @param {Object[]} ref_fields - Ref fields configuration
     * @returns {Promise<Object[]>} Converted elements
     */
    async convert_ref_attrs(elements, ref_fields = this.meta.ref_fields) {
        if (!elements?.length || !ref_fields?.length) return elements;

        for (const field of ref_fields) {
            // Collect all IDs
            let ids = [];
            for (const obj of elements) {
                const value = obj[field.name];
                if (Array.isArray(value)) ids.push(...value);
                else if (value) ids.push(value);
            }
            ids = unique(ids);

            // Get labels
            const ref_meta = get_entity_meta(field.ref);
            const ref_entity = new Entity(ref_meta);
            const labels = await ref_entity.get_ref_labels(ids);
            const label_map = map_array_to_obj(labels, '_id', ref_meta.ref_label);

            // Apply labels
            for (const obj of elements) {
                const value = obj[field.name];
                obj[`${field.name}_id`] = value;
                obj[field.name] = Array.isArray(value)
                    ? value.map(v => label_map[v])
                    : (value ? label_map[value] : value);
            }
        }
        return elements;
    }

    /**
     * Read link attributes.
     * @param {Object[]} elements - Elements to process
     * @param {Object[]} link_fields - Link field configurations
     * @returns {Promise<Object[]>} Elements with link data
     */
    async read_link_attrs(elements, link_fields) {
        if (!elements?.length || !link_fields?.length) return elements;

        // Group by linked entity
        const entity_info = link_fields.reduce((acc, field) => {
            const link_field = this.meta.fields_map[field.link];
            const entity = link_field.ref;
            if (!acc[entity]) acc[entity] = { attrs: [], filters: [] };
            acc[entity].attrs.push(field.name);
            if (!acc[entity].filters.includes(link_field.name)) {
                acc[entity].filters.push(link_field.name);
            }
            return acc;
        }, {});

        for (const [entity_name, { attrs, filters }] of Object.entries(entity_info)) {
            const meta = get_entity_meta(entity_name);
            const entity = new Entity(meta);

            // Collect IDs
            const ids = unique(elements.flatMap(o => filters.map(f => o[f])).filter(Boolean));
            const query = oid_queries(ids);

            // Build attrs and ref_fields
            const attr_obj = {};
            const ref_fields = [];
            for (const attr of attrs) {
                attr_obj[attr] = 1;
                const field = meta.fields_map[attr];
                if (!field.link && field.ref) ref_fields.push(field);
            }

            const items = await entity.find(query, attr_obj);
            if (!items?.length) continue;

            await entity.convert_ref_attrs(items, ref_fields);

            // Merge link data
            for (let i = 0; i < elements.length; i++) {
                for (const filter of filters) {
                    const id = elements[i][filter];
                    const link_item = items.find(o => `${o._id}` === `${id}`);
                    if (link_item) {
                        const { _id, ...data } = link_item;
                        elements[i] = { ...elements[i], ...data };
                    }
                }
            }
        }
        return elements;
    }

    /**
     * Get ref labels with filter.
     * @param {string} ref_by_entity - Referring entity
     * @param {string} client_query - Client query string
     * @returns {Promise<Object[]>} Filtered labels
     */
    get_filtered_ref_labels(ref_by_entity, client_query) {
        let query = {};

        if (this.meta.user_field) {
            query[this.meta.user_field] = get_session_user_id();
        }

        // Parse client query
        let search_query = {};
        if (client_query?.trim() && this.meta.search_fields?.length) {
            for (const part of client_query.split(',')) {
                const [field_name, value] = part.split(':');
                if (field_name && value) {
                    const field = this.meta.search_fields.find(f => f.name === field_name);
                    if (field) {
                        search_query = parse_search_value(field_name, field.type, value);
                    }
                }
            }
        }

        query = apply_ref_filter(query, this.meta.ref_filter, ref_by_entity);
        const ref_label = this.meta.ref_label;
        return this.find_sort({ ...search_query, ...query }, { [ref_label]: 1 }, { [ref_label]: 1 });
    }

    /** Get ref labels by ID array. */
    get_ref_labels(id_array) {
        return this.find(oid_queries(id_array), { [this.meta.ref_label]: 1 });
    }

    /** Find by objectid. */
    find_by_oid(id, attr) {
        const query = oid_query(id);
        return query ? this.find_one(query, attr) : null;
    }

    // Proxy methods for oid utilities
    oid_query(_id) { return oid_query(_id); }
    oid_queries(_ids) { return oid_queries(_ids); }
}

module.exports = { Entity };
