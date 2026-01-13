/**
 * Create router initialization.
 * @module router/create
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { set_file_fields, save_file_fields_to_db } from '../db/gridfs.js';
import { SUCCESS, NO_RIGHTS } from '../http/code.js';
import { get_session_user_id } from '../http/session.js';
import { wrap_http } from '../http/error.js';
import { post_params } from '../http/params.js';
import { has_value } from '../core/validate.js';
import { check_user_role } from '../core/role.js';
import { Entity } from '../db/entity.js';
import { EntityMeta } from '../core/meta.js';

const upload_file = multer({ dest: 'file_tmp/' });

/** Initialize HTTP create router. */
export const init_create_router = (router: Router, meta: EntityMeta): void => {
    const entity = new Entity(meta);
    const cp_upload = meta.upload_fields.length > 0 ? upload_file.fields(meta.upload_fields) : upload_file.none();

    router.post('/create', cp_upload, wrap_http(async (req: Request, res: Response) => {
        const _view = (post_params(req, ["_view"])._view as string) || "*";

        if (!check_user_role(req as any, meta, "c", _view)) {
            return res.json({ code: NO_RIGHTS, err: "no rights" });
        }

        const param_obj = post_params(req, meta.field_names) as Record<string, unknown>;
        set_file_fields(meta, req as any, param_obj);

        if (meta.user_field) {
            const user_id = get_session_user_id(req as any);
            if (user_id == null) throw new Error("no user found in session");
            param_obj[meta.user_field] = user_id;
        }

        const { code, err } = await entity.create_entity(param_obj, _view);
        if (!has_value(code)) throw new Error("create_entity must return code");

        if (code === SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req as any, param_obj);
        }

        res.json({ code, err });
    }) as any);
};
