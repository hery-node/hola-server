const { set_file_fields, save_file_fields_to_db } = require('../db/gridfs');
const { SUCCESS } = require('../http/code');
const { wrap_http } = require('../http/error');
const { post_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { Entity } = require('../db/entity');

const multer = require('multer');
const upload_file = multer({ dest: 'file_tmp/' });

/**
 * init http create router
 * @param {express router} router 
 * @param {entity meta info} meta 
 */
const init_create_router = function (router, meta) {
    const entity = new Entity(meta);
    const cp_upload = meta.upload_fields.length > 0 ? upload_file.fields(meta.upload_fields) : upload_file.none();

    router.post('/create', cp_upload, wrap_http(async function (req, res) {
        const param_obj = post_params(req, meta.field_names);
        set_file_fields(meta, req, param_obj);

        const { code, err } = await entity.create_entity(param_obj);
        if (!has_value(code)) {
            throw new Error("the method should return code");
        }

        if (code == SUCCESS) {
            await save_file_fields_to_db(meta.collection, meta.file_fields, req, param_obj);
        }

        res.json({ code: code, err: err });
    }));
}

module.exports = { init_create_router }
