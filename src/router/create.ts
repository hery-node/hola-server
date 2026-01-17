/**
 * Create router initialization for Elysia.
 * @module router/create
 */

import { Elysia } from 'elysia';
import { save_file_from_buffer } from '../db/gridfs.js';
import { SUCCESS, NO_RIGHTS } from '../http/code.js';
import { get_session_user_id } from '../http/session.js';
import { post_params } from '../http/params.js';
import { has_value } from '../core/validate.js';
import { check_user_role } from '../core/role.js';
import { Entity } from '../db/entity.js';
import { EntityMeta } from '../core/meta.js';

/** Initialize HTTP create router. */
export const init_create_router = (router: Elysia, meta: EntityMeta): void => {
    const entity = new Entity(meta);

    router.post('/create', async ({ body, cookie }) => {
        const ctx = { body: body as Record<string, unknown>, query: {} };
        const _view = (post_params(ctx, ["_view"])._view as string) || "*";

        if (!check_user_role(cookie as any, meta, "c", _view)) {
            return { code: NO_RIGHTS, err: "no rights" };
        }

        const param_obj = post_params(ctx, meta.field_names) as Record<string, unknown>;

        // Handle file uploads from FormData
        const file_map = await extract_files_from_formdata(meta, body);
        set_file_field_names(meta, file_map, param_obj);

        if (meta.user_field) {
            const user_id = get_session_user_id(cookie as any);
            if (user_id == null) throw new Error("no user found in session");
            param_obj[meta.user_field] = user_id;
        }

        const { code, err } = await entity.create_entity(param_obj, _view);
        if (!has_value(code)) throw new Error("create_entity must return code");

        if (code === SUCCESS) {
            await save_files_to_gridfs(meta.collection, file_map, param_obj);
        }

        return { code, err };
    });
};

interface FileData {
    name: string;
    buffer: ArrayBuffer;
}

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
