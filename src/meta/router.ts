/**
 * RESTful router initialization for EntityMeta.
 * @module meta/router
 */

import { Elysia } from 'elysia';
import { EntityMeta, MetaDefinition, FieldDefinition, validate_all_metas } from '../core/meta.js';
import { meta_to_schema } from './schema.js';
import { Entity } from '../db/entity.js';
import { NotFoundError, NoRightsError } from '../errors/index.js';
import { SUCCESS } from '../http/code.js';
import type { JwtPayload } from '../plugins/auth.js';
import { get_settings } from '../setting.js';

/** Router context extended with auth user from derive plugin. */
interface RouterContext {
    user?: JwtPayload | null;
    query: Record<string, unknown>;
    body: unknown;
    params: Record<string, string>;
}

/** Check if user has read rights for meta. */
const check_read_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
    const settings = get_settings();
    if (settings.server.check_user && !user) throw new NoRightsError('no read rights');
    // Additional role checking can be added here
};

/** Check if user has create rights for meta. */
const check_create_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
    const settings = get_settings();
    if (settings.server.check_user && !user) throw new NoRightsError('no create rights');
    if (!meta.creatable) throw new NoRightsError('entity not creatable');
};

/** Check if user has update rights for meta. */
const check_update_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
    const settings = get_settings();
    if (settings.server.check_user && !user) throw new NoRightsError('no update rights');
    if (!meta.updatable) throw new NoRightsError('entity not updatable');
};

/** Check if user has delete rights for meta. */
const check_delete_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
    const settings = get_settings();
    if (settings.server.check_user && !user) throw new NoRightsError('no delete rights');
    if (!meta.deleteable) throw new NoRightsError('entity not deleteable');
};

/** Check if user has clone rights for meta. */
const check_clone_rights = (user: JwtPayload | null | undefined, meta: EntityMeta): void => {
    const settings = get_settings();
    if (settings.server.check_user && !user) throw new NoRightsError('no clone rights');
    if (!meta.cloneable) throw new NoRightsError('entity not cloneable');
};

/** Build permissions object from role mode string. */
const build_permissions = (meta: EntityMeta) => ({
    creatable: meta.creatable,
    readable: meta.readable,
    updatable: meta.updatable,
    deleteable: meta.deleteable,
    cloneable: meta.cloneable,
    importable: meta.importable,
    exportable: meta.exportable,
    editable: meta.editable
});

/** Filter fields by view permission. */
const filter_fields_by_view = (meta: EntityMeta, view: string | null): FieldDefinition[] => {
    if (!view || view === '*') return meta.client_fields;
    return meta.client_fields.filter(field => {
        const field_view = field.view;
        if (Array.isArray(field_view)) {
            return field_view.includes(view) || field_view.includes('*');
        }
        return view.includes(field_view || '') || field_view === '*';
    });
};

/**
 * Create RESTful router for an entity.
 * 
 * Routes:
 * - POST /list      List entities
 * - GET /:id        Get single entity
 * - POST /          Create entity
 * - PUT /:id        Update entity
 * - DELETE /:id     Delete entity
 * - GET /meta       Get field metadata
 * - GET /mode       Get permission mode
 * - GET /ref        Get reference labels
 * - POST /:id/clone Clone entity
 * 
 * @param definition Meta definition for the entity
 */
export const init_router = (definition: MetaDefinition): Elysia<any> => {
    const meta = new EntityMeta(definition);
    const entity = new Entity(meta);
    const schema = meta_to_schema(meta);

    const router = new Elysia({ prefix: `/${meta.collection}` });

    // POST /list - List entities
    if (meta.readable) {
        router.post('/list', async ({ user, body }: RouterContext) => {
            check_read_rights(user, meta);

            const body_data = body as Record<string, unknown>;
            const filter: Record<string, unknown> = {};

            // Apply user field filter if defined
            if (meta.user_field && user?.sub) {
                filter[meta.user_field] = user.sub;
            }

            const result = await entity.list_entity(body_data, filter, body_data, '*');
            return { ...result };
        }, {
            body: schema.query
        });
    }

    // GET /meta - Get field metadata
    if (meta.readable) {
        router.get('/meta', async ({ user }: RouterContext) => {
            check_read_rights(user, meta);
            return {
                code: SUCCESS,
                data: {
                    ...build_permissions(meta),
                    fields: filter_fields_by_view(meta, '*')
                }
            };
        });
    }

    // GET /mode - Get permission mode
    if (meta.readable) {
        router.get('/mode', async ({ user }: RouterContext) => {
            check_read_rights(user, meta);
            return { code: SUCCESS, mode: meta.mode, view: '*' };
        });
    }

    // GET /ref - Get reference labels
    if (meta.readable && meta.ref_label) {
        router.get('/ref', async ({ user, query }: RouterContext) => {
            check_read_rights(user, meta);
            const list = await entity.get_filtered_ref_labels((query.ref_by_entity as string) || '', query.query as string, user?.sub);
            const items = list.map(obj => ({
                title: obj[meta.ref_label!],
                value: String(obj._id)
            }));
            return { code: SUCCESS, data: items };
        }, {
            query: schema.ref_query
        });
    }

    // GET /:id - Get single entity
    if (meta.readable) {
        router.get('/:id', async ({ user, params }: RouterContext) => {
            check_read_rights(user, meta);

            const result = await entity.read_entity(params.id, '*', '*');
            if (!result.data) throw new NotFoundError();
            return { code: SUCCESS, data: result.data };
        }, {
            params: schema.id_param
        });
    }

    // GET /:id/property - Get specific properties
    if (meta.readable) {
        router.get('/:id/property', async ({ user, params, query }: RouterContext) => {
            check_read_rights(user, meta);

            const attr_names = (query.fields as string) || '*';
            const result = await entity.read_property(params.id, attr_names, '*');
            if (!result.data) throw new NotFoundError();
            return { code: SUCCESS, data: result.data };
        }, {
            params: schema.id_param,
            query: schema.property_query
        });
    }

    // POST / - Create entity
    if (meta.creatable) {
        router.post('/', async ({ user, body }: RouterContext) => {
            check_create_rights(user, meta);

            const data = body as Record<string, unknown>;

            // Set user field if defined
            if (meta.user_field && user?.sub) {
                data[meta.user_field] = user.sub;
            }

            const result = await entity.create_entity(data, '*');
            return result;
        }, {
            body: schema.create
        });
    }

    // PUT /:id - Update entity
    if (meta.updatable) {
        router.put('/:id', async ({ user, params, body }: RouterContext) => {
            check_update_rights(user, meta);

            const data = body as Record<string, unknown>;
            const result = await entity.update_entity(params.id, data, '*');
            return result;
        }, {
            params: schema.id_param,
            body: schema.update
        });
    }

    // DELETE /:id - Delete entity
    if (meta.deleteable) {
        router.delete('/:id', async ({ user, params }: RouterContext) => {
            check_delete_rights(user, meta);
            const result = await entity.delete_entity([params.id]);
            return result;
        }, {
            params: schema.id_param
        });
    }

    // POST /:id/clone - Clone entity
    if (meta.cloneable) {
        router.post('/:id/clone', async ({ user, params, body }: RouterContext) => {
            check_clone_rights(user, meta);
            const data = body as Record<string, unknown>;
            const result = await entity.clone_entity(params.id, data, '*');
            return result;
        }, {
            params: schema.id_param,
            body: schema.create
        });
    }

    return router as any;
};

/** Re-export validate_all_metas for convenience. */
export { validate_all_metas } from '../core/meta.js';
