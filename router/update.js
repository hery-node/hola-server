const { set_file_fields, save_file_fields_to_db } = require('../db/gridfs');
const { required_post_params, post_params } = require('../http/params');
const { SUCCESS, NO_PARAMS } = require('../http/code');
const { has_value } = require('../core/validate');
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
        let params = required_post_params(req, ["_id"]);
        if (params === null) {
            params = required_post_params(req, meta.primary_keys);
            if (params === null) {
                res.json({ code: NO_PARAMS, err: 'checking params are failed!' });
                return;
            }
        }

        const param_obj = post_params(req, meta.field_names);
        set_file_fields(meta, req, param_obj);

        const { code, err } = await entity.update_entity(params["_id"], param_obj);
        if (!has_value(code)) {
            throw new Error("the method should return code");
        }

        if (code == SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req, param_obj);
        }

        res.json({ code: code, err: err });
    }));
}

module.exports = { init_update_router }
