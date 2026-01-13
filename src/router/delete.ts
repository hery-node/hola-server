/**
 * Delete router initialization.
 * @module router/delete
 */

import { Router, Request, Response } from 'express';
import { required_post_params } from '../http/params.js';
import { has_value } from '../core/validate.js';
import { NO_PARAMS, NO_RIGHTS } from '../http/code.js';
import { get_user_role_right } from '../core/role.js';
import { is_owner } from '../http/session.js';
import { oid_query } from '../db/db.js';
import { wrap_http } from '../http/error.js';
import { Entity } from '../db/entity.js';
import { EntityMeta } from '../core/meta.js';

export const init_delete_router = (router: Router, meta: EntityMeta): void => {
    const entity = new Entity(meta);

    router.post('/delete', wrap_http(async (req: Request, res: Response) => {
        const [role_mode] = get_user_role_right(req as any, meta as any);
        if (!role_mode.includes("d")) return res.json({ code: NO_RIGHTS, err: "no rights" });

        const params = required_post_params(req, ["ids"]) as { ids: string } | null;
        if (!params) return res.json({ code: NO_PARAMS, err: ["ids"] });

        const ids = params.ids.split(",");

        for (const id of ids) {
            if (!await is_owner(req as any, meta, entity, oid_query(id)!)) {
                return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
            }
        }

        const { code, err } = await entity.delete_entity(ids);
        if (!has_value(code)) throw new Error("delete_entity must return code");

        res.json({ code, err });
    }) as any);
};
