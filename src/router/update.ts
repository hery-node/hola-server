/**
 * Update router initialization for Elysia.
 * @module router/update
 */

import { Elysia } from 'elysia';
import { save_file_from_buffer } from '../db/gridfs.js';
import { required_post_params, post_update_params, post_params } from '../http/params.js';
import { SUCCESS, NO_PARAMS, NO_RIGHTS } from '../http/code.js';
import { has_value } from '../core/validate.js';
import { check_user_role, get_user_role_right } from '../core/role.js';
import { is_owner } from '../http/session.js';
import { oid_query } from '../db/db.js';
import { Entity } from '../db/entity.js';
import { EntityMeta } from '../core/meta.js';

interface FileData {
    name: string;
    buffer: ArrayBuffer;
}

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
        const file_map = await extract_files_from_formdata(meta, body);
        set_file_field_names(meta, file_map, param_obj);

        const query = params._id ? oid_query(params._id) : entity.primary_key_query(param_obj);
        if (!await is_owner(cookie as any, meta, entity, query!)) return { code: NO_RIGHTS, err: "no ownership rights" };

        const { code, err } = await entity.update_entity(params._id || null, param_obj, _view);
        if (!has_value(code)) throw new Error("update_entity must return code");

        if (code === SUCCESS) await save_files_to_gridfs(meta.collection, file_map, param_obj);
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
        const file_map = await extract_files_from_formdata(meta, body);
        set_file_field_names(meta, file_map, param_obj);

        for (const id of params._ids) {
            if (!await is_owner(cookie as any, meta, entity, oid_query(id)!)) return { code: NO_RIGHTS, err: "no ownership rights" };
        }

        const { code, err } = await entity.batch_update_entity(params._ids, param_obj, role_view);
        if (!has_value(code)) throw new Error("batch_update_entity must return code");

        if (code === SUCCESS) await save_files_to_gridfs(meta.collection, file_map, param_obj);
        return { code, err };
    });
};

/** Extract files from FormData body. */
const extract_files_from_formdata = async (meta: EntityMeta, body: unknown): Promise<Map<string, FileData>> => {
    const file_map = new Map<string, FileData>();
    if (!(body instanceof FormData)) return file_map;

    for (const field of meta.file_fields) {
        const file = body.get(field.name);
        if (file && file instanceof File) {
            file_map.set(field.name, {
                name: file.name,
                buffer: await file.arrayBuffer()
            });
        }
    }
    return file_map;
};

/** Set file field names in param_obj based on primary keys. */
const set_file_field_names = (meta: EntityMeta, file_map: Map<string, FileData>, param_obj: Record<string, unknown>): void => {
    if (file_map.size === 0) return;

    const primary_key = meta.primary_keys.map(key => param_obj[key]).join('_');

    for (const field of meta.file_fields) {
        if (file_map.has(field.name)) {
            param_obj[field.name] = meta.file_fields.length === 1 ? primary_key : `${primary_key}_${field.name}`;
        }
    }
};

/** Save files to GridFS. */
const save_files_to_gridfs = async (collection: string, file_map: Map<string, FileData>, param_obj: Record<string, unknown>): Promise<void> => {
    for (const [field_name, file_data] of file_map) {
        const filename = param_obj[field_name] as string;
        if (filename) {
            await save_file_from_buffer(collection, filename, file_data.buffer);
        }
    }
};
