/**
 * Meta module index - exports EntityMeta, router, and schema utilities.
 * @module meta
 */

// EntityMeta and related types
export {
    EntityMeta,
    get_entity_meta,
    get_all_metas,
    validate_all_metas,
    DELETE_MODE
} from '../core/meta.js';

export type {
    MetaDefinition,
    FieldDefinition,
    AnyCallback,
    FieldValue,
    QueryValue
} from '../core/meta.js';

// Router initialization
export { init_router } from './router.js';

// Schema generation
export { meta_to_schema, meta_to_openapi, register_schema_type } from './schema.js';
