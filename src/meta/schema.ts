/**
 * TypeBox schema generation from EntityMeta.
 * @module meta/schema
 */

import { t, TSchema } from "elysia";
import type { EntityMeta, FieldDefinition } from "../core/meta.js";

/** Custom schema type registry for project-specific types. */
const custom_schema_types: Record<string, () => TSchema> = {};

/** Register a custom schema type mapping. */
export const register_schema_type = (name: string, schema_fn: () => TSchema): void => {
  custom_schema_types[name] = schema_fn;
};

/** Get schema for a field type (checks custom types first, then built-in, then defaults to string). */
const get_schema_for_type = (type_name: string): TSchema => {
  const type_map: Record<string, () => TSchema> = { string: () => t.String(), text: () => t.String(), number: () => t.Numeric(), int: () => t.Numeric(), float: () => t.Numeric(), boolean: () => t.Boolean(), date: () => t.String({ format: "date-time" }), datetime: () => t.String({ format: "date-time" }), array: () => t.Array(t.Unknown()), object: () => t.Object({}), file: () => t.Any(), json: () => t.Any() };

  // Check custom types first, then built-in types, then default to string
  const schema_fn = custom_schema_types[type_name] ?? type_map[type_name];
  return schema_fn?.() ?? t.String();
};

/** Map field type to TypeBox schema. */
const field_to_schema = (field: FieldDefinition): TSchema => {
  const base = get_schema_for_type(field.type ?? "string");
  return field.required ? base : t.Optional(base);
};

/** Build create schema for entity. */
const build_create_schema = (meta: EntityMeta): TSchema => {
  const create_fields: Record<string, TSchema> = {};
  // Exclude user_field from request validation - it's auto-populated from session
  const user_field = (meta as any).user_field;
  for (const field of meta.create_fields) {
    if (field.name === user_field) continue;
    create_fields[field.name] = field_to_schema(field);
  }
  return t.Object(create_fields);
};

/** Build update schema for entity. */
const build_update_schema = (meta: EntityMeta): TSchema => {
  const update_fields: Record<string, TSchema> = {};
  for (const field of meta.update_fields) {
    update_fields[field.name] = t.Optional(field_to_schema(field));
  }
  return t.Object(update_fields);
};

/** Generate TypeBox schemas from EntityMeta (lazy evaluation for custom types). */
export const meta_to_schema = (meta: EntityMeta) => {
  // Query schema for list operations - allows additional properties for entity-specific search fields
  const query_schema = t.Object({ page: t.Optional(t.Number({ minimum: 1 })), limit: t.Optional(t.Number({ minimum: 1, maximum: 1000 })), sort_by: t.Optional(t.String()), desc: t.Optional(t.Boolean()), attr_names: t.Optional(t.String()), sort: t.Optional(t.String()), order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])), search: t.Optional(t.String()) }, { additionalProperties: true });

  // Ref query schema for reference labels lookup
  const ref_query_schema = t.Object({ ref_by_entity: t.Optional(t.String()), query: t.Optional(t.String()) });

  // Property query schema for reading specific fields
  const property_query_schema = t.Object({ fields: t.Optional(t.String()) });

  const id_param = t.Object({ id: t.String() });

  // Use getters for lazy evaluation - custom types are resolved when schema is accessed
  return {
    get create() {
      return build_create_schema(meta);
    },
    get update() {
      return build_update_schema(meta);
    },
    query: query_schema,
    ref_query: ref_query_schema,
    property_query: property_query_schema,
    id_param,
  };
};

/** Generate OpenAPI-compatible schema documentation from EntityMeta. */
export const meta_to_openapi = (meta: EntityMeta) => ({ collection: meta.collection, fields: meta.client_fields.map((f) => ({ name: f.name, type: f.type ?? "string", required: f.required ?? false })) });
