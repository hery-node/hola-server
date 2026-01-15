/**
 * Meta programming core - Entity definition and validation.
 * @module core/meta
 */

import type { Router } from 'express';
import { get_type } from './type.js';
import { validate_meta_role } from './role.js';

export interface FieldDefinition {
    name: string;
    type?: string;
    required?: boolean;
    default?: unknown;
    ref?: string;
    link?: string;
    delete?: 'keep' | 'cascade';
    create?: boolean;
    list?: boolean;
    search?: boolean;
    update?: boolean;
    clone?: boolean;
    sys?: boolean;
    secure?: boolean;
    group?: string;
    view?: string;
}

export interface MetaDefinition {
    collection: string;
    roles?: string[];
    primary_keys: string[];
    fields: FieldDefinition[];
    creatable?: boolean;
    readable?: boolean;
    updatable?: boolean;
    deleteable?: boolean;
    cloneable?: boolean;
    importable?: boolean;
    exportable?: boolean;
    ref_label?: string;
    ref_filter?: Record<string, unknown>;
    route?: RouteCallback;
    user_field?: string;
    after_read?: CallbackFunction;
    list_query?: CallbackFunction;
    before_create?: CallbackFunction;
    before_clone?: CallbackFunction;
    before_update?: CallbackFunction;
    before_delete?: CallbackFunction;
    after_create?: CallbackFunction;
    after_clone?: CallbackFunction;
    after_update?: CallbackFunction;
    after_delete?: CallbackFunction;
    create?: CallbackFunction;
    clone?: CallbackFunction;
    update?: CallbackFunction;
    batch_update?: CallbackFunction;
    after_batch_update?: CallbackFunction;
    delete?: CallbackFunction;
}

export type CallbackFunction = (...args: unknown[]) => unknown;
export type RouteCallback = (router: Router, meta: EntityMeta) => void;

const meta_manager: Record<string, EntityMeta> = {};

const FIELD_ATTRS = ["name", "type", "required", "default", "ref", "link", "delete", "create", "list", "search", "update", "clone", "sys", "secure", "group", "view"];
const LINK_FIELD_ATTRS = ["name", "link", "list"];
const CALLBACK_NAMES = ["after_read", "list_query", "before_create", "before_clone", "before_update", "before_delete",
    "after_create", "after_clone", "after_update", "after_delete", "create", "clone", "update", "batch_update", "after_batch_update", "delete"];
const OPERATION_FLAGS = ["creatable", "readable", "updatable", "deleteable", "cloneable", "importable", "exportable"] as const;
const MODE_MAP: Record<string, string> = { creatable: "c", readable: "rs", updatable: "u", deleteable: "db", cloneable: "o", importable: "i", exportable: "e" };

const META_ATTRS = ["collection", "roles", "primary_keys", "fields", ...OPERATION_FLAGS, ...CALLBACK_NAMES, "ref_label", "ref_filter", "route", "user_field"];
export const DELETE_MODE = Object.freeze({ all: ["keep", "cascade"] as const, keep: "keep" as const, cascade: "cascade" as const });

/** Convert fields array to name-keyed map. */
const to_fields_map = (fields: FieldDefinition[]): Record<string, FieldDefinition> => {
    return fields.reduce((m, f) => { m[f.name] = f; return m; }, {} as Record<string, FieldDefinition>);
};

/** Format error message with meta context. */
const meta_error = (collection: string, msg: string, field: FieldDefinition | null = null): Error => {
    const prefix = field ? `meta:${collection},field:${field.name}` : `meta:${collection}`;
    return new Error(`${prefix} ${msg}`);
};

/** Validate and normalize field definition. */
const validate_field = (meta: MetaDefinition, field: FieldDefinition): void => {
    if (!field.name) throw meta_error(meta.collection, `name attr required for field:${JSON.stringify(field)}`);

    if (field.type) get_type(field.type);
    else if (!field.link) field.type = "string";

    if (meta.primary_keys.includes(field.name)) field.required = true;

    if (field.default !== undefined && field.type) {
        const type = get_type(field.type);
        const result = type.convert(field.default);
        if (result.err) throw meta_error(meta.collection, `invalid default value [${field.default}] for type [${field.type}]`, field);
    }

    if (field.ref && !field.link) {
        const ref_meta = meta_manager[field.ref];
        if (!ref_meta) throw meta_error(meta.collection, `refers invalid meta:${field.ref}`, field);
        if (!ref_meta.ref_label) throw meta_error(meta.collection, `refers meta:${field.ref} without ref_label`, field);

        const ref_by_collections = ref_meta.ref_by_metas.map((m) => m.collection);
        if (!ref_by_collections.includes(meta.collection)) ref_meta.ref_by_metas.push(meta_manager[meta.collection]);
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

/** Validate all fields in meta definition. */
const validate_fields = (meta: MetaDefinition, fields: FieldDefinition[]): boolean => {
    const fields_map = to_fields_map(fields);
    const seen_names = new Set<string>();

    for (const field of fields) {
        validate_field(meta, field);

        if (seen_names.has(field.name)) throw meta_error(meta.collection, `Duplicate field [${JSON.stringify(field)}]`);
        seen_names.add(field.name);

        if (field.link) {
            const link_field = fields_map[field.link];
            if (!link_field) throw meta_error(meta.collection, `link field [${JSON.stringify(field)}] should link to field`);
            if (!link_field.ref) throw meta_error(meta.collection, `link field [${JSON.stringify(field)}] target [${JSON.stringify(link_field)}] must ref entity`);

            const entity = get_entity_meta(link_field.ref);
            if (!entity) throw meta_error(meta.collection, `link target entity not found: ${link_field.ref}`);
            const link_entity_field = entity.fields_map[field.name];
            if (!link_entity_field) throw meta_error(entity.collection, `link field [${JSON.stringify(field)}] should link to field`);

            Object.assign(field, { type: link_entity_field.type, required: false, create: false, search: false, update: false, clone: false, delete: "cascade" as const });
            if (link_entity_field.ref) field.ref = link_entity_field.ref;
        }
    }
    return true;
};

/** Validate all registered metas after loading. */
export const validate_all_metas = (): void => {
    Object.values(meta_manager).forEach((m) => m.validate_meta_info());
};

/** Set callback function on entity meta. */
const set_callback = (entity_meta: EntityMeta, cb_name: string, cb?: CallbackFunction): void => {
    if (!cb) return;
    if (!(cb instanceof Function)) throw new Error(`callback [${cb_name}] for meta:${entity_meta.collection} isn't function`);
    (entity_meta as unknown as Record<string, unknown>)[cb_name] = cb;
};

/** Get entity meta by collection name. */
export const get_entity_meta = (collection: string): EntityMeta | undefined => meta_manager[collection];

/** Get all registered meta collection names. */
export const get_all_metas = (): string[] => Object.keys(meta_manager);

/** Entity Meta wrapper class. Validates meta structure and sets default values. */
export class EntityMeta {
    meta: MetaDefinition;
    collection: string;
    roles?: string[];
    primary_keys: string[];
    user_field?: string;
    ref_label?: string;
    ref_filter?: Record<string, unknown>;
    creatable: boolean;
    readable: boolean;
    updatable: boolean;
    deleteable: boolean;
    cloneable: boolean;
    importable: boolean;
    exportable: boolean;
    editable: boolean;
    mode: string;
    fields: FieldDefinition[];
    fields_map: Record<string, FieldDefinition>;
    field_names: string[];
    client_fields: FieldDefinition[];
    property_fields: FieldDefinition[];
    create_fields: FieldDefinition[];
    update_fields: FieldDefinition[];
    search_fields: FieldDefinition[];
    clone_fields: FieldDefinition[];
    list_fields: FieldDefinition[];
    primary_key_fields: FieldDefinition[];
    required_field_names: string[];
    file_fields: FieldDefinition[];
    upload_fields: { name: string }[];
    ref_fields: FieldDefinition[];
    link_fields: FieldDefinition[];
    ref_by_metas: EntityMeta[];

    constructor(meta: MetaDefinition) {
        this.meta = meta;
        this.collection = meta.collection;
        this.roles = meta.roles;
        this.primary_keys = meta.primary_keys;
        this.user_field = meta.user_field;
        this.ref_label = meta.ref_label;
        this.ref_filter = meta.ref_filter;

        this.creatable = meta.creatable ?? false;
        this.readable = meta.readable ?? false;
        this.updatable = meta.updatable ?? false;
        this.deleteable = meta.deleteable ?? false;
        this.cloneable = meta.cloneable ?? false;
        this.importable = meta.importable ?? false;
        this.exportable = meta.exportable ?? false;
        this.editable = this.creatable || this.updatable;

        this.mode = OPERATION_FLAGS.filter((f) => this[f]).map((f) => MODE_MAP[f]).join("");

        this.fields = meta.fields;
        this.fields_map = to_fields_map(meta.fields);
        this.field_names = this.fields.map((f) => f.name);
        this._init_field_subsets(meta);

        this.ref_fields = this.fields.filter((f) => f.ref);
        this.link_fields = this.fields.filter((f) => f.link);
        this.ref_by_metas = [];

        CALLBACK_NAMES.forEach((cb) => set_callback(this, cb, (meta as unknown as Record<string, CallbackFunction>)[cb]));
        if (meta_manager[meta.collection]) throw new Error(`Duplicate meta info:${this.collection}`);
        meta_manager[meta.collection] = this;
    }

    private _init_field_subsets(meta: MetaDefinition): void {
        const not_sys = (f: FieldDefinition): boolean => f.sys !== true;
        const not_secure = (f: FieldDefinition): boolean => f.secure !== true;

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

    validate_meta_info(): boolean {
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

    private _validate_primary_keys(): void {
        if (!this.primary_keys) throw meta_error(this.collection, `no primary_keys defined`);
        if (!Array.isArray(this.primary_keys)) throw meta_error(this.collection, `primary_keys should be array`);
        for (const key of this.primary_keys) {
            if (!this.field_names.includes(key)) throw meta_error(this.collection, `wrong primary_key ${key}`);
        }
    }

    private _validate_field_exists(attr_name: string, value?: string): void {
        if (value && !this.field_names.includes(value)) {
            throw meta_error(this.collection, `${attr_name} [${value}] not found in fields`);
        }
    }

    private _validate_roles(): void {
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
