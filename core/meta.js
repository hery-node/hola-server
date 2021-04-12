const { is_undefined } = require('./validate');
const { get_type } = require('./type');

const meta_manager = {};
/**
 * create: this field can be shown in create form
 * list: this field can be shown in table list
 * search: this field can be shown in search form
 * update: if is false, in update form, it will be readonly status
 * sys: this field is used to control the user can set the value or not. sys field can only be set in the server side(before callback is good place to do this)
 * create is false, this attribute can be shown in property list but sys property can't be shown in property list 
*/
const field_attrs = ["name", "type", "required", "ref", "create", "list", "search", "update", "sys"];
const meta_attrs = ["collection", "primary_keys", "fields", "creatable", "readable", "updatable", "deleteable",
    "before_create", "after_create", "before_update", "after_update", "before_delete", "after_delete", "create", "update", "delete",
    "ref_label", "ref_filter"];

/**
 * Validate the field attributes and keep them correct(also set default value)
 * @param {entity meta} meta 
 * @param {meta attribute field} field 
 */
const validate_field = (meta, field) => {
    if (!field.name) {
        throw new Error("name attr is required for field:" + field + ", and meta:" + meta.collection);
    }

    if (field.type) {
        get_type(field.type);
    } else {
        field.type = "string";
    }

    if (meta.primary_keys.includes(field.name)) {
        field.required = true;
    }

    if (field.ref) {
        const ref_meta = meta_manager[field.ref];
        if (!ref_meta) {
            throw new Error("meta:" + meta.collection + ",field:" + field.name + " refers invalid meta:" + field.ref + "]");
        }

        if (!ref_meta.ref_label) {
            throw new Error("meta:" + meta.collection + ",field:" + field.name + " refers an meta:" + field.ref + " without ref_label]");
        }

        const ref_by_collections = ref_meta.ref_by_metas.map(m => m.collection);
        if (!ref_by_collections.includes(this.collection)) {
            ref_meta.ref_by_metas.push(meta_manager[meta.collection]);
        }
    }

    const keys = Object.keys(field);
    keys.forEach(key => {
        if (!field_attrs.includes(key)) {
            throw new Error("The attribute [" + key + "] isn't supported now for field:" + field + " and meta:" + meta.collection);
        }
    });
}

/**
 * Validate all the fields
 * @param {entity meta} meta 
 * @param {meta fields} fields 
 */
const validate_fields = (meta, fields) => {
    const field_names = [];
    fields.forEach(field => {
        validate_field(meta, field);
        if (field_names.includes(field.name)) {
            throw new Error("Duplicate field defined [" + field + "] for meta:" + meta.collection);
        } else {
            field_names.push(field.name);
        }
    });

    return true;
}

/**
 * Validate all the metas information after loading all the meta information
 */
const validate_all_metas = () => {
    const metas = Object.keys(meta_manager);
    metas.forEach(meta_name => {
        const meta = meta_manager[meta_name];
        meta.validate_meta_info();
    });
}

/**
 * Set function name for the entity 
 * @param {entity meta} entity_meta 
 * @param {cb function name} cb_name 
 * @param {callback function} cb 
 */
const set_callback = (entity_meta, cb_name, cb) => {
    if (cb) {
        if (cb instanceof Function) {
            entity_meta[cb_name] = cb;
        } else {
            throw new Error("callback [" + cb_name + "] configured for meta:" + meta.collection + " isn't function object");
        }
    }
}

/**
 * Get entity meta object
 * @param {meta collection name} collection 
 * @returns 
 */
const get_entity_meta = (collection) => {
    return meta_manager[collection];
}

/**
 * Get all the meta name
 * @returns 
 */
const get_all_metas = () => {
    return Object.keys(meta_manager);
}

/**
 * Wrap the meta info from user side:
 * 1) validate the meta structure and keep it is valid
 * 2) set the default values of the meta
 */
class EntityMeta {

    constructor(meta) {
        this.meta = meta;
        this.collection = this.meta.collection;

        this.creatable = is_undefined(meta.creatable) ? false : meta.creatable;
        this.readable = is_undefined(meta.readable) ? false : meta.readable;
        this.updatable = is_undefined(meta.updatable) ? false : meta.updatable;
        this.deleteable = is_undefined(meta.deleteable) ? false : meta.deleteable;
        this.importable = is_undefined(meta.importable) ? false : meta.importable;
        this.exportable = is_undefined(meta.exportable) ? false : meta.exportable;
        this.editable = this.creatable || this.updatable;

        this.ref_label = this.meta.ref_label;
        this.ref_filter = this.meta.ref_filter;
        this.ref_fields = this.meta.fields.filter(field => field.ref);
        this.ref_by_metas = [];

        this.fields = meta.fields;
        this.primary_keys = meta.primary_keys;
        this.field_names = this.fields.map(field => field.name);

        this.property_fields = this.fields.filter(field => field.sys != true);
        this.create_fields = this.fields.filter(field => field.create != false && field.sys != true);
        this.update_fields = this.fields.filter(field => field.create != false && field.update != false && field.sys != true);
        this.search_fields = this.fields.filter(field => field.search != false && field.sys != true);
        this.list_fields = this.fields.filter(field => field.list != false && field.sys != true);
        this.primary_key_fields = this.fields.filter(field => meta.primary_keys.includes(field.name));
        this.required_field_names = this.fields.filter(field => field.required == true || this.primary_keys.includes(field.name)).map(field => field.name);

        this.file_fields = meta.fields.filter(f => f.type === 'file');
        this.upload_fields = this.file_fields && this.file_fields.length > 0 ? this.file_fields.map(f => ({ name: f.name, maxCount: f.max ? f.max : 1 })) : [];

        set_callback(this, "before_create", meta.before_create);
        set_callback(this, "before_update", meta.before_update);
        set_callback(this, "before_delete", meta.before_delete);
        set_callback(this, "after_create", meta.after_create);
        set_callback(this, "after_update", meta.after_update);
        set_callback(this, "after_delete", meta.after_delete);
        set_callback(this, "create", meta.create);
        set_callback(this, "update", meta.update);
        set_callback(this, "delete", meta.delete);

        if (meta_manager[meta.collection]) {
            throw new Error("Duplicate meta info:" + this.collection);
        } else {
            meta_manager[meta.collection] = this;
        }
    }

    validate_meta_info() {
        if (!this.collection) {
            throw new Error("no collection defined for meta:" + this.meta);
        }

        const keys = Object.keys(this.meta);
        keys.forEach(key => {
            if (!meta_attrs.includes(key)) {
                throw new Error("The attribute [" + key + "] isn't supported now for meta:" + this.meta.collection);
            }
        });

        if (!this.primary_keys) {
            throw new Error("no primary_keys configured for meta:" + this.collection);
        } else if (!Array.isArray(this.primary_keys)) {
            throw new Error("primary_keys of meta [" + this.collection + "] should be array");
        } else {
            this.primary_keys.forEach(key => {
                if (!this.field_names.includes(key)) {
                    throw new Error("wrong primary_key " + key + " configured in meta:" + this.collection);
                }
            });
        }

        if (this.ref_label && !this.field_names.includes(this.ref_label)) {
            throw new Error("ref_label [" + this.ref_label + "] configured in meta:" + this.collection + " not found in field names");
        }

        if (this.ref_filter && (this.ref_filter.constructor != Object)) {
            throw new Error("ref_filter [" + this.ref_filter + "] configured in meta:" + this.collection + " should be object");
        }

        return validate_fields(this.meta, this.fields);
    }
}

module.exports = { EntityMeta, validate_all_metas, get_entity_meta, get_all_metas }
