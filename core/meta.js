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

const { get_type } = require('./type');
const { validate_meta_role } = require('./role');

const meta_manager = {};

const FIELD_ATTRS = ["name", "type", "required", "ref", "link", "delete", "create", "list", "search", "update", "clone", "sys", "secure", "group", "view"];
const LINK_FIELD_ATTRS = ["name", "link", "list"];
const CALLBACK_NAMES = ["after_read", "list_query", "before_create", "before_clone", "before_update", "before_delete",
    "after_create", "after_clone", "after_update", "after_delete", "create", "clone", "update", "batch_update", "after_batch_update", "delete"];
const OPERATION_FLAGS = ["creatable", "readable", "updatable", "deleteable", "cloneable", "importable", "exportable"];
const MODE_MAP = { creatable: "c", readable: "rs", updatable: "u", deleteable: "db", cloneable: "o", importable: "i", exportable: "e" };

const META_ATTRS = ["collection", "roles", "primary_keys", "fields", ...OPERATION_FLAGS, ...CALLBACK_NAMES, "ref_label", "ref_filter", "route", "user_field"];
const DELETE_MODE = Object.freeze({ all: ["keep", "cascade"], keep: "keep", cascade: "cascade" });

/** Convert fields array to name-keyed map. */
const to_fields_map = (fields) => fields.reduce((m, f) => { m[f.name] = f; return m; }, {});

/** Format error message with meta context. */
const meta_error = (collection, msg, field = null) => {
    const prefix = field ? `meta:${collection},field:${field.name}` : `meta:${collection}`;
    return new Error(`${prefix} ${msg}`);
};

/**
 * Validate and normalize field definition.
 * @param {Object} meta - Entity meta.
 * @param {Object} field - Field definition.
 * @throws {Error} If field configuration is invalid.
 */
const validate_field = (meta, field) => {
    if (!field.name) throw meta_error(meta.collection, `name attr required for field:${JSON.stringify(field)}`);

    if (field.type) get_type(field.type);
    else if (!field.link) field.type = "string";

    if (meta.primary_keys.includes(field.name)) field.required = true;

    if (field.ref && !field.link) {
        const ref_meta = meta_manager[field.ref];
        if (!ref_meta) throw meta_error(meta.collection, `refers invalid meta:${field.ref}`, field);
        if (!ref_meta.ref_label) throw meta_error(meta.collection, `refers meta:${field.ref} without ref_label`, field);

        const ref_by_collections = ref_meta.ref_by_metas.map((m) => m.collection);
        if (!ref_by_collections.includes(this.collection)) ref_meta.ref_by_metas.push(meta_manager[meta.collection]);
    }

    if (field.delete) {
        if (!field.ref) throw meta_error(meta.collection, `delete not allowed on non-ref field`, field);
        if (!DELETE_MODE.all.includes(field.delete)) throw meta_error(meta.collection, `invalid delete:${field.delete}, valid:${JSON.stringify(DELETE_MODE.all)}`, field);
    }

    if (field.link) {
        const invalid_keys = Object.keys(field).filter((k) => !LINK_FIELD_ATTRS.includes(k));
        if (invalid_keys.length) throw meta_error(meta.collection, `Link field only supports ${LINK_FIELD_ATTRS.join(",")}. Unsupported:${invalid_keys.join(",")}`);
    }

    const editable = (field.create !== false) || (field.update !== false);
    if (field.view && !editable) throw meta_error(meta.collection, `view only for editable fields`);
    if (!field.view && editable) field.view = "*";

    const invalid_attrs = Object.keys(field).filter((k) => !FIELD_ATTRS.includes(k));
    if (invalid_attrs.length) throw meta_error(meta.collection, `Unsupported attribute [${invalid_attrs.join(",")}] for field:${JSON.stringify(field)}`);
};

/**
 * Validate all fields in meta definition.
 * @param {Object} meta - Entity meta.
 * @param {Object[]} fields - Field definitions.
 * @returns {boolean} True if valid.
 * @throws {Error} If validation fails.
 */
const validate_fields = (meta, fields) => {
    const fields_map = to_fields_map(fields);
    const seen_names = new Set();

    for (const field of fields) {
        validate_field(meta, field);

        if (seen_names.has(field.name)) throw meta_error(meta.collection, `Duplicate field [${JSON.stringify(field)}]`);
        seen_names.add(field.name);

        if (field.link) {
            const link_field = fields_map[field.link];
            if (!link_field) throw meta_error(meta.collection, `link field [${JSON.stringify(field)}] should link to field`);
            if (!link_field.ref) throw meta_error(meta.collection, `link field [${JSON.stringify(field)}] target [${JSON.stringify(link_field)}] must ref entity`);

            const entity = get_entity_meta(link_field.ref);
            const link_entity_field = entity.fields_map[field.name];
            if (!link_entity_field) throw meta_error(entity.collection, `link field [${JSON.stringify(field)}] should link to field`);

            Object.assign(field, { type: link_entity_field.type, required: false, create: false, search: false, update: false, clone: false, delete: "cascade" });
            if (link_entity_field.ref) field.ref = link_entity_field.ref;
        }
    }
    return true;
};

/** Validate all registered metas after loading. */
const validate_all_metas = () => Object.values(meta_manager).forEach((m) => m.validate_meta_info());

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

/** Get entity meta by collection name. */
const get_entity_meta = (collection) => meta_manager[collection];

/** Get all registered meta collection names. */
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
        this.primary_keys = meta.primary_keys;
        this.user_field = meta.user_field;
        this.ref_label = meta.ref_label;
        this.ref_filter = meta.ref_filter;

        // Set operation flags with defaults
        OPERATION_FLAGS.forEach((flag) => { this[flag] = meta[flag] ?? false; });
        this.editable = this.creatable || this.updatable;

        // Build mode string
        this.mode = OPERATION_FLAGS.filter((f) => this[f]).map((f) => MODE_MAP[f]).join("");

        // Field organization
        this.fields = meta.fields;
        this.fields_map = to_fields_map(meta.fields);
        this.field_names = this.fields.map((f) => f.name);
        this._init_field_subsets(meta);

        // Reference handling
        this.ref_fields = this.fields.filter((f) => f.ref);
        this.link_fields = this.fields.filter((f) => f.link);
        this.ref_by_metas = [];

        // Set callbacks and register meta
        CALLBACK_NAMES.forEach((cb) => set_callback(this, cb, meta[cb]));
        if (meta_manager[meta.collection]) throw new Error(`Duplicate meta info:${this.collection}`);
        meta_manager[meta.collection] = this;
    }

    /** Initialize field subsets for different operations. @private */
    _init_field_subsets(meta) {
        const not_sys = (f) => f.sys !== true;
        const not_secure = (f) => f.secure !== true;

        this.client_fields = this.fields.filter(not_sys);
        this.property_fields = this.fields.filter((f) => not_sys(f) && not_secure(f));
        this.create_fields = this.fields.filter((f) => f.create !== false && not_sys(f));
        this.update_fields = this.fields.filter((f) => f.create !== false && f.update !== false && not_sys(f));
        this.search_fields = this.fields.filter((f) => f.search !== false && not_sys(f));
        this.clone_fields = this.fields.filter((f) => f.clone !== false && not_sys(f));
        this.list_fields = this.fields.filter((f) => f.list !== false && not_sys(f) && not_secure(f));
        this.primary_key_fields = this.fields.filter((f) => meta.primary_keys.includes(f.name));
        this.required_field_names = this.fields.filter((f) => f.required === true || this.primary_keys.includes(f.name)).map((f) => f.name);
        this.file_fields = this.fields.filter((f) => f.type === 'file');
        this.upload_fields = this.file_fields.map((f) => ({ name: f.name }));
    }

    /**
     * Validate meta information.
     * @returns {boolean} True if valid.
     * @throws {Error} If validation fails.
     */
    validate_meta_info() {
        if (!this.collection) throw new Error(`no collection defined for meta:${JSON.stringify(this.meta)}`);

        const invalid_attrs = Object.keys(this.meta).filter((k) => !META_ATTRS.includes(k));
        if (invalid_attrs.length) throw meta_error(this.collection, `Unsupported attribute [${invalid_attrs.join(",")}]`);

        this._validate_primary_keys();
        this._validate_roles();
        this._validate_field_exists("ref_label", this.ref_label);
        this._validate_field_exists("user_field", this.user_field);
        if (this.ref_filter && this.ref_filter.constructor !== Object) {
            throw meta_error(this.collection, `ref_filter should be object`);
        }

        return validate_fields(this.meta, this.fields);
    }

    /** Validate primary keys configuration. @private */
    _validate_primary_keys() {
        if (!this.primary_keys) throw meta_error(this.collection, `no primary_keys defined`);
        if (!Array.isArray(this.primary_keys)) throw meta_error(this.collection, `primary_keys should be array`);
        for (const key of this.primary_keys) {
            if (!this.field_names.includes(key)) throw meta_error(this.collection, `wrong primary_key ${key}`);
        }
    }

    /** Validate a field name exists in fields. @private */
    _validate_field_exists(attr_name, value) {
        if (value && !this.field_names.includes(value)) {
            throw meta_error(this.collection, `${attr_name} [${value}] not found in fields`);
        }
    }

    /** Validate roles configuration. @private */
    _validate_roles() {
        if (!this.roles) return;
        if (!Array.isArray(this.roles)) throw meta_error(this.collection, `roles should be array`);

        for (const role of this.roles) {
            const parts = role.split(":");
            if (parts.length < 2 || parts.length > 3) {
                throw meta_error(this.collection, `wrong role config [${role}]. Use : to separate role name with mode.`);
            }

            const [role_name, role_mode] = parts;
            if (!validate_meta_role(role_name)) throw meta_error(this.collection, `role [${role_name}] not defined in settings`);

            if (role_mode !== "*") {
                for (const mode of role_mode) {
                    if (!this.mode.includes(mode)) throw meta_error(this.collection, `role [${role_name}] mode [${mode}] doesn't match entity mode [${this.mode}]`);
                }
            }
        }
    }
}

module.exports = { EntityMeta, validate_all_metas, get_entity_meta, get_all_metas, DELETE_MODE };
