/**
 * @fileoverview Entity clone router handlers.
 * @module router/clone
 */

const { set_file_fields, save_file_fields_to_db } = require('../db/gridfs');
const { SUCCESS, NO_PARAMS, NO_RIGHTS } = require('../http/code');
const { get_session_user_id, is_owner } = require('../http/session');
const { wrap_http } = require('../http/error');
const { post_params, required_post_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { check_user_role } = require('../core/role');
const { oid_query } = require('../db/db');
const { Entity } = require('../db/entity');

const multer = require('multer');
const upload_file = multer({ dest: 'file_tmp/' });

/**
 * Initialize clone router for entity.
 * @param {Object} router - Express router
 * @param {Object} meta - Entity metadata
 */
const init_clone_router = (router, meta) => {
    const entity = new Entity(meta);
    const cp_upload = meta.upload_fields.length > 0 ? upload_file.fields(meta.upload_fields) : upload_file.none();

    router.post('/clone', cp_upload, wrap_http(async (req, res) => {
        const _view = post_params(req, ["_view"])._view || "*";

        if (!check_user_role(req, meta, "o", _view)) {
            return res.json({ code: NO_RIGHTS, err: "no rights to clone" });
        }

        const params = required_post_params(req, ["_id"]);
        if (!params) {
            return res.json({ code: NO_PARAMS, err: "[_id] required for clone" });
        }

        const param_obj = post_params(req, meta.field_names);
        set_file_fields(meta, req, param_obj);

        const query = params._id ? oid_query(params._id) : entity.primary_key_query(param_obj);
        if (!await is_owner(req, meta, entity, query)) {
            return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
        }

        if (meta.user_field) {
            const user_id = get_session_user_id(req);
            if (user_id == null) throw new Error("no user found in session for clone");
            param_obj[meta.user_field] = user_id;
        }

        const { code, err } = await entity.clone_entity(params._id, param_obj, _view);
        if (!has_value(code)) throw new Error("clone_entity must return code");

        if (code === SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req, param_obj);
        }

        res.json({ code, err });
    }));
};

module.exports = { init_clone_router };
