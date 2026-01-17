/**
 * TypeBox schema generation from EntityMeta.
 * @module meta/schema
 */

import { t, TSchema } from 'elysia';
import type { EntityMeta, FieldDefinition } from '../core/meta.js';

/** Map field type to TypeBox schema. */
const field_to_schema = (field: FieldDefinition): TSchema => {
    const type_map: Record<string, () => TSchema> = {
        string: () => t.String(),
        text: () => t.String(),
        int: () => t.Number(),
        float: () => t.Number(),
        boolean: () => t.Boolean(),
        date: () => t.String({ format: 'date-time' }),
        array: () => t.Array(t.Unknown()),
        object: () => t.Object({}),
        file: () => t.Any(),
        json: () => t.Any()
    };

    const schema_fn = type_map[field.type ?? 'string'];
    const base = schema_fn?.() ?? t.String();

    return field.required ? base : t.Optional(base);
};

/** Generate TypeBox schemas from EntityMeta. */
export const meta_to_schema = (meta: EntityMeta) => {
    // Create schema - fields with create !== false
    const create_fields: Record<string, TSchema> = {};
    for (const field of meta.create_fields) {
        create_fields[field.name] = field_to_schema(field);
    }

    // Update schema - all fields optional
    const update_fields: Record<string, TSchema> = {};
    for (const field of meta.update_fields) {
        update_fields[field.name] = t.Optional(field_to_schema(field));
    }

    // Query schema for list operations
    const query_schema = t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
        sort: t.Optional(t.String()),
        order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
        search: t.Optional(t.String()),
        _query: t.Optional(t.Any())
    });

    return {
        create: t.Object(create_fields),
        update: t.Object(update_fields),
        query: query_schema,
        id_param: t.Object({ id: t.String() })
    };
};

/** Generate OpenAPI-compatible schema documentation from EntityMeta. */
export const meta_to_openapi = (meta: EntityMeta) => ({
    collection: meta.collection,
    fields: meta.client_fields.map(f => ({
        name: f.name,
        type: f.type ?? 'string',
        required: f.required ?? false
    }))
});
