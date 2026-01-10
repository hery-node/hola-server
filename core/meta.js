/**
 * @fileoverview Meta programming core - Entity definition and validation.
 * @module core/meta
 *
 * Field attributes:
 * - name: Field name (required).
 * - type: Data type (string, int, float, etc., default: "string").
 * - required: Whether field is required (default: false).
 * - ref: Reference to another entity (collection name).
 * - link: Link to another field in this entity (must be a field of type 'ref').
 *         This field's value will be auto-populated from the referenced entity.
 *         Only supports { name, link, list } attributes.
 * - delete: Deletion behavior for ref fields.
 *         - "keep": Keep this record when referenced entity is deleted.
 *         - "cascade": Delete this record when referenced entity is deleted.
 *         - Default: undefined (no action).
 * - create: Show in create form (default: true).
 * - list: Show in table list (default: true).
 * - search: Show in search form (default: true).
 * - update: Allow update (default: true).
 * - clone: Include in clone (default: true).
 * - sys: System field (server-side only, not sent to client unless explicitly needed).
 * - secure: Hidden from client entirely (e.g., password hash).
 * - group: User group sharing control (field name containing group ID).
 * - view: Form view identifier - controls which form view(s) display this field.
 *         - "*": All views (default for editable fields).
 *         - "view_name": Specific view only.
 *         Only applicable to editable fields (create !== false or update !== false).
 *         Multiple form views can reference different subsets of fields for different contexts.
 */

const { is_undefined } = require('./validate');
const { get_type } = require('./type');
const { validate_meta_role } = require('./role');

const meta_manager = {};

const FIELD_ATTRS = ["name", "type", "required", "ref", "link", "delete", "create", "list", "search", "update", "clone", "sys", "secure", "group", "view"];

/**
 * Meta attributes for entity definition.
 * 
 * Core attributes:
 * - collection: MongoDB collection name (required)
 * - roles: Array of role-based access rules in format "role_name:mode[:field]"
 * - primary_keys: Array of field names that form the primary key (required)
 * - fields: Array of field definitions (required)
 * 
 * Permission flags (default: false):
 * - creatable: Allow creating new records
 * - readable: Allow reading/listing records
 * - updatable: Allow updating existing records
 * - deleteable: Allow deleting records
 * - cloneable: Allow cloning records
 * 
 * Lifecycle hooks (async callbacks):
 * - after_read: Called after reading records, receives (ctx, records)
 * - list_query: Modify query before listing, receives (ctx, query)
 * - before_create: Called before creating, receives (ctx, data)
 * - after_create: Called after creating, receives (ctx, data)
 * - before_clone: Called before cloning, receives (ctx, source, target)
 * - after_clone: Called after cloning, receives (ctx, source, target)
 * - before_update: Called before updating, receives (ctx, data)
 * - after_update: Called after updating, receives (ctx, old_data, new_data)
 * - before_delete: Called before deleting, receives (ctx, data)
 * - after_delete: Called after deleting, receives (ctx, data)
 * - after_batch_update: Called after batch update, receives (ctx, results)
 * 
 * Override handlers (replace default CRUD behavior):
 * - create: Custom create handler, receives (ctx, data)
 * - clone: Custom clone handler, receives (ctx, source, target)
 * - update: Custom update handler, receives (ctx, data)
 * - batch_update: Custom batch update handler, receives (ctx, items)
 * - delete: Custom delete handler, receives (ctx, data)
 * 
 * Reference and routing:
 * - ref_label: Field name to display when entity is referenced by others
 * - ref_filter: Default filter object when this entity is used as reference
 * - route: Custom route path (default: collection name)
 * - user_field: Field name that stores owner user for record-level access control
 */
const META_ATTRS = ["collection", "roles", "primary_keys", "fields", "creatable", "readable", "updatable", "deleteable", "cloneable", "after_read", "list_query",
    "before_create", "after_create", "before_clone", "after_clone", "before_update", "after_update", "before_delete", "after_delete", "create", "clone", "update", "batch_update", "after_batch_update", "delete",
    "ref_label", "ref_filter", "route", "user_field"];

const DELETE_MODE = Object.freeze({ all: ["keep", "cascade"], keep: "keep", cascade: "cascade" });

/**
 * Validate and normalize field definition.
 * @param {Object} meta - Entity meta.
 * @param {Object} field - Field definition.
 * @throws {Error} If field configuration is invalid.
 */
const validate_field = (meta, field) => {
    if (!field.name) throw new Error(`name attr required for field:${JSON.stringify(field)}, meta:${meta.collection}`);

    if (field.type) get_type(field.type);
    else if (!field.link) field.type = "string";

    if (meta.primary_keys.includes(field.name)) field.required = true;

    if (field.ref && !field.link) {
        const ref_meta = meta_manager[field.ref];
        if (!ref_meta) throw new Error(`meta:${meta.collection},field:${field.name} refers invalid meta:${field.ref}`);
        if (!ref_meta.ref_label) throw new Error(`meta:${meta.collection},field:${field.name} refers meta:${field.ref} without ref_label`);

        const ref_by_collections = ref_meta.ref_by_metas.map((m) => m.collection);
        if (!ref_by_collections.includes(this.collection)) ref_meta.ref_by_metas.push(meta_manager[meta.collection]);
    }

    if (field.delete) {
        if (!field.ref) throw new Error(`meta:${meta.collection},field:${field.name} delete not allowed on non-ref field`);
        if (!DELETE_MODE.all.includes(field.delete)) throw new Error(`meta:${meta.collection},field:${field.name} invalid delete:${field.delete}, valid:${JSON.stringify(DELETE_MODE.all)}`);
    }

    if (field.link) {
        const support_keys = ["name", "link", "list"];
        Object.keys(field).forEach((key) => {
            if (!support_keys.includes(key)) throw new Error(`Link field only supports name,link,list. Unsupported:${key} in field:${JSON.stringify(field)}, meta:${meta.collection}`);
        });
    }

    const editable = (field.create !== false) || (field.update !== false);
    if (field.view && !editable) throw new Error(`view only for editable fields. Field:${JSON.stringify(field)}, meta:${meta.collection}`);
    if (!field.view && editable) field.view = "*";

    Object.keys(field).forEach((key) => {
        if (!FIELD_ATTRS.includes(key)) throw new Error(`Unsupported attribute [${key}] for field:${JSON.stringify(field)}, meta:${meta.collection}`);
    });
};

/**
 * Validate all fields in meta definition.
 * @param {Object} meta - Entity meta.
 * @param {Object[]} fields - Field definitions.
 * @returns {boolean} True if valid.
 * @throws {Error} If validation fails.
 */
const validate_fields = (meta, fields) => {
    const fields_map = fields.reduce((map, field) => { map[field.name] = field; return map; }, {});
    const field_names = [];

    fields.forEach((field) => {
        validate_field(meta, field);
        if (field_names.includes(field.name)) throw new Error(`Duplicate field [${JSON.stringify(field)}] in meta:${meta.collection}`);
        field_names.push(field.name);

        if (field.link) {
            const link_field = fields_map[field.link];
            if (!link_field) throw new Error(`link field [${JSON.stringify(field)}] should link to field in meta:${meta.collection}`);
            if (!link_field.ref) throw new Error(`link field [${JSON.stringify(field)}] target [${JSON.stringify(link_field)}] must ref entity in meta:${meta.collection}`);

            const entity = get_entity_meta(link_field.ref);
            const link_entity_field = entity.fields_map[field.name];
            if (!link_entity_field) throw new Error(`link field [${JSON.stringify(field)}] should link to field in meta:${entity.collection}`);

            field.type = link_entity_field.type;
            field.required = false;
            field.create = false;
            field.search = false;
            field.update = false;
            field.clone = false;
            field.delete = "cascade";
            if (link_entity_field.ref) field.ref = link_entity_field.ref;
        }
    });

    return true;
};

/**
 * Validate all registered metas after loading.
 */
const validate_all_metas = () => {
    Object.keys(meta_manager).forEach((meta_name) => meta_manager[meta_name].validate_meta_info());
};

/**
 * Set callback function on entity meta.
 * @param {Object} entity_meta - Entity meta object.
 * @param {string} cb_name - Callback name.
 * @param {Function} cb - Callback function.
 * @throws {Error} If callback is not a function.
 */
const set_callback = (entity_meta, cb_name, cb) => {
    if (!cb) return;
    if (!(cb instanceof Function)) throw new Error(`callback [${cb_name}] for meta:${entity_meta.collection} isn't function`);
    entity_meta[cb_name] = cb;
};

/**
 * Get entity meta by collection name.
 * @param {string} collection - Collection name.
 * @returns {EntityMeta} Entity meta object.
 */
const get_entity_meta = (collection) => meta_manager[collection];

/**
 * Get all registered meta collection names.
 * @returns {string[]} Array of collection names.
 */
const get_all_metas = () => Object.keys(meta_manager);


/**
 * Entity Meta wrapper class.
 * Validates meta structure and sets default values.
 */
class EntityMeta {
    /**
     * Create EntityMeta instance.
     * @param {Object} meta - Meta definition object.
     * @throws {Error} If duplicate meta registered.
     */
    constructor(meta) {
        this.meta = meta;
        this.collection = meta.collection;
        this.roles = meta.roles;

        // Set operation flags with defaults
        this.creatable = is_undefined(meta.creatable) ? false : meta.creatable;
        this.readable = is_undefined(meta.readable) ? false : meta.readable;
        this.updatable = is_undefined(meta.updatable) ? false : meta.updatable;
        this.deleteable = is_undefined(meta.deleteable) ? false : meta.deleteable;
        this.cloneable = is_undefined(meta.cloneable) ? false : meta.cloneable;
        this.importable = is_undefined(meta.importable) ? false : meta.importable;
        this.exportable = is_undefined(meta.exportable) ? false : meta.exportable;
        this.editable = this.creatable || this.updatable;

        // Build mode string (b:batch, c:create, d:delete, e:export, i:import, o:clone, p:page, r:refresh, s:search, u:update)
        this.mode = this._build_mode_string();

        // Reference handling
        this.ref_label = meta.ref_label;
        this.ref_filter = meta.ref_filter;
        this.ref_fields = meta.fields.filter((f) => f.ref);
        this.ref_by_metas = [];

        // Field organization
        this.link_fields = meta.fields.filter((f) => f.link);
        this.fields_map = meta.fields.reduce((map, field) => { map[field.name] = field; return map; }, {});
        this.fields = meta.fields;
        this.primary_keys = meta.primary_keys;
        this.field_names = this.fields.map((f) => f.name);
        this.user_field = meta.user_field;

        // Field subsets for different operations
        this.client_fields = this.fields.filter((f) => f.sys !== true);
        this.property_fields = this.fields.filter((f) => f.sys !== true && f.secure !== true);
        this.create_fields = this.fields.filter((f) => f.create !== false && f.sys !== true);
        this.update_fields = this.fields.filter((f) => f.create !== false && f.update !== false && f.sys !== true);
        this.search_fields = this.fields.filter((f) => f.search !== false && f.sys !== true);
        this.clone_fields = this.fields.filter((f) => f.clone !== false && f.sys !== true);
        this.list_fields = this.fields.filter((f) => f.list !== false && f.sys !== true && f.secure !== true);
        this.primary_key_fields = this.fields.filter((f) => meta.primary_keys.includes(f.name));
        this.required_field_names = this.fields.filter((f) => f.required === true || this.primary_keys.includes(f.name)).map((f) => f.name);

        // File handling
        this.file_fields = meta.fields.filter((f) => f.type === 'file');
        this.upload_fields = this.file_fields.length > 0 ? this.file_fields.map((f) => ({ name: f.name })) : [];

        // Set callbacks
        this._set_callbacks(meta);

        // Register meta
        if (meta_manager[meta.collection]) throw new Error(`Duplicate meta info:${this.collection}`);
        meta_manager[meta.collection] = this;
    }

    /**
     * Build mode string from operation flags.
     * @returns {string} Mode string.
     * @private
     */
    _build_mode_string() {
        const modes = [];
        if (this.creatable) modes.push("c");
        if (this.readable) modes.push("rs");
        if (this.updatable) modes.push("u");
        if (this.deleteable) modes.push("db");
        if (this.cloneable) modes.push("o");
        if (this.importable) modes.push("i");
        if (this.exportable) modes.push("e");
        return modes.join("");
    }

    /**
     * Set all callback functions from meta definition.
     * @param {Object} meta - Meta definition.
     * @private
     */
    _set_callbacks(meta) {
        const callbacks = ["after_read", "list_query", "before_create", "before_clone", "before_update", "before_delete",
            "after_create", "after_clone", "after_update", "after_delete", "create", "clone", "update", "batch_update", "after_batch_update", "delete"];
        callbacks.forEach((cb) => set_callback(this, cb, meta[cb]));
    }

    /**
     * Validate meta information.
     * @returns {boolean} True if valid.
     * @throws {Error} If validation fails.
     */
    validate_meta_info() {
        if (!this.collection) throw new Error(`no collection defined for meta:${JSON.stringify(this.meta)}`);

        Object.keys(this.meta).forEach((key) => {
            if (!META_ATTRS.includes(key)) throw new Error(`Unsupported attribute [${key}] for meta:${this.collection}`);
        });

        this._validate_primary_keys();
        this._validate_roles();
        this._validate_ref_label();
        this._validate_user_field();
        this._validate_ref_filter();

        return validate_fields(this.meta, this.fields);
    }

    /**
     * Validate primary keys configuration.
     * @private
     */
    _validate_primary_keys() {
        if (!this.primary_keys) throw new Error(`no primary_keys for meta:${this.collection}`);
        if (!Array.isArray(this.primary_keys)) throw new Error(`primary_keys of meta [${this.collection}] should be array`);
        this.primary_keys.forEach((key) => {
            if (!this.field_names.includes(key)) throw new Error(`wrong primary_key ${key} in meta:${this.collection}`);
        });
    }

    /**
     * Validate roles configuration.
     * @private
     */
    _validate_roles() {
        if (!this.roles) return;
        if (!Array.isArray(this.roles)) throw new Error(`roles of meta [${this.collection}] should be array`);

        this.roles.forEach((role) => {
            const role_config = role.split(":");
            if (role_config.length !== 2 && role_config.length !== 3) {
                throw new Error(`wrong role config [${role}] in meta [${this.collection}]. Use : to separate role name with mode.`);
            }

            const [role_name, role_mode] = role_config;
            if (!validate_meta_role(role_name)) throw new Error(`role [${role_name}] in meta [${this.collection}] not defined in settings`);

            if (role_mode !== "*") {
                for (const mode of role_mode) {
                    if (!this.mode.includes(mode)) throw new Error(`role [${role_name}] in meta [${this.collection}] mode [${mode}] doesn't match entity mode [${this.mode}]`);
                }
            }
        });
    }

    /**
     * Validate ref_label configuration.
     * @private
     */
    _validate_ref_label() {
        if (this.ref_label && !this.field_names.includes(this.ref_label)) {
            throw new Error(`ref_label [${this.ref_label}] in meta:${this.collection} not found in fields`);
        }
    }

    /**
     * Validate user_field configuration.
     * @private
     */
    _validate_user_field() {
        if (this.user_field && !this.field_names.includes(this.user_field)) {
            throw new Error(`user_field [${this.user_field}] in meta:${this.collection} not found in fields`);
        }
    }

    /**
     * Validate ref_filter configuration.
     * @private
     */
    _validate_ref_filter() {
        if (this.ref_filter && this.ref_filter.constructor !== Object) {
            throw new Error(`ref_filter [${this.ref_filter}] in meta:${this.collection} should be object`);
        }
    }
}

module.exports = { EntityMeta, validate_all_metas, get_entity_meta, get_all_metas, DELETE_MODE };
