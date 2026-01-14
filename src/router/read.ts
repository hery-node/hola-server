/**
 * Read router initialization.
 * @module router/read
 */

import { Router, Request, Response } from 'express';
import { required_post_params, get_params } from '../http/params.js';
import { has_value } from '../core/validate.js';
import { NO_PARAMS, SUCCESS, NO_RIGHTS } from '../http/code.js';
import { get_user_role_right } from '../core/role.js';
import { get_session_user_id, get_session_user_groups, is_owner } from '../http/session.js';
import { wrap_http } from '../http/error.js';
import { oid_query } from '../db/db.js';
import { Entity } from '../db/entity.js';
import { EntityMeta, FieldDefinition } from '../core/meta.js';

const contain_view = (array: string[], view: string): boolean => array.some(item => view.includes(item));

const check_read_rights = (req: Request, res: Response, meta: EntityMeta): [boolean, string | null, string | null] => {
    const [role_mode, role_view] = get_user_role_right(req as any, meta as any);
    if (!role_mode.includes("r")) {
        res.json({ code: NO_RIGHTS, err: "no rights" });
        return [false, null, null];
    }
    return [true, role_mode, role_view];
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

const get_user_filter = (req: Request, meta: EntityMeta): string | string[] => {
    const [user_field] = meta.fields.filter(f => f.name === meta.user_field);
    if (user_field?.group) {
        const user_ids = get_session_user_groups(req as any);
        if (!user_ids) throw new Error("no user group found in session");
        return user_ids;
    }
    const user_id = get_session_user_id(req as any);
    if (!user_id) throw new Error("no user id found in session");
    return user_id;
};

export const init_read_router = (router: Router, meta: EntityMeta): void => {
    const entity = new Entity(meta);

    router.get('/meta', wrap_http(async (req: Request, res: Response) => {
        const [ok, role_mode, role_view] = check_read_rights(req, res, meta);
        if (!ok) return;
        res.json({ code: SUCCESS, data: { ...build_permissions(role_mode!), fields: filter_fields_by_view(meta, role_view) } });
    }) as any);

    router.get('/mode', wrap_http(async (req: Request, res: Response) => {
        const [ok, role_mode, role_view] = check_read_rights(req, res, meta);
        if (!ok) return;
        res.json({ code: SUCCESS, mode: role_mode, view: role_view });
    }) as any);

    router.get('/ref', wrap_http(async (req: Request, res: Response) => {
        const [ok] = check_read_rights(req, res, meta);
        if (!ok) return;
        const { ref_by_entity, query } = get_params(req, ["ref_by_entity", "query"]) as { ref_by_entity?: string; query?: string };
        const list = await entity.get_filtered_ref_labels(ref_by_entity || '', query);
        const items = list.map(obj => ({ text: obj[meta.ref_label!], value: String(obj._id) }));
        res.json({ code: SUCCESS, data: items });
    }) as any);

    router.post('/list', wrap_http(async (req: Request, res: Response) => {
        const [ok, , role_view] = check_read_rights(req, res, meta);
        if (!ok) return;
        const query_params = required_post_params(req, ["_query"]) as { _query: Record<string, unknown> } | null;
        if (!query_params) return res.json({ code: NO_PARAMS, err: ["_query"] });

        const param_obj = req.body as Record<string, unknown>;
        if (meta.user_field) param_obj[meta.user_field] = get_user_filter(req, meta);

        const query = (meta as any).list_query ? await (meta as any).list_query(entity, param_obj, req) : null;
        const { code, err, total, data } = await entity.list_entity(query_params._query, query || {}, param_obj, role_view || "*");
        if (!has_value(code)) throw new Error("list_entity must return code");
        res.json({ code, err, total, data });
    }) as any);

    router.post('/read_entity', wrap_http(async (req: Request, res: Response) => {
        const [ok, , role_view] = check_read_rights(req, res, meta);
        if (!ok) return;
        const params = required_post_params(req, ["_id", "attr_names"]) as { _id: string; attr_names: string } | null;
        if (!params) return res.json({ code: NO_PARAMS, err: "[_id, attr_names] required" });
        if (!await is_owner(req as any, meta, entity, oid_query(params._id)!)) return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
        const { code, err, data } = await entity.read_entity(params._id, params.attr_names, role_view || "*");
        if (!has_value(code)) throw new Error("read_entity must return code");
        res.json({ code, err, data });
    }) as any);

    router.post('/read_property', wrap_http(async (req: Request, res: Response) => {
        const [ok, , role_view] = check_read_rights(req, res, meta);
        if (!ok) return;
        const params = required_post_params(req, ["_id", "attr_names"]) as { _id: string; attr_names: string } | null;
        if (!params) return res.json({ code: NO_PARAMS, err: "[_id, attr_names] required" });
        if (!await is_owner(req as any, meta, entity, oid_query(params._id)!)) return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
        const { code, err, data } = await entity.read_property(params._id, params.attr_names, role_view || "*");
        if (!has_value(code)) throw new Error("read_property must return code");
        res.json({ code, err, data });
    }) as any);
};
