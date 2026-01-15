/**
 * Update router initialization.
 * @module router/update
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { set_file_fields, save_file_fields_to_db } from '../db/gridfs.js';
import { required_post_params, post_update_params, post_params } from '../http/params.js';
import { SUCCESS, NO_PARAMS, NO_RIGHTS } from '../http/code.js';
import { has_value } from '../core/validate.js';
import { check_user_role, get_user_role_right } from '../core/role.js';
import { is_owner } from '../http/session.js';
import { oid_query } from '../db/db.js';
import { wrap_http } from '../http/error.js';
import { Entity } from '../db/entity.js';
import { EntityMeta } from '../core/meta.js';

const upload_file = multer({ dest: '/tmp/' });

export const init_update_router = (router: Router, meta: EntityMeta): void => {
    const entity = new Entity(meta);
    const cp_upload = meta.upload_fields.length > 0 ? upload_file.fields(meta.upload_fields) : upload_file.none();

    router.post('/update', cp_upload, wrap_http(async (req: Request, res: Response) => {
        const _view = (post_params(req, ["_view"])._view as string) || "*";
        if (!check_user_role(req as any, meta, "u", _view)) return res.json({ code: NO_RIGHTS, err: "no rights" });

        const params = (required_post_params(req, ["_id"]) || required_post_params(req, meta.primary_keys)) as { _id?: string } | null;
        if (!params) return res.json({ code: NO_PARAMS, err: "[_id] required" });

        const param_obj = post_update_params(req, meta.field_names) as Record<string, unknown>;
        set_file_fields(meta, req as any, param_obj);

        const query = params._id ? oid_query(params._id) : entity.primary_key_query(param_obj);
        if (!await is_owner(req as any, meta, entity, query!)) return res.json({ code: NO_RIGHTS, err: "no ownership rights" });

        const { code, err } = await entity.update_entity(params._id || null, param_obj, _view);
        if (!has_value(code)) throw new Error("update_entity must return code");

        if (code === SUCCESS) await save_file_fields_to_db(meta.collection, meta.file_fields, req as any, param_obj);
        res.json({ code, err });
    }) as any);

    router.post('/batch_update', cp_upload, wrap_http(async (req: Request, res: Response) => {
        const [role_mode, role_view] = get_user_role_right(req as any, meta as any);
        if (!role_mode.includes("u")) return res.json({ code: NO_RIGHTS, err: "no rights" });

        const params = required_post_params(req, ["_ids"]) as { _ids: string[] } | null;
        if (!params) return res.json({ code: NO_PARAMS, err: "[_ids] required" });

        const param_obj = post_update_params(req, meta.field_names) as Record<string, unknown>;
        set_file_fields(meta, req as any, param_obj);

        for (const id of params._ids) {
            if (!await is_owner(req as any, meta, entity, oid_query(id)!)) return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
        }

        const { code, err } = await entity.batch_update_entity(params._ids, param_obj, role_view);
        if (!has_value(code)) throw new Error("batch_update_entity must return code");

        if (code === SUCCESS) await save_file_fields_to_db(meta.collection, meta.file_fields, req as any, param_obj);
        res.json({ code, err });
    }) as any);
};
