/**
 * RESTful router initialization for EntityMeta.
 * @module meta/router
 */

import { Elysia } from "elysia";
import { EntityMeta, MetaDefinition, FieldDefinition, QueryValue, FieldValue } from "../core/meta.js";
import { meta_to_schema } from "./schema.js";
import { Entity, ListQueryParams } from "../db/entity.js";
import { NotFoundError, NoRightsError } from "../errors/index.js";
import { SUCCESS } from "../http/code.js";
import type { JwtPayload } from "../plugins/auth.js";
import { get_settings } from "../setting.js";
import { has_value } from "../core/validate.js";

/** Router context extended with auth user from derive plugin. */
interface RouterContext {
  user?: JwtPayload | null;
  query: Record<string, string>;
  body: unknown;
  params: Record<string, string>;
}
/** Check if user has read rights for meta. */
const check_read_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
  if (!meta.readable) throw new NoRightsError("entity not readable");
  const settings = get_settings();
  if (settings.server.check_user && !user) throw new NoRightsError("no read rights");
};

/** Check if user has create rights for meta. */
const check_create_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
  if (!meta.creatable) throw new NoRightsError("entity not creatable");
  const settings = get_settings();
  if (settings.server.check_user && !user) throw new NoRightsError("no create rights");
};

/** Check if user has update rights for meta. */
const check_update_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
  if (!meta.updatable) throw new NoRightsError("entity not updatable");
  const settings = get_settings();
  if (settings.server.check_user && !user) throw new NoRightsError("no update rights");
};

/** Check if user has delete rights for meta. */
const check_delete_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
  if (!meta.deleteable) throw new NoRightsError("entity not deleteable");
  const settings = get_settings();
  if (settings.server.check_user && !user) throw new NoRightsError("no delete rights");
};

/** Check if user has clone rights for meta. */
const check_clone_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
  if (!meta.cloneable) throw new NoRightsError("entity not cloneable");
  const settings = get_settings();
  if (settings.server.check_user && !user) throw new NoRightsError("no clone rights");
};

/** Filter fields by view permission. */
const filter_fields_by_view = (meta: EntityMeta, view: string | null): FieldDefinition[] => {
  if (!view || view === "*") return meta.client_fields;
  return meta.client_fields.filter((field) => {
    const field_view = field.view;
    if (Array.isArray(field_view)) {
      return field_view.includes(view) || field_view.includes("*");
    }
    return view.includes(field_view || "") || field_view === "*";
  });
};

/**
 * Create RESTful router for an entity.
 *
 * Routes:
 * - GET /           Simple list with optional params (attr_names, sort_by, desc, page, limit)
 * - POST /list      List entities with full query options
 * - GET /:id        Get single entity
 * - POST /          Create entity
 * - PUT /:id        Update entity
 * - DELETE /:id     Delete entity
 * - GET /meta       Get field metadata and permission mode
 * - GET /ref        Get reference labels
 * - POST /:id/clone Clone entity
 *
 * @param definition Meta definition for the entity
 */
export const init_router = (definition: MetaDefinition): Elysia<any> => {
  const meta = new EntityMeta(definition);
  const entity = new Entity(meta.collection);
  const schema = meta_to_schema(meta);

  const router = new Elysia({ prefix: `/${meta.collection}` });

  // POST /list - List entities
  if (meta.readable) {
    router.post(
      "/list",
      async ({ user, body }: RouterContext) => {
        check_read_rights(user, meta);

        const body_data = body as ListQueryParams;
        const filter: Record<string, QueryValue> = {};

        // Apply user field filter if defined
        if (meta.user_field && user?.sub) {
          filter[meta.user_field] = user.sub;
        }

        const result = await entity.list_entity(body_data, filter, body_data as Record<string, QueryValue>, "*");
        return { ...result };
      },
      { body: schema.query },
    );
  }

  // GET / - Simple list with optional parameters and sensible defaults
  if (meta.readable) {
    router.get(
      "/",
      async ({ user, query }: RouterContext) => {
        check_read_rights(user, meta);

        const settings = get_settings();
        const query_data = query as Record<string, QueryValue>;
        const filter: Record<string, QueryValue> = {};

        // Apply user field filter if defined
        if (meta.user_field && user?.sub) {
          filter[meta.user_field] = user.sub;
        }

        // Provide sensible defaults for optional parameters
        const list_field_names = meta.list_fields.map((f) => f.name).join(",");
        const primary_key = meta.primary_keys?.[0] || "_id";
        const default_limit = settings.server.threshold.default_list_limit || 1000;

        const params: ListQueryParams = {
          attr_names: (query_data.attr_names as string) || list_field_names,
          sort_by: (query_data.sort_by as string) || primary_key,
          desc: has_value(query_data.desc) ? (query_data.desc as boolean | string) : true,
          page: (query_data.page as number | string) || 1,
          limit: (query_data.limit as number | string) || default_limit,
        };

        const result = await entity.list_entity(params, filter, query_data, "*");
        return { ...result };
      },
    );
  }

  // GET /meta - Get field metadata and mode
  if (meta.readable) {
    router.get("/meta", async ({ user }: RouterContext) => {
      check_read_rights(user, meta);
      // Get mode based on user's role
      const role_mode = meta.get_role_mode(user?.role);
      // Filter to fields visible in at least one UI context
      const visible_fields = filter_fields_by_view(meta, "*").filter((f) => f.create !== false || f.update !== false || f.search !== false || f.list !== false);
      return { code: SUCCESS, data: { mode: role_mode, fields: visible_fields } };
    });
  }

  // GET /ref - Get reference labels
  if (meta.readable && meta.ref_label) {
    router.get(
      "/ref",
      async ({ user, query }: RouterContext) => {
        check_read_rights(user, meta);
        const list = await entity.get_filtered_ref_labels((query.ref_by_entity as string) || "", query.query as string, user?.sub);
        const items = list.map((obj) => ({ title: obj[meta.ref_label!], value: String(obj._id) }));
        return { code: SUCCESS, data: items };
      },
      { query: schema.ref_query },
    );
  }

  // GET /:id - Get single entity
  if (meta.readable) {
    router.get(
      "/:id",
      async ({ user, params }: RouterContext) => {
        check_read_rights(user, meta);

        const result = await entity.read_entity(params.id, "*", "*");
        if (!result.data) throw new NotFoundError();
        return { code: SUCCESS, data: result.data };
      },
      { params: schema.id_param },
    );
  }

  // GET /:id/property - Get specific properties
  if (meta.readable) {
    router.get(
      "/:id/property",
      async ({ user, params, query }: RouterContext) => {
        check_read_rights(user, meta);

        const attr_names = (query.fields as string) || "*";
        const result = await entity.read_property(params.id, attr_names, "*");
        if (!result.data) throw new NotFoundError();
        return { code: SUCCESS, data: result.data };
      },
      { params: schema.id_param, query: schema.property_query },
    );
  }

  // POST / - Create entity
  // Note: No Elysia schema validation here - Entity layer handles validation after before_hook
  // This allows hooks to set default values for required fields
  if (meta.creatable) {
    router.post("/", async ({ user, body }: RouterContext) => {
      check_create_rights(user, meta);

      const data = body as Record<string, unknown>;

      // Apply default values for create operation
      for (const field of meta.create_fields) {
        if (!has_value(data[field.name]) && field.default !== undefined) {
          data[field.name] = field.default;
        }
      }

      // Set user field if defined
      if (meta.user_field && user?.sub) {
        data[meta.user_field] = user.sub;
      }

      // Pass user context for hooks to access
      data._user = user;

      const result = await entity.create_entity(data as Record<string, FieldValue>, "*");
      return result;
    });
  }

  // PUT /:id - Update entity
  if (meta.updatable) {
    router.put(
      "/:id",
      async ({ user, params, body }: RouterContext) => {
        check_update_rights(user, meta);

        const data = body as Record<string, FieldValue>;
        const result = await entity.update_entity(params.id, data, "*");
        return result;
      },
      { params: schema.id_param, body: schema.update },
    );
  }

  // DELETE /:id - Delete entity
  if (meta.deleteable) {
    router.delete(
      "/:id",
      async ({ user, params }: RouterContext) => {
        check_delete_rights(user, meta);
        const result = await entity.delete_entity([params.id]);
        return result;
      },
      { params: schema.id_param },
    );
  }

  // POST /:id/clone - Clone entity
  // Note: No Elysia body schema validation here - Entity layer handles validation after before_hook
  if (meta.cloneable) {
    router.post(
      "/:id/clone",
      async ({ user, params, body }: RouterContext) => {
        check_clone_rights(user, meta);
        const data = body as Record<string, unknown>;

        // Set user field if defined (cloned entity belongs to the cloning user)
        if (meta.user_field && user?.sub) {
          data[meta.user_field] = user.sub;
        }

        // Pass user context for hooks to access
        data._user = user;

        const result = await entity.clone_entity(params.id, data as Record<string, FieldValue>, "*");
        return result;
      },
      { params: schema.id_param },
    );
  }

  // Custom route callback
  if (definition.route) {
    definition.route(router, meta);
  }

  return router as any;
};

/** Re-export validate_all_metas for convenience. */
export { validate_all_metas } from "../core/meta.js";
