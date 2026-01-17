/**
 * Update router initialization for Elysia.
 * @module router/update
 */

import { Elysia } from 'elysia';
import { set_file_fields, save_file_fields_to_db } from '../db/gridfs.js';
import { required_post_params, post_update_params, post_params } from '../http/params.js';
import { SUCCESS, NO_PARAMS, NO_RIGHTS } from '../http/code.js';
import { has_value } from '../core/validate.js';
import { check_user_role, get_user_role_right } from '../core/role.js';
import { is_owner } from '../http/session.js';
import { oid_query } from '../db/db.js';
import { Entity } from '../db/entity.js';
import { EntityMeta } from '../core/meta.js';

export const init_update_router = (router: Elysia, meta: EntityMeta): void => {
    const entity = new Entity(meta);

    router.post('/update', async ({ body, cookie }) => {
        const ctx = { body: body as Record<string, unknown>, query: {} };
        const _view = (post_params(ctx, ["_view"])._view as string) || "*";
        if (!check_user_role(cookie as any, meta, "u", _view)) return { code: NO_RIGHTS, err: "no rights" };

        const params = (required_post_params(ctx, ["_id"]) || required_post_params(ctx, meta.primary_keys)) as { _id?: string } | null;
        if (!params) return { code: NO_PARAMS, err: "[_id] required" };

        const param_obj = post_update_params(ctx, meta.field_names) as Record<string, unknown>;

        // Handle file uploads from FormData
        if (body instanceof FormData) {
            await set_file_fields_from_formdata(meta, body, param_obj);
        }

        const query = params._id ? oid_query(params._id) : entity.primary_key_query(param_obj);
        if (!await is_owner(cookie as any, meta, entity, query!)) return { code: NO_RIGHTS, err: "no ownership rights" };

        const { code, err } = await entity.update_entity(params._id || null, param_obj, _view);
        if (!has_value(code)) throw new Error("update_entity must return code");

        if (code === SUCCESS) await save_file_fields_to_db_from_formdata(meta.collection, meta.file_fields, body, param_obj);
        return { code, err };
    });

    router.post('/batch_update', async ({ body, cookie }) => {
        const [role_mode, role_view] = get_user_role_right(cookie as any, meta as any);
        if (!role_mode.includes("u")) return { code: NO_RIGHTS, err: "no rights" };

        const ctx = { body: body as Record<string, unknown>, query: {} };
        const params = required_post_params(ctx, ["_ids"]) as { _ids: string[] } | null;
        if (!params) return { code: NO_PARAMS, err: "[_ids] required" };

        const param_obj = post_update_params(ctx, meta.field_names) as Record<string, unknown>;

        // Handle file uploads from FormData
        if (body instanceof FormData) {
            await set_file_fields_from_formdata(meta, body, param_obj);
        }

        for (const id of params._ids) {
            if (!await is_owner(cookie as any, meta, entity, oid_query(id)!)) return { code: NO_RIGHTS, err: "no ownership rights" };
        }

        const { code, err } = await entity.batch_update_entity(params._ids, param_obj, role_view);
        if (!has_value(code)) throw new Error("batch_update_entity must return code");

        if (code === SUCCESS) await save_file_fields_to_db_from_formdata(meta.collection, meta.file_fields, body, param_obj);
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
