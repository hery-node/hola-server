/**
 * @fileoverview Update router initialization.
 * @module router/update
 */

const { set_file_fields, save_file_fields_to_db } = require('../db/gridfs');
const { required_post_params, post_update_params, post_params } = require('../http/params');
const { SUCCESS, NO_PARAMS, NO_RIGHTS } = require('../http/code');
const { has_value } = require('../core/validate');
const { check_user_role, get_user_role_right } = require('../core/role');
const { is_owner } = require('../http/session');
const { oid_query } = require('../db/db');
const { wrap_http } = require('../http/error');
const { Entity } = require('../db/entity');

const multer = require('multer');
const upload_file = multer({ dest: 'file_tmp/' });

/**
 * Initialize HTTP update router.
 * @param {Object} router - Express router
 * @param {Object} meta - Entity metadata
 */
const init_update_router = (router, meta) => {
    const entity = new Entity(meta);
    const cp_upload = meta.upload_fields.length > 0 ? upload_file.fields(meta.upload_fields) : upload_file.none();

    router.post('/update', cp_upload, wrap_http(async (req, res) => {
        const _view = post_params(req, ["_view"])._view || "*";

        if (!check_user_role(req, meta, "u", _view)) {
            return res.json({ code: NO_RIGHTS, err: "no rights" });
        }

        let params = required_post_params(req, ["_id"]) || required_post_params(req, meta.primary_keys);
        if (!params) {
            return res.json({ code: NO_PARAMS, err: "[_id] required" });
        }

        const param_obj = post_update_params(req, meta.field_names);
        set_file_fields(meta, req, param_obj);

        const query = params._id ? oid_query(params._id) : entity.primary_key_query(param_obj);
        if (!await is_owner(req, meta, entity, query)) {
            return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
        }

        const { code, err } = await entity.update_entity(params._id, param_obj, _view);
        if (!has_value(code)) throw new Error("update_entity must return code");

        if (code === SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req, param_obj);
        }

        res.json({ code, err });
    }));

    router.post('/batch_update', cp_upload, wrap_http(async (req, res) => {
        const [role_mode, role_view] = get_user_role_right(req, meta);
        if (!role_mode.includes("u")) {
            return res.json({ code: NO_RIGHTS, err: "no rights" });
        }

        const params = required_post_params(req, ["_ids"]);
        if (!params) {
            return res.json({ code: NO_PARAMS, err: "[_ids] required" });
        }

        const param_obj = post_update_params(req, meta.field_names);
        set_file_fields(meta, req, param_obj);

        for (const id of params._ids) {
            if (!await is_owner(req, meta, entity, oid_query(id))) {
                return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
            }
        }

        const { code, err } = await entity.batch_update_entity(params._ids, param_obj, role_view);
        if (!has_value(code)) throw new Error("batch_update_entity must return code");

        if (code === SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req, param_obj);
        }

        res.json({ code, err });
    }));
};

module.exports = { init_update_router };
