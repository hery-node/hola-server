const { is_undefined } = require('./validate');
const { get_type } = require('./type');
const { is_valid_role } = require('../setting');

const meta_manager = {};
/**
 * create: this field can be shown in create form
 * list: this field can be shown in table list
 * search: this field can be shown in search form
 * update: if is false, in update form, it will be readonly status
 * delete: delete is only used for ref field, it decide when the ref entity will be deleted, how to handle this entity,no value, will not let the refered entity be deleted, keep: keep this entity(no data consistency), cascade: also delete this entity also,
 * sys: this field is used to control the user can set the value or not. sys field can only be set in the server side(before callback is good place to do this)
 * create is false, this attribute can be shown in property list but sys property can't be shown in property list 
 * secure: secure properties will not be read by client, this is useful for password
 * group: this is used to control user sharing entities, this means the entity is shared by user group, this is only valid for user field
 * 
 * routes: configure customer defined routes
 * link property: field link property link to entity field and the field should ref to an entity.
 * and the field name should be the same with the ref entity field name and shouldn't make as required and no other property
 * 
 * 
*/
const field_attrs = ["name", "type", "required", "ref", "link", "delete", "create", "list", "search", "update", "clone", "sys", "secure", "group"];
const meta_attrs = ["collection", "roles", "primary_keys", "fields", "creatable", "readable", "updatable", "deleteable", "cloneable", "after_read",
    "before_create", "after_create", "before_clone", "after_clone", "before_update", "after_update", "before_delete", "after_delete", "create", "clone", "update", "batch_update", "after_batch_update", "delete",
    "ref_label", "ref_filter", "route", "user_field"];

const DELETE_MODE = Object.freeze({
    all: ["keep", "cascade"],
    keep: "keep",
    cascade: "cascade"
});

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
        if (!field.link) {
            field.type = "string"
        }
    }

    if (meta.primary_keys.includes(field.name)) {
        field.required = true;
    }

    if (field.ref && !field.link) {
        const ref_meta = meta_manager[field.ref];
        if (!ref_meta) {
            throw new Error("meta:" + meta.collection + ",field:" + field.name + " refers invalid meta:" + field.ref + "]");
        }

        if (!ref_meta.ref_label) {
            throw new Error("meta:" + meta.collection + ",field:" + field.name + " refers an meta:" + field.ref + " without ref_label");
        }

        const ref_by_collections = ref_meta.ref_by_metas.map(m => m.collection);
        if (!ref_by_collections.includes(this.collection)) {
            ref_meta.ref_by_metas.push(meta_manager[meta.collection]);
        }
    }

    if (field.delete) {
        if (!field.ref) {
            throw new Error("meta:" + meta.collection + ",field:" + field.name + " doesn't let define delete in none ref field.");
        }

        const all_modes = DELETE_MODE.all;
        if (!all_modes.includes(field.delete)) {
            throw new Error("meta:" + meta.collection + ",field:" + field.name + " has invalid delete:" + field.delete + ", valid values:" + JSON.stringify(all_modes));
        }
    }

    if (field.link) {
        const keys = Object.keys(field);
        const support_keys_for_links = ["name", "link", "list"]
        keys.forEach(key => {
            if (!support_keys_for_links.includes(key)) {
                throw new Error("Link field just supports name, link,list property. The attribute [" + key + "] isn't supported for LINK field:" + JSON.stringify(field) + " and meta:" + meta.collection);
            }
        });
    }

    const keys = Object.keys(field);
    keys.forEach(key => {
        if (!field_attrs.includes(key)) {
            throw new Error("The attribute [" + key + "] isn't supported now for field:" + JSON.stringify(field) + " and meta:" + meta.collection);
        }
    });
}

/**
 * Validate all the fields
 * @param {entity meta} meta 
 * @param {meta fields} fields 
 */
const validate_fields = (meta, fields) => {
    const fields_map = fields.reduce((map, field) => { map[field.name] = field; return map; }, {});
    const check_duplicate_field_names = [];

    fields.forEach(field => {
        validate_field(meta, field);
        if (check_duplicate_field_names.includes(field.name)) {
            throw new Error("Duplicate field defined [" + JSON.stringify(field) + "] for meta:" + meta.collection);
        } else {
            check_duplicate_field_names.push(field.name);
        }
        if (field.link) {
            const link_field = fields_map[field.link];
            if (!link_field) {
                throw new Error("link field [" + JSON.stringify(field) + "] should link to one field defined in meta:" + meta.collection);
            } else {
                if (!link_field.ref) {
                    throw new Error("link field [" + JSON.stringify(field) + "] link to field [" + JSON.stringify(link_field) + "] should ref to one entity in meta:" + meta.collection);
                }
                const entity = get_entity_meta(link_field.ref);
                const link_entity_field = entity.fields_map[field.name];
                if (!link_entity_field) {
                    throw new Error("link field [" + JSON.stringify(field) + "] should link to one field defined in meta:" + entity.collection);
                }

                //set type to link field type
                field.type = link_entity_field.type;
                field.required = false;
                field.create = false;
                field.search = false;
                field.update = false;
                field.clone = false;
                field.delete = "cascade";

                if (link_entity_field.ref) {
                    field.ref = link_entity_field.ref;
                }
            }
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
        this.roles = this.meta.roles;

        this.creatable = is_undefined(meta.creatable) ? false : meta.creatable;
        this.readable = is_undefined(meta.readable) ? false : meta.readable;
        this.updatable = is_undefined(meta.updatable) ? false : meta.updatable;
        this.deleteable = is_undefined(meta.deleteable) ? false : meta.deleteable;
        this.cloneable = is_undefined(meta.cloneable) ? false : meta.cloneable;
        this.importable = is_undefined(meta.importable) ? false : meta.importable;
        this.exportable = is_undefined(meta.exportable) ? false : meta.exportable;
        this.editable = this.creatable || this.updatable;

        this.ref_label = this.meta.ref_label;
        this.ref_filter = this.meta.ref_filter;
        this.ref_fields = this.meta.fields.filter(field => field.ref);
        this.ref_by_metas = [];

        this.link_fields = this.meta.fields.filter(field => field.link);
        this.fields_map = meta.fields.reduce((map, field) => { map[field.name] = field; return map; }, {});
        this.fields = meta.fields;
        this.primary_keys = meta.primary_keys;
        this.field_names = this.fields.map(field => field.name);
        this.user_field = meta.user_field;

        this.property_fields = this.fields.filter(field => field.sys != true && field.secure != true);
        this.create_fields = this.fields.filter(field => field.create != false && field.sys != true);
        this.update_fields = this.fields.filter(field => field.create != false && field.update != false && field.sys != true);
        this.search_fields = this.fields.filter(field => field.search != false && field.sys != true);
        this.clone_fields = this.fields.filter(field => field.clone != false && field.sys != true);
        this.list_fields = this.fields.filter(field => field.list != false && field.sys != true && field.secure != true);
        this.primary_key_fields = this.fields.filter(field => meta.primary_keys.includes(field.name));
        this.required_field_names = this.fields.filter(field => field.required == true || this.primary_keys.includes(field.name)).map(field => field.name);

        this.file_fields = meta.fields.filter(f => f.type === 'file');
        this.upload_fields = this.file_fields && this.file_fields.length > 0 ? this.file_fields.map(f => ({ name: f.name })) : [];

        set_callback(this, "after_read", meta.after_read);
        set_callback(this, "before_create", meta.before_create);
        set_callback(this, "before_clone", meta.before_clone);
        set_callback(this, "before_update", meta.before_update);
        set_callback(this, "before_delete", meta.before_delete);
        set_callback(this, "after_create", meta.after_create);
        set_callback(this, "after_clone", meta.after_clone);
        set_callback(this, "after_update", meta.after_update);
        set_callback(this, "after_delete", meta.after_delete);
        set_callback(this, "create", meta.create);
        set_callback(this, "clone", meta.clone);
        set_callback(this, "update", meta.update);
        set_callback(this, "batch_update", meta.batch_update);
        set_callback(this, "after_batch_update", meta.after_batch_update);
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

        if (this.roles) {
            if (!Array.isArray(this.roles)) {
                throw new Error("roles of meta [" + this.collection + "] should be array");
            }
            this.roles.forEach(role => {
                const role_config = role.split(":");
                const role_name = role_config[0];
                if (!is_valid_role(role_name)) {
                    throw new Error("role [" + role_name + "] not defined in setting");
                }
            });
        }

        if (this.ref_label && !this.field_names.includes(this.ref_label)) {
            throw new Error("ref_label [" + this.ref_label + "] configured in meta:" + this.collection + " not found in field names");
        }

        if (this.user_field && !this.field_names.includes(this.user_field)) {
            throw new Error("user_field [" + this.user_field + "] configured in meta:" + this.collection + " not found in field names");
        }

        if (this.ref_filter && (this.ref_filter.constructor != Object)) {
            throw new Error("ref_filter [" + this.ref_filter + "] configured in meta:" + this.collection + " should be object");
        }

        return validate_fields(this.meta, this.fields);
    }
}

module.exports = { EntityMeta, validate_all_metas, get_entity_meta, get_all_metas, DELETE_MODE }
