/**
 * Entity clone router handlers for Elysia.
 * @module router/clone
 */

import { Elysia } from 'elysia';
import { set_file_fields, save_file_fields_to_db } from '../db/gridfs.js';
import { SUCCESS, NO_PARAMS, NO_RIGHTS } from '../http/code.js';
import { get_session_user_id, is_owner } from '../http/session.js';
import { post_params, required_post_params } from '../http/params.js';
import { has_value } from '../core/validate.js';
import { check_user_role } from '../core/role.js';
import { oid_query } from '../db/db.js';
import { Entity } from '../db/entity.js';
import { EntityMeta } from '../core/meta.js';

export const init_clone_router = (router: Elysia, meta: EntityMeta): void => {
    const entity = new Entity(meta);

    router.post('/clone', async ({ body, cookie }) => {
        const ctx = { body: body as Record<string, unknown>, query: {} };
        const _view = (post_params(ctx, ["_view"])._view as string) || "*";

        if (!check_user_role(cookie as any, meta, "o", _view)) {
            return { code: NO_RIGHTS, err: "no rights to clone" };
        }

        const params = required_post_params(ctx, ["_id"]) as { _id: string } | null;
        if (!params) return { code: NO_PARAMS, err: "[_id] required for clone" };

        const param_obj = post_params(ctx, meta.field_names) as Record<string, unknown>;

        // Handle file uploads from FormData
        if (body instanceof FormData) {
            await set_file_fields_from_formdata(meta, body, param_obj);
        }

        const query = params._id ? oid_query(params._id) : entity.primary_key_query(param_obj);
        if (!await is_owner(cookie as any, meta, entity, query!)) {
            return { code: NO_RIGHTS, err: "no ownership rights" };
        }

        if (meta.user_field) {
            const user_id = get_session_user_id(cookie as any);
            if (user_id == null) throw new Error("no user found in session for clone");
            param_obj[meta.user_field] = user_id;
        }

        const { code, err } = await entity.clone_entity(params._id, param_obj, _view);
        if (!has_value(code)) throw new Error("clone_entity must return code");

        if (code === SUCCESS) {
            await save_file_fields_to_db_from_formdata(meta.collection, meta.file_fields, body, param_obj);
        }

        return { code, err };
    });
};

/** Extract file fields from FormData. */
const set_file_fields_from_formdata = async (meta: EntityMeta, formData: FormData, param_obj: Record<string, unknown>): Promise<void> => {
    for (const field of meta.file_fields) {
        const file = formData.get(field.name);
        if (file && file instanceof File) {
            param_obj[field.name] = {
                originalname: file.name,
                mimetype: file.type,
                size: file.size,
                buffer: await file.arrayBuffer()
            };
        }
    }
};

/** Save file fields from FormData to database. */
const save_file_fields_to_db_from_formdata = async (
    collection: string,
    file_fields: any[],
    formData: unknown,
    param_obj: Record<string, unknown>
): Promise<void> => {
    if (!(formData instanceof FormData)) return;

    for (const field of file_fields) {
        const file = formData.get(field.name);
        if (file && file instanceof File) {
            // TODO: Implement GridFS save for Bun/Elysia file handling
        }
    }
};
