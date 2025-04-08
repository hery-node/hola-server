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
 * init http update router
 * @param {express router} router 
 * @param {meta info} meta 
 */
const init_update_router = function (router, meta) {
    const entity = new Entity(meta);
    const cp_upload = meta.upload_fields.length > 0 ? upload_file.fields(meta.upload_fields) : upload_file.none();

    router.post('/update', cp_upload, wrap_http(async function (req, res) {
        //which view to update the entity
        let { _view } = post_params(req, ["_view"]);
        if (!_view) {
            _view = "*";
        }

        const has_right = check_user_role(req, meta, "u", _view);
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        let params = required_post_params(req, ["_id"]);
        if (params === null) {
            params = required_post_params(req, meta.primary_keys);
            if (params === null) {
                res.json({ code: NO_PARAMS, err: '[_id] checking params are failed!' });
                return;
            }
        }

        const param_obj = post_update_params(req, meta.field_names);
        set_file_fields(meta, req, param_obj);

        const query = params["_id"] ? oid_query(params["_id"]) : entity.primary_key_query(param_obj);
        const owner = await is_owner(req, meta, entity, query);
        if (!owner) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const { code, err } = await entity.update_entity(params["_id"], param_obj, _view);
        if (!has_value(code)) {
            throw new Error("the method should return code");
        }

        if (code == SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req, param_obj);
        }

        res.json({ code: code, err: err });
    }));

    router.post('/batch_update', cp_upload, wrap_http(async function (req, res) {
        const [role_mode, role_view] = get_user_role_right(req, meta);
        const has_right = role_mode.includes("u");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        let params = required_post_params(req, ["_ids"]);
        if (params === null) {
            res.json({ code: NO_PARAMS, err: '[_ids] checking params are failed!' });
            return;
        }

        const param_obj = post_update_params(req, meta.field_names);
        set_file_fields(meta, req, param_obj);

        const ids = params["_ids"];
        for (let i = 0; i < ids.length; i++) {
            const id_query = oid_query(ids[i]);
            const owner = await is_owner(req, meta, entity, id_query);
            if (!owner) {
                res.json({ code: NO_RIGHTS, err: "no rights error" });
                return;
            }
        }

        const { code, err } = await entity.batch_update_entity(ids, param_obj, role_view);
        if (!has_value(code)) {
            throw new Error("the batch_update_entity method should return code");
        }

        if (code == SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req, param_obj);
        }

        res.json({ code: code, err: err });
    }));
}

module.exports = { init_update_router }
