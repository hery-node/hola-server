/**
 * @fileoverview Create router initialization.
 * @module router/create
 */

const { set_file_fields, save_file_fields_to_db } = require('../db/gridfs');
const { SUCCESS, NO_RIGHTS } = require('../http/code');
const { get_session_user_id } = require('../http/session');
const { wrap_http } = require('../http/error');
const { post_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { check_user_role } = require('../core/role');
const { Entity } = require('../db/entity');

const multer = require('multer');
const upload_file = multer({ dest: 'file_tmp/' });

/**
 * Initialize HTTP create router.
 * @param {Object} router - Express router
 * @param {Object} meta - Entity metadata
 */
const init_create_router = (router, meta) => {
    const entity = new Entity(meta);
    const cp_upload = meta.upload_fields.length > 0 ? upload_file.fields(meta.upload_fields) : upload_file.none();

    router.post('/create', cp_upload, wrap_http(async (req, res) => {
        const _view = post_params(req, ["_view"])._view || "*";

        if (!check_user_role(req, meta, "c", _view)) {
            return res.json({ code: NO_RIGHTS, err: "no rights" });
        }

        const param_obj = post_params(req, meta.field_names);
        set_file_fields(meta, req, param_obj);

        if (meta.user_field) {
            const user_id = get_session_user_id(req);
            if (user_id == null) throw new Error("no user found in session");
            param_obj[meta.user_field] = user_id;
        }

        const { code, err } = await entity.create_entity(param_obj, _view);
        if (!has_value(code)) throw new Error("create_entity must return code");

        if (code === SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req, param_obj);
        }

        res.json({ code, err });
    }));
};

module.exports = { init_create_router };
