const { SUCCESS, ERROR, NO_PARAMS, INVALID_PARAMS, DUPLICATE_KEY, NOT_FOUND, REF_NOT_FOUND, REF_NOT_UNIQUE, HAS_REF } = require('../http/code');
const { validate_required_fields, has_value } = require('../core/validate');
const { required_params } = require('../http/params');
const { convert_type, convert_update_type, get_type } = require('../core/type');
const { get_entity_meta } = require('../core/meta');
const { unique, map_array_to_obj } = require('../core/array');
const { LOG_ENTITY, get_db, oid_query, oid_queries, is_log_debug, is_log_error, log_debug, log_error, get_session_userid } = require('./db');

/**
 * Convert search value type, if there is error, keep it
 * @param {field type} type_name 
 * @param {search value} search_value 
 * @returns 
 */
const convert_search_value_by_type = (type_name, search_value) => {
    const type = get_type(type_name);
    const { value, err } = type.convert(search_value);
    if (err) {
        return search_value;
    } else {
        return value;
    }
}

/**
 * Create search object based on the field type and value
 * @param {field name} name 
 * @param {field type name} type_name 
 * @param {search value} search_value 
 * @returns 
 */
const parse_search_value = function (name, type_name, search_value) {
    search_value = search_value + "";
    if (search_value.startsWith(">=")) {
        const value = search_value.substring(2);
        return { [name]: { "$gte": convert_search_value_by_type(type_name, value) } };
    } else if (search_value.startsWith("<=")) {
        const value = search_value.substring(2);
        return { [name]: { "$lte": convert_search_value_by_type(type_name, value) } };
    } else if (search_value.startsWith(">")) {
        const value = search_value.substring(1);
        return { [name]: { "$gt": convert_search_value_by_type(type_name, value) } };
    } else if (search_value.startsWith("<")) {
        const value = search_value.substring(1);
        return { [name]: { "$lt": convert_search_value_by_type(type_name, value) } };
    } else if (search_value.includes(",")) {
        const values = search_value.split(",").map(v => convert_search_value_by_type(type_name, v));
        return { [name]: { "$in": values } };
    } else if (type_name === "array") {
        return { [name]: { "$all": [search_value] } };
    } else {
        let value = convert_search_value_by_type(type_name, search_value);
        if (typeof value === "string") {
            value = new RegExp(value, 'i');
        }
        return { [name]: value }
    }
};

class Entity {
    /**
     * @param {entity meta obj} meta 
     */
    constructor(meta) {
        this.meta = meta;
        this.db = get_db();
    }

    /**
     * validate the ref value, if success, return code:SUCCESS
     * and if the value is ref_label then convert ref_label to objectid
     * @param {param object} param_obj 
     * @returns code and err
     */
    async validate_ref(param_obj) {
        const ref_fields = this.meta.ref_fields;
        if (ref_fields) {
            for (let i = 0; i < ref_fields.length; i++) {
                const field = ref_fields[i];
                const value = param_obj[field.name];
                const ref_entity = new Entity(get_entity_meta(field.ref));

                if (Array.isArray(value)) {
                    const array = [];
                    for (let j = 0; j < value.length; j++) {
                        const v = value[j];
                        const ref_entities = await ref_entity.find_by_ref_value(v, { "_id": 1 });

                        if (ref_entities.length == 0) {
                            return { code: REF_NOT_FOUND, err: [field.name] };
                        } else if (ref_entities.length > 1) {
                            return { code: REF_NOT_UNIQUE, err: [field.name] };
                        } else if (ref_entities.length == 1) {
                            array.push(ref_entities[0]["_id"] + "");
                        }
                    }
                    param_obj[field.name] = array;

                } else if (has_value(value)) {
                    const ref_entities = await ref_entity.find_by_ref_value(value, { "_id": 1 });

                    if (ref_entities.length == 0) {
                        return { code: REF_NOT_FOUND, err: [field.name] };
                    } else if (ref_entities.length > 1) {
                        return { code: REF_NOT_UNIQUE, err: [field.name] };
                    } else if (ref_entities.length == 1) {
                        param_obj[field.name] = ref_entities[0]["_id"] + "";
                    }
                }
            }
        }
        return { code: SUCCESS };
    }

    /**
     * Create search query object using params from client side
     * @param {search field value from client side} param_obj 
     */
    async get_search_query(param_obj) {
        const search_fields = this.meta.search_fields;
        if (search_fields && search_fields.length > 0) {
            const refer_field_names = this.meta.ref_fields.map(f => f.name);
            const query = {};
            const and_array = [];
            for (let i = 0; i < search_fields.length; i++) {
                const search_field = search_fields[i];
                const value = param_obj[search_field.name];
                if (has_value(value)) {
                    if (refer_field_names.includes(search_field.name)) {
                        //refer field
                        const refer_entity = new Entity(get_entity_meta(search_field.ref));
                        const oids = await refer_entity.find_by_ref_value(value, { _id: 1 });
                        if (oids.length > 0) {
                            and_array.push({ [search_field.name]: { "$all": oids.map(o => o._id + "") } });
                        }
                    } else {
                        and_array.push(parse_search_value(search_field.name, search_field.type, value));
                    }
                }
            }

            if (and_array.length > 0) {
                query["$and"] = and_array;

                if (is_log_debug()) {
                    log_debug(LOG_ENTITY, "search query:" + JSON.stringify(query));
                }

                return query;
            } else {
                return {};
            }
        } else {
            return null;
        }
    }

    /**
     * if query is set, it will use this as search query, otherwise create search object from param_obj
     * @param {query object to search} query 
     * @param {search object and all the search attributes object} param_obj 
     * @returns 
     */
    async list_entity(query_params, query, param_obj) {
        const error_required_field_names = validate_required_fields(query_params, ["attr_names", "sort_by", "desc"]);
        if (error_required_field_names.length > 0) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "error required fields:" + JSON.stringify(error_required_field_names));
            }

            return { code: NO_PARAMS, err: error_required_field_names };
        }

        const { attr_names, page, limit, sort_by, desc } = query_params;
        const sort = {};
        const sorts = sort_by.split(",");
        const descs = desc.split(",");
        sorts.forEach(function (value, index) {
            sort[value] = descs[index] === "false" ? 1 : -1;
        });

        const list_field_names = this.meta.list_fields.map(f => f.name);
        const attrs = {};
        attr_names.split(",").forEach(function (attr) {
            if (list_field_names.includes(attr)) {
                attrs[attr] = 1;
            }
        });

        let page_int = parseInt(page);
        page_int = isNaN(page_int) || page_int <= 0 ? 1 : page_int;
        let page_limit = parseInt(limit);
        page_limit = isNaN(page_limit) || page_limit <= 0 ? 10 : page_limit;

        const search_query = query ? query : await this.get_search_query(param_obj);
        if (!search_query) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "no search query is set for param:" + JSON.stringify(param_obj));
            }

            return { code: INVALID_PARAMS, err: "no search query is set" };
        }

        const total = await this.count(search_query);
        const list = await this.find_page(search_query, sort, page_int, page_limit, attrs);
        const data = await this.convert_ref_attrs(list);

        if (is_log_debug()) {
            log_debug(LOG_ENTITY, "total:" + total + ",data:" + JSON.stringify(data));
        }

        return { code: SUCCESS, total: total, data: data };
    }

    /**
    * Validate the param object and invoke the logic to save it to db
    * @param {param obj from user input} param_obj
    * @returns object with code and err
    */
    async create_entity(param_obj) {
        return this._create_entity(param_obj, this.meta.create_fields);
    }

    /**
    * Validate the param object and invoke the logic to clone the entity and sae it to db
    * @param {param obj from user input} param_obj
    * @returns object with code and err
    */
    async clone_entity(param_obj) {
        return this._create_entity(param_obj, this.meta.clone_fields);
    }

    /**
     * Validate the param object and invoke the logic to save it to db
     * @param {param obj from user input} param_obj 
     * @param {fields used to convert value} fields
     * @returns object with code and err
     */
    async _create_entity(param_obj, fields) {
        const { obj, error_field_names } = convert_type(param_obj, fields);
        if (error_field_names.length > 0) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "error fields:" + JSON.stringify(error_field_names));
            }

            return { code: INVALID_PARAMS, err: error_field_names };
        }

        if (this.meta.before_create) {
            const { code, err } = await this.meta.before_create(this, obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "before_create error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        const error_required_field_names = validate_required_fields(obj, this.meta.required_field_names);
        if (error_required_field_names.length > 0) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "error required fields:" + JSON.stringify(error_required_field_names));
            }
            return { code: NO_PARAMS, err: error_required_field_names };
        }

        const entity_count = await this.count_by_primary_keys(obj);
        if (entity_count > 0) {
            return { code: DUPLICATE_KEY, err: "entity already exist in db" };
        }

        if (this.meta.ref_fields) {
            const { code, err } = await this.validate_ref(obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "validate_ref error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        if (this.meta.create) {
            const { code, err } = await this.meta.create(this, obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "create error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        } else {
            const db_obj = await this.create(obj);
            if (!db_obj["_id"]) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "create error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: ERROR, err: "creating record is failed" };
            }
        }

        if (this.meta.after_create) {
            const { code, err } = await this.meta.after_create(this, obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "after_create error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        return { code: SUCCESS };
    }

    /**
     * Validate the param object and invoke the logic to update entity
     * @param {object id of the entity} _id object id of the entity, if it is null, then use primary key
     * @param {param object from user input} param_obj 
     * 
     */
    async update_entity(_id, param_obj) {
        const { obj, error_field_names } = convert_update_type(param_obj, this.meta.update_fields);
        if (error_field_names.length > 0) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "update_entity error fields:" + JSON.stringify(error_field_names));
            }
            return { code: INVALID_PARAMS, err: error_field_names };
        }

        if (this.meta.before_update) {
            const { code, err } = await this.meta.before_update(_id, this, obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "before_update error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        const query = _id ? oid_query(_id) : this.primary_key_query(obj);
        if (query == null) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "error query _id:" + _id + ", with obj:" + JSON.stringify(obj));
            }
            return { code: INVALID_PARAMS, err: _id ? ["_id"] : this.meta.primary_keys };
        }

        const total = await this.count(query);
        if (total != 1) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "update_entity not found with query:" + JSON.stringify(query) + ", and total:" + total);
            }
            return { code: NOT_FOUND, err: _id ? ["_id"] : this.meta.primary_keys };
        }

        if (this.meta.ref_fields) {
            const { code, err } = await this.validate_ref(obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "update_entity validate_ref error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        if (this.meta.update) {
            const { code, err } = await this.meta.update(_id, this, obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "meta update error:" + JSON.stringify(err) + ", with code:" + code + ",_id:" + _id + ",obj:" + JSON.stringify(obj));
                }
                return { code: code, err: err };
            }
        } else {
            const result = await this.update(query, obj);
            if (result.ok != 1) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "update record is failed with query:" + JSON.stringify(query) + ",obj:" + JSON.stringify(obj) + ",result:" + JSON.stringify(result));
                }
                return { code: ERROR, err: "update record is failed" };
            }
        }

        if (this.meta.after_update) {
            const { code, err } = await this.meta.after_update(_id, this, obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "after_update is failed with _id:" + JSON.stringify(_id) + ",obj:" + JSON.stringify(obj) + ",err:" + JSON.stringify(err) + ",code:" + code);
                }
                return { code: code, err: err };
            }
        }

        return { code: SUCCESS };
    }

    /**
     * Validate the param object and invoke the logic to batch update entity
     * @param {object id array of the entity} _ids
     * @param {param object from user input} param_obj 
     * 
     */
    async batch_update_entity(_ids, param_obj) {
        const { obj, error_field_names } = convert_update_type(param_obj, this.meta.update_fields);
        if (error_field_names.length > 0) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "batch_update_entity error fields:" + JSON.stringify(error_field_names));
            }
            return { code: INVALID_PARAMS, err: error_field_names };
        }

        const query = oid_queries(_ids);
        if (query == null) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "batch_update_entity invalid ids:" + JSON.stringify(_ids));
            }
            return { code: INVALID_PARAMS, err: ["_ids"] };
        }

        if (this.meta.ref_fields) {
            const { code, err } = await this.validate_ref(obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "batch_update_entity validate_ref error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        if (this.meta.batch_update) {
            const { code, err } = await this.meta.batch_update(_ids, this, obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "batch_update_entity batch_update error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        } else {
            const result = await this.update(query, obj);
            if (result.ok != 1) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "batch_update_entity update record is failed with query:" + JSON.stringify(query) + ",obj:" + JSON.stringify(obj) + ",result:" + JSON.stringify(result));
                }
                return { code: ERROR, err: "batch update record is failed" };
            }
        }

        if (this.meta.after_batch_update) {
            const { code, err } = await this.meta.after_batch_update(_ids, this, obj);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "after_batch_update  error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        return { code: SUCCESS };
    }

    /**
     * Validate the param object and invoke the logic to read entity
     * this is used for update entity
     * @param {object id of the entity} _id object id of the entity
     * @param {attr names to retrieve} attr_names
     *
     */
    async read_entity(_id, attr_names) {
        const query = oid_query(_id);
        if (query == null) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "read_entity invalid id:" + _id);
            }
            return { code: INVALID_PARAMS, err: ["_id"] };
        }

        const field_names = this.meta.property_fields.map(f => f.name);
        const attrs = {};
        attr_names.split(",").forEach(function (attr) {
            if (field_names.includes(attr)) {
                attrs[attr] = 1;
            }
        });

        const results = await this.find(query, attrs);
        if (results && results.length == 1) {
            if (is_log_debug()) {
                log_debug("read entity with query:" + JSON.stringify(query) + ",attrs:" + JSON.stringify(attrs) + ",result:" + JSON.stringify(results));
            }
            return { code: SUCCESS, data: results[0] };
        } else {
            return { code: NOT_FOUND, err: ["_id"] };
        }
    }

    /**
   * Validate the param object and invoke the logic to read entity properties
   * this is used for update entity
   * @param {object id of the entity} _id object id of the entity
   * @param {attr names to retrieve} attr_names
   *
   */
    async read_entity_properties(_id, attr_names) {
        const query = oid_query(_id);
        if (query == null) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "read_entity_properties invalid id:" + _id);
            }
            return { code: INVALID_PARAMS, err: ["_id"] };
        }

        if (!attr_names) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "read_entity_properties invalid attr_names:" + attr_names);
            }
            return { code: INVALID_PARAMS, err: ["attr_names"] };
        }

        const field_names = this.meta.property_fields.map(f => f.name);
        const attrs = {};
        attr_names.split(",").forEach(function (attr) {
            if (field_names.includes(attr)) {
                attrs[attr] = 1;
            }
        });

        const results = await this.find(query, attrs);
        if (results && results.length == 1) {
            if (this.meta.after_read) {
                const { code, err } = await this.meta.after_read(_id, this, attr_names, results[0]);
                if (err || code != SUCCESS) {
                    if (is_log_error()) {
                        log_error(LOG_ENTITY, "after_read error:" + JSON.stringify(err) + ", with code:" + code);
                    }
                    return { code: code, err: err };
                }
            }

            const converted = await this.convert_ref_attrs(results);
            if (converted && converted.length == 1) {
                if (is_log_debug()) {
                    log_debug("read_entity_properties with query:" + JSON.stringify(query) + ",attrs:" + JSON.stringify(attrs) + ",converted:" + JSON.stringify(converted));
                }
                return { code: SUCCESS, data: converted[0] };
            }
        }

        return { code: NOT_FOUND, err: ["_id"] };
    }

    /**
     * Delete the objects using id array
     * @param {array of objectid} id_array 
     */
    async delete_entity(id_array) {
        const query = oid_queries(id_array);
        if (query == null) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "delete_entity invalid id_array:" + JSON.stringify(id_array));
            }
            return { code: INVALID_PARAMS, err: ["ids"] };
        }

        if (this.meta.before_delete) {
            const { code, err } = await this.meta.before_delete(this, id_array);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "before_delete error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        const has_refer_by_array = [];
        for (let i = 0; i < this.meta.ref_by_metas.length; i++) {
            const ref_by_meta = this.meta.ref_by_metas[i];
            const refer_by_entity = new Entity(ref_by_meta);
            for (let j = 0; j < id_array.length; j++) {
                const has_refer_by = await refer_by_entity.has_refer_entity(this.meta.collection, id_array[j]);
                if (has_refer_by) {
                    has_refer_by_array.push(id_array[j]);
                }
            }
        }

        if (has_refer_by_array.length > 0) {
            if (is_log_error()) {
                log_error(LOG_ENTITY, "has_refer_by_array:" + JSON.stringify(has_refer_by_array));
            }
            return { code: HAS_REF, err: has_refer_by_array };
        }

        if (this.meta.delete) {
            const { code, err } = await this.meta.delete(this, id_array);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "delete error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        } else {
            const result = await this.delete(query);
            if (result.ok != 1) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "delete records is failed with query:" + JSON.stringify(query) + ", result:" + JSON.stringify(result));
                }
                return { code: ERROR, err: "delete record is failed" };
            }
        }

        if (this.meta.after_delete) {
            const { code, err } = await this.meta.after_delete(this, id_array);
            if (err || code != SUCCESS) {
                if (is_log_error()) {
                    log_error(LOG_ENTITY, "after_delete error:" + JSON.stringify(err) + ", with code:" + code);
                }
                return { code: code, err: err };
            }
        }

        return { code: SUCCESS };
    }

    /**
     * Construct the primary key query object
     * @param {param object} param_obj 
     * @returns 
     */
    primary_key_query(param_obj) {
        const params = required_params(param_obj, this.meta.primary_keys);
        if (params === null) {
            return null;
        }

        const { obj, error_field_names } = convert_type(param_obj, this.meta.primary_key_fields);
        if (error_field_names.length > 0) {
            return null;
        }

        const query = {};
        this.meta.primary_keys.forEach(function (key) {
            query[key] = obj[key];
        });
        return query;
    }

    /**
     * Get the count value by primary key
     * @param {object used to create query} obj 
     * @returns the count value by primary key
     */
    count_by_primary_keys(obj) {
        return this.count(this.primary_key_query(obj));
    }

    /**
     * Insert Object to db
     * @param {inserted object} obj 
     * @returns 
     */
    create(obj) {
        return this.db.create(this.meta.collection, obj);
    }

    /**
     * Update the object, upsert:true, multi:true
     * @param {*} query 
     * @param {*} obj 
     * @returns 
     */
    update(query, obj) {
        return this.db.update(this.meta.collection, query, obj);
    }

    /**
     * Remove the records from mongodb
     * @param {query to execute delete op} query 
     * @returns 
     */
    delete(query) {
        return this.db.delete(this.meta.collection, query);
    }

    /**
     * Find the objects that are refered by other entity
     * @param {ref value} value 
     * @param {the attributes to load from db} attr 
     * @returns array of the objects that are found
     */
    find_by_ref_value(value, attr) {
        let query = Array.isArray(value) ? oid_queries(value) : oid_query(value);
        if (query == null) {
            if (Array.isArray(value)) {
                query = { [this.meta.ref_label]: { "$in": value } };
            } else {
                if (value.includes(",")) {
                    const values = value.split(",");
                    query = { [this.meta.ref_label]: { "$in": values } };
                } else {
                    query = { [this.meta.ref_label]: value };
                }
            }
        }

        if (this.meta.ref_filter) {
            query = { ...query, ...this.meta.ref_filter };
        }
        return this.find(query, attr);
    }

    /**
     * Get the ref entity by the ref value
     * @param {field name of the ref} field_name 
     * @param {the value of the field} value 
     * @param {which attrs to show} attr 
     * @returns 
     */
    find_one_ref_entity(field_name, value, attr) {
        const fields = this.meta.fields.filter(field => field.name == field_name);
        if (fields.length == 1) {
            const field = fields[0];
            if (field.ref) {
                const ref_meta = get_entity_meta(field.ref);
                const ref_entity = new Entity(ref_meta);
                let query = oid_query(value);
                if (query == null) {
                    query = { [ref_meta.ref_label]: value };
                }
                return ref_entity.find_one(query, attr);

            } else {
                throw new Error("the field:" + field_name + " is not ref field,in entity:" + this.meta.collection);
            }
        } else {
            throw new Error("not found the field by name:" + field_name + ",in entity:" + this.meta.collection);
        }
    }

    /**
     * check whether this entity has refered the entity_id value
     * @param {entity collection} entity_name 
     * @param {entity object id} entity_id 
     * @returns true if has refered
     */
    async has_refer_entity(entity_name, entity_id) {
        if (this.meta.ref_fields) {
            const fields = this.meta.ref_fields.filter(f => f.ref === entity_name);
            if (fields.length > 0) {
                for (let i = 0; i < fields.length; i++) {
                    const field = fields[i];
                    const query = { [field.name]: entity_id + "" };
                    const count = await this.count(query);
                    if (count > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Convert ref element object id to ref_label
     * @param {element of object} elements 
     * @returns 
     */
    async convert_ref_attrs(elements) {
        if (elements && this.meta.ref_fields) {
            for (let i = 0; i < this.meta.ref_fields.length; i++) {
                const ref_field = this.meta.ref_fields[i];
                let id_array = [];
                for (let j = 0; j < elements.length; j++) {
                    const obj = elements[j];
                    const value = obj[ref_field.name];
                    if (Array.isArray(value)) {
                        id_array = id_array.concat(value);
                    } else {
                        id_array.push(value);
                    }
                }
                id_array = unique(id_array);

                const ref_meta = get_entity_meta(ref_field.ref);
                const ref_entity = new Entity(ref_meta);
                const ref_labels = await ref_entity.get_ref_labels(id_array);
                const label_map_obj = map_array_to_obj(ref_labels, "_id", ref_meta.ref_label);
                for (let j = 0; j < elements.length; j++) {
                    const obj = elements[j];
                    const value = obj[ref_field.name];
                    if (Array.isArray(value)) {
                        obj[ref_field.name] = value.map(v => label_map_obj[v]);
                    } else {
                        obj[ref_field.name] = label_map_obj[value];
                    }
                }
            }
        }
        return elements;
    }

    /**
    * get ref labels of the object, use ref_filter
    * @returns 
    */
    get_filtered_ref_labels() {
        let query = {};
        if (this.meta.user_field) {
            query[this.meta.user_field] = get_session_userid();
        }
        if (this.meta.ref_filter) {
            query = { ...query, ...this.meta.ref_filter };
        }
        return this.find_sort(query, { [this.meta.ref_label]: 1 }, { [this.meta.ref_label]: 1 });
    }

    /**
     * get ref labels of the object
     * @param {id array of objectid} id_array 
     * @returns 
     */
    get_ref_labels(id_array) {
        const query = oid_queries(id_array);
        return this.find(query, { [this.meta.ref_label]: 1 });
    }

    /**
     * get entity by object id
     * @param {object id} id 
     * @param {the attributes to load from db} attr 
     */
    find_by_oid(id, attr) {
        const query = oid_query(id);
        if (query == null) {
            return null;
        }
        return this.find_one(query, attr);
    }

    /**
     * Search the db using query
     * @param {search criteria} query 
     * @param {the attributes to load from db} attr 
     * @returns 
     */
    find(query, attr) {
        return this.db.find(this.meta.collection, query, attr);
    }

    /**
     * Find one record from db
     * @param {search criteria} query 
     * @param {the attributes to load from db} attr 
     * @returns 
     */
    find_one(query, attr) {
        return this.db.find_one(this.meta.collection, query, attr);
    }

    /**
     * Find the records from db using sort to do sorting
     * @param {search criteria} query 
     * @param {sort object to sort the result} sort 
     * @param {the attributes of the object to load from db} attr 
     * @returns 
     */
    find_sort(query, sort, attr) {
        return this.db.find_sort(this.meta.collection, query, sort, attr);
    }

    /**
     * Find the page records
     * @param {search criteria} query 
     * @param {sort object to sort the results} sort 
     * @param {the page index to load} page 
     * @param {page size } limit 
     * @param {the attributes of the object to load from db} attr 
     * @returns 
     */
    find_page(query, sort, page, limit, attr) {
        return this.db.find_page(this.meta.collection, query, sort, page, limit, attr);
    }

    /**
     * The count number of the query
     * @param {search criteria} query 
     * @returns 
     */
    count(query) {
        return this.db.count(this.meta.collection, query);
    }

    /**
     * Calculate the sum value based on the field and query criteria
     * @param {search criteria} query 
     * @param {field name to calculate sum} field 
     * @returns 
     */
    sum(query, field) {
        return this.db.sum(this.meta.collection, query, field);
    }

    /**
     * Pull the object from array
     * @param {search criteria} query 
     * @param {object pulled from the array} ele 
     * @returns 
     */
    pull(query, ele) {
        return this.db.pull(this.meta.collection, query, ele);
    }

    /**
     * Push the object to array
     * @param {search criteria} query 
     * @param {object push to the array} ele 
     * @returns 
     */
    push(query, ele) {
        return this.db.push(this.meta.collection, query, ele);
    }

    /**
    * add the object to set
    * @param {search criteria} query 
    * @param {object added to the set} ele 
    * @returns 
    */
    add_to_set(query, ele) {
        return this.db.add_to_set(this.meta.collection, query, ele);
    };

    /**
     * Get the mongodb collection with this entity
     * @returns 
     */
    col() {
        return this.db.col(this.meta.collection);
    };

    /**
     * Add oid query to entity
     * @param {object id} _id 
     * @returns 
     */
    oid_query(_id) {
        return oid_query(_id);
    }

    /**
     * Object ID array 
     * @param {object id array} _ids 
     * @returns 
     */
    oid_queries(_ids) {
        return oid_queries(_ids);
    }
}

module.exports = { Entity };
