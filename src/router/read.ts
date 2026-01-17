/**
 * Read router initialization for Elysia.
 * @module router/read
 */

import { Elysia } from 'elysia';
import { required_post_params, get_params } from '../http/params.js';
import { has_value } from '../core/validate.js';
import { NO_PARAMS, SUCCESS, NO_RIGHTS } from '../http/code.js';
import { get_user_role_right } from '../core/role.js';
import { get_session_user_id, get_session_user_groups, is_owner } from '../http/session.js';
import { oid_query } from '../db/db.js';
import { Entity } from '../db/entity.js';
import { EntityMeta, FieldDefinition } from '../core/meta.js';

const contain_view = (array: string[], view: string): boolean => array.some(item => view.includes(item));

const check_read_rights = (cookie: any, meta: EntityMeta): [boolean, string | null, string | null, { code: number; err: string } | null] => {
    const [role_mode, role_view] = get_user_role_right(cookie, meta as any);
    if (!role_mode.includes("r")) {
        return [false, null, null, { code: NO_RIGHTS, err: "no rights" }];
    }
    return [true, role_mode, role_view, null];
};

const filter_fields_by_view = (meta: EntityMeta, role_view: string | null): FieldDefinition[] => {
    if (!role_view || role_view === "*") return meta.client_fields;
    return meta.client_fields.filter(field => {
        const view = field.view;
        if (Array.isArray(view)) return contain_view(view, role_view) || view.includes("*");
        return role_view.includes(view || "") || view === "*";
    });
};

const build_permissions = (role_mode: string) => ({
    creatable: role_mode.includes("c"),
    readable: role_mode.includes("r"),
    updatable: role_mode.includes("u"),
    deleteable: role_mode.includes("d"),
    cloneable: role_mode.includes("o"),
    importable: role_mode.includes("i"),
    exportable: role_mode.includes("e"),
    editable: role_mode.includes("c") || role_mode.includes("u")
});

const get_user_filter = (cookie: any, meta: EntityMeta): string | string[] => {
    const [user_field] = meta.fields.filter(f => f.name === meta.user_field);
    if (user_field?.group) {
        const user_ids = get_session_user_groups(cookie);
        if (!user_ids) throw new Error("no user group found in session");
        return user_ids;
    }
    const user_id = get_session_user_id(cookie);
    if (!user_id) throw new Error("no user id found in session");
    return user_id;
};

export const init_read_router = (router: Elysia, meta: EntityMeta): void => {
    const entity = new Entity(meta);

    router.get('/meta', async ({ cookie }) => {
        const [ok, role_mode, role_view, err_response] = check_read_rights(cookie, meta);
        if (!ok) return err_response;
        return { code: SUCCESS, data: { ...build_permissions(role_mode!), fields: filter_fields_by_view(meta, role_view) } };
    });

    router.get('/mode', async ({ cookie }) => {
        const [ok, role_mode, role_view, err_response] = check_read_rights(cookie, meta);
        if (!ok) return err_response;
        return { code: SUCCESS, mode: role_mode, view: role_view };
    });

    router.get('/ref', async ({ cookie, query }) => {
        const [ok, , , err_response] = check_read_rights(cookie, meta);
        if (!ok) return err_response;
        const ctx = { query: query as Record<string, unknown>, body: {} };
        const { ref_by_entity, query: ref_query } = get_params(ctx, ["ref_by_entity", "query"]) as { ref_by_entity?: string; query?: string };
        const list = await entity.get_filtered_ref_labels(ref_by_entity || '', ref_query);
        const items = list.map(obj => ({ title: obj[meta.ref_label!], value: String(obj._id) }));
        return { code: SUCCESS, data: items };
    });

    router.post('/list', async ({ cookie, body }) => {
        const [ok, , role_view, err_response] = check_read_rights(cookie, meta);
        if (!ok) return err_response;
        const ctx = { body: body as Record<string, unknown>, query: {} };
        const query_params = required_post_params(ctx, ["_query"]) as { _query: Record<string, unknown> } | null;
        if (!query_params) return { code: NO_PARAMS, err: ["_query"] };

        const param_obj = body as Record<string, unknown>;
        if (meta.user_field) param_obj[meta.user_field] = get_user_filter(cookie, meta);

        const query = (meta as any).list_query ? await (meta as any).list_query(entity, param_obj, { cookie, body }) : null;
        const { code, err, total, data } = await entity.list_entity(query_params._query, query || {}, param_obj, role_view || "*");
        if (!has_value(code)) throw new Error("list_entity must return code");
        return { code, err, total, data };
    });

    router.post('/read_entity', async ({ cookie, body }) => {
        const [ok, , role_view, err_response] = check_read_rights(cookie, meta);
        if (!ok) return err_response;
        const ctx = { body: body as Record<string, unknown>, query: {} };
        const params = required_post_params(ctx, ["_id", "attr_names"]) as { _id: string; attr_names: string } | null;
        if (!params) return { code: NO_PARAMS, err: "[_id, attr_names] required" };
        if (!await is_owner(cookie as any, meta, entity, oid_query(params._id)!)) return { code: NO_RIGHTS, err: "no ownership rights" };
        const { code, err, data } = await entity.read_entity(params._id, params.attr_names, role_view || "*");
        if (!has_value(code)) throw new Error("read_entity must return code");
        return { code, err, data };
    });

    router.post('/read_property', async ({ cookie, body }) => {
        const [ok, , role_view, err_response] = check_read_rights(cookie, meta);
        if (!ok) return err_response;
        const ctx = { body: body as Record<string, unknown>, query: {} };
        const params = required_post_params(ctx, ["_id", "attr_names"]) as { _id: string; attr_names: string } | null;
        if (!params) return { code: NO_PARAMS, err: "[_id, attr_names] required" };
        if (!await is_owner(cookie as any, meta, entity, oid_query(params._id)!)) return { code: NO_RIGHTS, err: "no ownership rights" };
        const { code, err, data } = await entity.read_property(params._id, params.attr_names, role_view || "*");
        if (!has_value(code)) throw new Error("read_property must return code");
        return { code, err, data };
    });
};
